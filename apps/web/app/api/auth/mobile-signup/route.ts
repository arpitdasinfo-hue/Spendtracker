import { NextResponse } from "next/server";
import { getMobileLoginEmail, normalizeMobileNumber } from "@/lib/auth-phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface SignupPayload {
  phone?: string;
  password?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SignupPayload | null;
  const normalizedPhone = normalizeMobileNumber(body?.phone ?? "");
  const password = typeof body?.password === "string" ? body.password : "";

  if (!normalizedPhone) {
    return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
  }

  if (password.trim().length < 8) {
    return NextResponse.json({ error: "Use at least 8 characters for the password." }, { status: 400 });
  }

  const loginEmail = getMobileLoginEmail(normalizedPhone);
  if (!loginEmail) {
    return NextResponse.json({ error: "Unable to normalize that mobile number." }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        code: "missing_service_role",
        error:
          "Server-side signup is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY to enable direct mobile number + password account creation without email or OTP verification.",
      },
      { status: 503 }
    );
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
    user_metadata: {
      login_phone: normalizedPhone,
      auth_design: "mobile-password-email-bridge",
    },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    const code = lower.includes("already") || lower.includes("registered") ? "already_exists" : "create_failed";
    const status = code === "already_exists" ? 409 : 400;

    return NextResponse.json({ code, error: error.message }, { status });
  }

  return NextResponse.json({
    code: "created",
    loginEmail,
    userId: data.user?.id ?? null,
  });
}
