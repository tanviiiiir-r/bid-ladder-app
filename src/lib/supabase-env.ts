function vitePublic(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"): string {
  return (typeof import.meta !== "undefined" ? import.meta.env[name] : undefined) ?? "";
}

export function publicSupabaseUrl(): string {
  return process.env["SUPABASE_URL"] || vitePublic("VITE_SUPABASE_URL");
}

export function publicSupabasePublishableKey(): string {
  return process.env["SUPABASE_PUBLISHABLE_KEY"] || vitePublic("VITE_SUPABASE_PUBLISHABLE_KEY");
}
