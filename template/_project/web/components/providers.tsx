"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

// App-wide client providers: theme (dark/light via .dark class) + toasts.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
