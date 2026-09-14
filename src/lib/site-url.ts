export function publicSiteUrl(): string {
  const raw =
    (typeof import.meta !== "undefined" ? import.meta.env.VITE_PUBLIC_SITE_URL : undefined) ||
    (typeof process !== "undefined" ? process.env["VITE_PUBLIC_SITE_URL"] : undefined) ||
    "";
  const configured = raw.replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
