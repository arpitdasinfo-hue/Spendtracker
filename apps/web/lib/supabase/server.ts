import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function createSupabaseServerClient() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            const mutableCookieStore = cookieStore as unknown as {
              set?: (name: string, value: string, options: unknown) => void;
            };

            cookiesToSet.forEach(({ name, value, options }) => {
              mutableCookieStore.set?.(name, value, options);
            });
          } catch {
            // In some server contexts Next blocks setting cookies; route handlers are okay.
          }
        },
      },
    }
  );
}

export async function supabaseServer() {
  return createSupabaseServerClient();
}
