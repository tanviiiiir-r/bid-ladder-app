const KEY = "bidladder_visitor_key";

/** Stable per-browser key so views/shares can be counted once per visitor. */
export function getVisitorKey(): string {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem(KEY);
  if (!key) {
    key = crypto.randomUUID();
    window.localStorage.setItem(KEY, key);
  }
  return key;
}
