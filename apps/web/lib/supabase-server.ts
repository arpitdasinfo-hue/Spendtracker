import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServer() {
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
          // Next Server Components can't set cookies directly here.
          // We'll set cookies in middleware / route handlers as needed.
          const mutableCookieStore = cookieStore as unknown as {
            set?: (name: string, value: string, options: unknown) => void;
          };

          cookiesToSet.forEach(({ name, value, options }) => {
            mutableCookieStore.set?.(name, value, options);
          });
        },
      },
    }
  );
}
