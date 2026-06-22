// Frontend i18n. Mirrors the backend trans(): JSON key dictionaries per locale.
// Add locales under web/lang/<locale>.json and import them here.
import en from "@/lang/en.json";

const dictionaries: Record<string, Record<string, string>> = { en };

const locale = process.env.NEXT_PUBLIC_LOCALE ?? "en";

// trans looks up a key in the active locale, falling back to the key itself.
export function trans(key: string): string {
  return dictionaries[locale]?.[key] ?? dictionaries.en?.[key] ?? key;
}
