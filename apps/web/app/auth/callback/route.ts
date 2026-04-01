import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!hasSupabaseEnv() || !code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
