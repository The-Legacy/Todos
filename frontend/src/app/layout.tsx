import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/lib/query-provider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme-context";
import { SettingsProvider } from "@/lib/settings-context";
import { ToastProvider } from "@/lib/toast-context";
import { Nav } from "@/components/nav";
import { BottomNav } from "@/components/bottom-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Todos",
  description: "Personal weekly task planner",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <ToastProvider>
          <QueryProvider>
            <AuthProvider>
              <ThemeProvider>
                <SettingsProvider>
                  <Nav />
                  <div className="flex flex-1 flex-col pb-16 md:pb-0">{children}</div>
                  <BottomNav />
                </SettingsProvider>
              </ThemeProvider>
            </AuthProvider>
          </QueryProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
