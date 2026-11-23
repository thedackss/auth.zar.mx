import { asLocale } from "./locale";

/**
 * Spanish translations for user-facing error messages, keyed by the exact
 * English text thrown in code. The AllExceptionsFilter translates responses
 * when the request carries `X-Lang: es` (consumer apps set it per page
 * language; the panel never sends it, so it always gets English).
 *
 * Internal/admin-only errors are deliberately absent — they stay English.
 */
const ES: Record<string, string> = {
    // auth
    "Invalid credentials": "Las credenciales no son válidas",
    "This account has been disabled": "Esta cuenta ha sido deshabilitada",
    "Not authenticated": "No has iniciado sesión",
    "Sign-up is currently restricted":
        "El registro está restringido por el momento",
    "Current password is incorrect": "La contraseña actual no es correcta",
    "A user with the same email already exists":
        "Ya existe una cuenta con ese correo electrónico",
    "Email is already verified": "El correo electrónico ya está verificado",

    // token links
    "The verification link is invalid or has expired":
        "El enlace de verificación no es válido o ha caducado",
    "The set-password link is invalid or has expired":
        "El enlace para establecer la contraseña no es válido o ha caducado",

    // app gateway
    "This app is private and that email has not been authorized to sign up":
        "Esta app es privada y ese correo no está autorizado para registrarse",
    "This account does not have access to this app":
        "Esta cuenta no tiene acceso a esta app",
    "Verify your email address before accessing this app":
        "Verifica tu correo electrónico antes de acceder a esta app",

    // validation (custom messages on DTOs)
    "Email address is not valid": "El correo electrónico no es válido",
    "Password must include upper and lower case letters, a number, and a symbol (8+ characters)":
        "La contraseña debe incluir mayúsculas, minúsculas, un número y un símbolo (mínimo 8 caracteres)",
};

/** Translate a user-facing message for the request language (default en). */
export function localizeMessage(message: string, lang: unknown): string {
    if (asLocale(typeof lang === "string" ? lang : undefined) !== "es")
        return message;
    return ES[message] ?? message;
}
