import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Rutas de autenticación públicas: con sesión activa, redirigen a "/".
// Excluidas a propósito: "/auth/callback" (OAuth/confirmación de correo),
// "/auth/nickname" (perfil aún no creado) y "/auth/nueva-contrasena"
// (sesión de recuperación activa) — redirigirlas rompería esos flujos.
const AUTH_ROUTES = ["/auth", "/auth/recuperar"];

// Rutas que exigen sesión activa; sin sesión, redirigen a "/auth".
// Nace vacío: elegir qué rutas protegen es decisión de otra spec.
const PROTECTED_ROUTES: string[] = [];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (user && AUTH_ROUTES.includes(path)) {
    const redirectResponse = NextResponse.redirect(
      new URL("/", request.nextUrl),
    );
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // Punto de extensión: cuando PROTECTED_ROUTES tenga rutas, este bloque
  // redirige a "/auth" a quien no tenga sesión activa.
  if (!user && PROTECTED_ROUTES.includes(path)) {
    const redirectResponse = NextResponse.redirect(
      new URL("/auth", request.nextUrl),
    );
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
