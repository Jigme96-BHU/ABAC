import type { Metadata } from "next";
import { Cinzel, Albert_Sans, Noto_Serif_Tibetan } from "next/font/google";
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

const tibetan = Noto_Serif_Tibetan({
  weight: ["400", "500"],
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
