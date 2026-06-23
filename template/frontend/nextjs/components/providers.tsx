"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { BrandingProvider, LanguageProvider } from "@togo-framework/ui";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "togo";

// App-wide client providers:
//   ThemeProvider     — dark/light via the `.dark` class (design tokens follow)
//   BrandingProvider  — multi-theme brand color (writes CSS vars on :root)
//   LanguageProvider  — translations + RTL (en/ar); components also take a `language` prop
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <BrandingProvider primaryHex="#7c3aed" accentHex="#06b6d4" productName={APP}>
        <LanguageProvider initialLanguage="en">
          {children}
          <Toaster richColors position="top-right" />
        </LanguageProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
}
