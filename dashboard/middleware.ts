import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";

const PUBLIC_PATHS = ["/login", "/docs", "/privacy", "/terms", "/about", "/pricing"];
const LANDING_PATH = "/";

export async function middleware(request: NextRequest) {
  // Public static assets (logo.png, fonts, etc.) must never require a
  // session — the matcher config's own regex isn't reliably parsed by
  // Next's path-to-regexp for this, so check it here in plain JS instead.
  if (/\.[\w]+$/.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isPublic =
    request.nextUrl.pathname === LANDING_PATH ||
    PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!session && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in: skip the form and go wherever `?next=` points (e.g.
  // a pricing page plan button's /settings?plan=...), or the dashboard.
  if (session && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
