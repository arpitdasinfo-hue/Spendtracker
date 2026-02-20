import "dotenv/config";
import { Telegraf } from "telegraf";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

const {
  TELEGRAM_BOT_TOKEN,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY,
  OPENAI_TXN_MODEL = "gpt-4o-mini",
  MAX_VOICE_SECONDS = "30",
  MAX_VOICE_PER_DAY = "20",
} = process.env;

if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  throw new Error("Missing env vars in apps/bot/.env");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

type Direction = "expense" | "income";
type PaymentMethod =
  | "upi"
  | "credit_card"
  | "debit_card"
  | "netbanking"
  | "bank_transfer"
  | "cash"
  | "other"
  | null;
type NeedsClarification = null | {
  field: "amount" | "direction" | "account";
  question: string;
};

type ExtractedTransaction = {
  direction: Direction;
  amount: number | null;
  note: string;
  category: string | null;
  payment_method: PaymentMethod;
  account_hint: string | null;
  merchant: string | null;
  occurred_at: string | null;
  needs_clarification: NeedsClarification;
};

const EXTRACTION_PROMPT_TEMPLATE = `SYSTEM:
You are a transaction extraction engine for a personal finance app in India.
Return ONLY valid JSON. No markdown. No extra keys.

Rules:
- Currency is INR.
- If direction is unclear, infer from verbs:
  - expense: paid, spent, bought, ordered, recharge, sent
  - income: received, got salary, refund received, credited
- If amount is ambiguous, set amount=null and ask for clarification in "needs_clarification".
- If account is unclear, set account_hint=null.
- occurred_at: if user mentions a date/time, convert to ISO-8601 in Asia/Kolkata; otherwise null.
- Keep note short (max 80 chars), category can be null for now.
- NEVER fabricate bank names or merchants.

USER:
Transcript:
"{TRANSCRIPT_TEXT}"

Known user accounts (user-configured labels):
{ACCOUNTS_JSON_ARRAY}

Return this JSON schema exactly:
{
  "direction": "expense|income",
  "amount": number|null,
  "note": string,
  "category": string|null,
  "payment_method": "upi|credit_card|debit_card|netbanking|bank_transfer|cash|other|null",
  "account_hint": string|null,
  "merchant": string|null,
  "occurred_at": string|null,
  "needs_clarification": null|{ "field": "amount|direction|account", "question": string }
}`;

const PAYMENT_METHODS = new Set<Exclude<PaymentMethod, null>>([
  "upi",
  "credit_card",
  "debit_card",
  "netbanking",
  "bank_transfer",
  "cash",
  "other",
]);

let accountsTableAvailable = true;

bot.start(async (ctx) => {
  await ctx.reply(
    "Hi! First, login on the web dashboard and generate a link code.\nThen send: /link 123456\n\nAfter linking, send voice like:\n“paid 450 groceries via UPI HDFC”."
  );
});

bot.command("link", async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const code = parts[1];
  if (!code) return ctx.reply("Usage: /link <6-digit-code>");

  const telegramId = ctx.from.id;

  const { data: linkRow, error } = await supabaseAdmin
    .from("telegram_link_codes")
    .select("user_id, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

  if (error || !linkRow) return ctx.reply("Invalid code.");
  if (linkRow.used_at) return ctx.reply("That code is already used.");
  if (new Date(linkRow.expires_at).getTime() < Date.now()) {
    return ctx.reply("Code expired. Generate a new one on the web.");
  }

  const { error: upErr } = await supabaseAdmin
    .from("profiles")
    .update({ telegram_id: telegramId })
    .eq("id", linkRow.user_id);

  if (upErr) return ctx.reply("Could not link. Try again.");

  await supabaseAdmin
    .from("telegram_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", code);

  return ctx.reply("Linked ✅ Now send a voice note or text transaction.");
});

bot.on("text", async (ctx) => {
  const telegramId = ctx.from.id;
  const user = await findUserByTelegramId(telegramId);
  if (!user) {
    return ctx.reply("Please link first: go to web → Link Telegram → /link <code>.");
  }

  const result = await saveTransactionFromTranscript(user.id, ctx.message.text);
  return ctx.reply(result.reply);
});

bot.on("voice", async (ctx) => {
  const telegramId = ctx.from.id;
  const user = await findUserByTelegramId(telegramId);
  if (!user) {
    return ctx.reply("Please link first: web → Link Telegram → /link <code>.");
  }

  const voice = ctx.message.voice;
  const maxSeconds = Number(MAX_VOICE_SECONDS);
  if (voice.duration > maxSeconds) {
    return ctx.reply(
      `Voice too long (${voice.duration}s). Max is ${maxSeconds}s. Please resend shorter or use text.`
    );
  }

  const allowed = await checkAndIncrementVoiceUsage(user.id);
  if (!allowed) {
    return ctx.reply("Daily voice limit reached. Send as text today or try tomorrow.");
  }

  let tmpFile: string | null = null;

  try {
    const fileLink = await ctx.telegram.getFileLink(voice.file_id);
    const res = await fetch(fileLink.href);
    if (!res.ok) {
      return ctx.reply("Could not download your voice note. Please try again.");
    }

    const arrayBuffer = await res.arrayBuffer();
    const tmpDir = path.join(process.cwd(), "tmp");
    fs.mkdirSync(tmpDir, { recursive: true });

    tmpFile = path.join(tmpDir, `${voice.file_id}.ogg`);
    fs.writeFileSync(tmpFile, Buffer.from(arrayBuffer));

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpFile),
      model: "whisper-1",
    });

    const transcriptText = transcription.text?.trim() || "";
    if (!transcriptText) {
      return ctx.reply("Could not transcribe. Try again with clearer audio.");
    }

    const result = await saveTransactionFromTranscript(user.id, transcriptText);
    return ctx.reply(`Heard: "${transcriptText}"\n${result.reply}`);
  } finally {
    if (tmpFile && fs.existsSync(tmpFile)) {
      fs.rmSync(tmpFile, { force: true });
    }
  }
});

async function saveTransactionFromTranscript(userId: string, transcript: string) {
  const extraction = await extractTransaction(transcript, userId);

  if (!extraction) {
    const fallbackDirection = inferDirection(transcript);
    await supabaseAdmin.from("transactions").insert({
      user_id: userId,
      direction: fallbackDirection,
      amount: null,
      note: transcript.slice(0, 80),
      occurred_at: new Date().toISOString(),
    });

    return {
      reply:
        "Saved ✅ (fallback). I couldn't extract all fields yet. Send amount/account if needed.",
    };
  }

  if (extraction.needs_clarification) {
    return { reply: extraction.needs_clarification.question };
  }

  const occurredAt = extraction.occurred_at ?? new Date().toISOString();
  const { error } = await supabaseAdmin.from("transactions").insert({
    user_id: userId,
    direction: extraction.direction,
    amount: extraction.amount,
    note: extraction.note.slice(0, 80),
    occurred_at: occurredAt,
  });

  if (error) {
    console.error("Could not save extracted transaction", error);
    return { reply: "Could not save right now. Please retry." };
  }

  const amountText = extraction.amount === null ? "amount pending" : `₹${extraction.amount}`;
  return { reply: `Saved ✅ ${extraction.direction} ${amountText}.` };
}

async function extractTransaction(
  transcriptText: string,
  userId: string
): Promise<ExtractedTransaction | null> {
  try {
    const accounts = await getKnownAccountLabels(userId);
    const prompt = buildExtractionPrompt(transcriptText, accounts);

    const completion = await openai.chat.completions.create({
      model: OPENAI_TXN_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    return normalizeExtraction(parsed, transcriptText);
  } catch (error) {
    console.error("Transaction extraction failed", error);
    return null;
  }
}

function buildExtractionPrompt(transcriptText: string, accountLabels: string[]) {
  return EXTRACTION_PROMPT_TEMPLATE.replace(
    '"{TRANSCRIPT_TEXT}"',
    JSON.stringify(transcriptText)
  ).replace("{ACCOUNTS_JSON_ARRAY}", JSON.stringify(accountLabels));
}

async function getKnownAccountLabels(userId: string): Promise<string[]> {
  if (!accountsTableAvailable) return [];

  const { data, error } = await supabaseAdmin
    .from("accounts")
    .select("label, name")
    .eq("user_id", userId)
    .limit(20);

  if (error) {
    if (error.code === "42P01") {
      accountsTableAvailable = false;
    }
    return [];
  }

  const labels = new Set<string>();
  for (const row of data ?? []) {
    const label = (row as Record<string, unknown>).label;
    const name = (row as Record<string, unknown>).name;
    if (typeof label === "string" && label.trim()) labels.add(label.trim());
    if (typeof name === "string" && name.trim()) labels.add(name.trim());
  }

  return [...labels];
}

function normalizeExtraction(raw: unknown, transcript: string): ExtractedTransaction | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const directionRaw = obj.direction;
  const direction: Direction =
    directionRaw === "expense" || directionRaw === "income"
      ? directionRaw
      : inferDirection(transcript);

  const amount = coerceAmount(obj.amount);

  const noteRaw = typeof obj.note === "string" ? obj.note.trim() : "";
  const note = (noteRaw || transcript.trim() || "transaction").slice(0, 80);

  const category = typeof obj.category === "string" && obj.category.trim() ? obj.category.trim() : null;

  let paymentMethod: PaymentMethod = null;
  if (obj.payment_method === null) {
    paymentMethod = null;
  } else if (
    typeof obj.payment_method === "string" &&
    PAYMENT_METHODS.has(obj.payment_method as Exclude<PaymentMethod, null>)
  ) {
    paymentMethod = obj.payment_method as Exclude<PaymentMethod, null>;
  }

  const accountHint =
    typeof obj.account_hint === "string" && obj.account_hint.trim()
      ? obj.account_hint.trim()
      : null;

  const merchant = typeof obj.merchant === "string" && obj.merchant.trim() ? obj.merchant.trim() : null;

  const occurredAt =
    typeof obj.occurred_at === "string" && obj.occurred_at.trim() ? obj.occurred_at.trim() : null;

  const needsClarification = normalizeClarification(obj.needs_clarification);

  return {
    direction,
    amount,
    note,
    category,
    payment_method: paymentMethod,
    account_hint: accountHint,
    merchant,
    occurred_at: occurredAt,
    needs_clarification: needsClarification,
  };
}

function normalizeClarification(value: unknown): NeedsClarification {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const field = obj.field;
  const question = obj.question;

  if (
    (field === "amount" || field === "direction" || field === "account") &&
    typeof question === "string" &&
    question.trim()
  ) {
    return { field, question: question.trim() };
  }

  return null;
}

function coerceAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replaceAll(",", "").trim());
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

function inferDirection(text: string): Direction {
  const lower = text.toLowerCase();

  const incomeHints = ["received", "got salary", "refund received", "credited"];
  if (incomeHints.some((hint) => lower.includes(hint))) {
    return "income";
  }

  return "expense";
}

async function findUserByTelegramId(telegramId: number) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return data ?? null;
}

async function checkAndIncrementVoiceUsage(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: row } = await supabaseAdmin
    .from("usage_daily")
    .select("voice_count")
    .eq("user_id", userId)
    .eq("day", today)
    .maybeSingle();

  const current = row?.voice_count ?? 0;
  const max = Number(MAX_VOICE_PER_DAY);
  if (current >= max) return false;

  await supabaseAdmin.from("usage_daily").upsert({
    user_id: userId,
    day: today,
    voice_count: current + 1,
  });

  return true;
}

bot.launch().then(() => console.log("Bot started (polling)."));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
