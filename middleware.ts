import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get("session_token")?.value;

  // Only check if session cookie exists
  // Full validation happens in the server layout
  if (!sessionToken) {
    const loginUrl = new URL("/sign-in", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth routes (sign-in, sign-up, forgot-password, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public|sign-in|sign-up|forgot-password|create-password|reset-password).*)",
  ],
};
