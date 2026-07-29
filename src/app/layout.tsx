import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getSetting } from "@/lib/db";
import { DEFAULT_THEME, THEME_IDS, THEME_STORAGE_KEY } from "@/lib/themes";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Interview Console",
  description: "Internal tool for conducting and scoring technical interviews.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the theme server-side from a cookie (falls back to the org default),
  // so the correct theme is in the HTML on first paint — no flash, no inline script.
  const cookieTheme = (await cookies()).get(THEME_STORAGE_KEY)?.value;
  const orgDefault = getSetting("default_theme") || DEFAULT_THEME;
  const theme =
    cookieTheme && THEME_IDS.includes(cookieTheme) ? cookieTheme : orgDefault;

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
