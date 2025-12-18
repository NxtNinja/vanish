import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const jetBrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://justvanish.in"),
  title: "Vanish | Secure Ephemeral Chat",
  description:
    "Create private, self-destructing chat rooms instantly. No logs, no history, just vanish.",
  openGraph: {
    title: "Vanish | Secure Ephemeral Chat",
    description:
      "Create private, self-destructing chat rooms instantly. No logs, no history, just vanish.",
    url: "https://justvanish.in",
    siteName: "Vanish",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vanish | Secure Ephemeral Chat",
    description:
      "Create private, self-destructing chat rooms instantly. No logs, no history, just vanish.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetBrains.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
