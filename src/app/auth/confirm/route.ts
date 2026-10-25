import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino de los correos de invitación / recuperación de Supabase.
// En Supabase → Auth → Email Templates, el link debe apuntar a:
//   Confirm signup: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
//   Reset password: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
//   Change email:   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Recuperación/invitación → que ponga contraseña; cambio de correo → a su cuenta; registro → al inicio
      const destino =
        type === "recovery" || type === "invite" ? "/cuenta?tab=contrasena"
        : type === "email_change" ? "/cuenta?correo=ok"
        : "/";
      return NextResponse.redirect(new URL(destino, origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}
