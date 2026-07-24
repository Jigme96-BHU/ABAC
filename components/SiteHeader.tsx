"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HEADER_NAV, NAV } from "@/lib/nav";
import logo from "@/public/img/logo/abac-logo.png";

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "dz">("en");

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header>
      <div className="wrap nav">
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <Image src={logo} alt="ABAC crest" width={46} height={46} priority />
          <div>
            <div className="brand-name">ABAC</div>
            <div className="brand-sub">AUSTRALIA–BHUTAN ASSOCIATION OF CANBERRA</div>
          </div>
        </Link>

        <nav className="navlinks">
          {HEADER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "active" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="lang-toggle"
            onClick={() => setLang(lang === "en" ? "dz" : "en")}
            aria-label="Switch language"
          >
            {lang === "en" ? (
              <>
                <b>EN</b> | རྫོང་ཁ
              </>
            ) : (
              <>
                EN | <b>རྫོང་ཁ</b>
              </>
            )}
          </button>
          <button
            className="hamburger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
        </div>
      </div>

      <div className={menuOpen ? "mobile-menu open" : "mobile-menu"} id="mmenu">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
