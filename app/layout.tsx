import type { Metadata } from "next";
import { Cinzel, Albert_Sans } from "next/font/google";
import localFont from "next/font/local";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChatWidget from "@/components/ChatWidget";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-cinzel",
  display: "swap",
});

const albert = Albert_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-albert",
  display: "swap",
});

// Self-hosted instead of next/font/google's Noto_Serif_Tibetan: Google's
// unicode-range split for this font still shipped a 730KB Tibetan-block
// file even with `subsets: ["tibetan"]` set — Next's `subsets` option
// doesn't actually gate what next/font/google fetches for this font (the
// unrequested latin/latin-ext files came along too). This file is
// pyftsubset'd down to just the ~54 Tibetan codepoints this site actually
// renders (every dz-eyebrow/dz-foot string, and the chatbot's Dzongkha
// answers), keeping OpenType shaping tables intact: 730KB -> 172KB, with
// the variable weight axis preserved so 400/500 both still work.
const tibetan = localFont({
  src: "./fonts/NotoSerifTibetan-subset.woff2",
  weight: "400 500",
  variable: "--font-tibetan",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bhutaneseincanberra.org.au"),
  title: {
    default: "ABAC — Australia–Bhutan Association of Canberra",
    template: "%s · ABAC",
  },
  description:
    "The Australia–Bhutan Association of Canberra connects Bhutanese families across the ACT — culture, language, support, and celebration, in English and Dzongkha.",
  openGraph: {
    siteName: "Australia–Bhutan Association of Canberra",
    locale: "en_AU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${albert.variable} ${tibetan.variable}`}
      // Some browser extensions inject attributes onto <html> before React
      // hydrates (e.g. password managers, ad blockers), which trips React's
      // hydration-mismatch check even though nothing is actually wrong.
      // This is the fix React's own docs recommend for exactly that case.
      suppressHydrationWarning
    >
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <ChatWidget />
      </body>
    </html>
  );
}
