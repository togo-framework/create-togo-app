import { ReactNode } from "react";
import { ThemeProvider, LanguageProvider } from "@togo-framework/ui";

// ThemeProvider applies the ToGO brand tokens + dark/light switching (data-theme on
// <html>, persisted to localStorage). No hardcoded brand colors — the kit's ToGO
// palette drives everything. LanguageProvider supplies EN/AR i18n + RTL.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme="dark">
      <LanguageProvider initialLanguage="en">{children}</LanguageProvider>
    </ThemeProvider>
  );
}
