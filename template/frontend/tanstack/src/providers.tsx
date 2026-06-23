import { ReactNode } from "react";
import { BrandingProvider, LanguageProvider } from "@togo-framework/ui";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BrandingProvider primaryHex="#7c3aed" accentHex="#06b6d4" productName="togo">
      <LanguageProvider initialLanguage="en">{children}</LanguageProvider>
    </BrandingProvider>
  );
}
