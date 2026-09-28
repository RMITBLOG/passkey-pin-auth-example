export function getAuthConfig(env: Record<string, string | undefined> = process.env) {
  const url = new URL(env.BETTER_AUTH_URL ?? "http://localhost:3000");
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("BETTER_AUTH_URL must be an origin without a path or credentials.");
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new Error("Passkeys require HTTPS outside localhost.");
  }
  return { baseURL: url.origin, rpID: url.hostname };
}
