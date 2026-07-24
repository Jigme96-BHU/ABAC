import Link from "next/link";
import Image from "next/image";
import logo from "@/public/img/logo/abac-logo.png";

const SOCIAL = {
  facebook: "https://www.facebook.com/bhutaneseincanberra/",
  tiktok: "https://www.tiktok.com/@abac.btn",
  email: "mailto:bhutancanberra@gmail.com",
};

export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="foot-brand">
              <Image src={logo} alt="ABAC crest" width={52} height={52} />
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7 }}>
              Australia–Bhutan Association of Canberra Inc.
            </p>
            <p className="dz-foot" style={{ marginTop: 10 }}>
              བཀྲ་ཤིས་བདེ་ལེགས།
            </p>
          </div>

          <div>
            <h4>Membership</h4>
            <Link href="/join">Join ABAC</Link>
            <Link href="/join#status">Check my status</Link>
            <Link href="/services">Request a service</Link>
          </div>

          <div>
            <h4>Community</h4>
            <Link href="/events">Events calendar</Link>
            <Link href="/stories">Stories</Link>
            <Link href="/donate">Donate</Link>
            <Link href="/contact">Contact us</Link>
          </div>

          <div>
            <h4>Association</h4>
            <Link href="/#about">About us</Link>
            <Link href="/team">Our team</Link>
            <Link href="/privacy">Privacy statement</Link>
            <Link href="/admin">Committee sign-in</Link>
          </div>

          <div>
            <h4>Connect</h4>
            <div className="social-row">
              <a
                className="social-ic"
                href={SOCIAL.facebook}
                target="_blank"
                rel="noopener"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 8.5h2.5V5.5H14c-2.5 0-4 1.9-4 4.2v1.8H7.5v3H10v7h3v-7h2.3l.5-3H13v-1.5c0-.9.4-1.5 1-1.5z" />
                </svg>
              </a>
              <a
                className="social-ic"
                href={SOCIAL.tiktok}
                target="_blank"
                rel="noopener"
                aria-label="TikTok"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.6 3c.3 2 1.6 3.5 3.4 3.9v3c-1.3 0-2.6-.4-3.8-1.1v5.6c0 3.3-2.5 5.8-5.7 5.8-3.1 0-5.6-2.5-5.6-5.7 0-3.2 2.4-5.6 5.5-5.7v3.1c-1.3 0-2.4 1.1-2.4 2.6 0 1.5 1.1 2.7 2.6 2.7 1.4 0 2.6-1.2 2.6-2.7V3h3.4z" />
                </svg>
              </a>
              <a className="social-ic" href={SOCIAL.email} aria-label="Email">
                <svg viewBox="0 0 24 24">
                  <rect
                    x="3.5"
                    y="5.5"
                    width="17"
                    height="13"
                    rx="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M4.5 7.5l7.5 5.8 7.5-5.8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="fine">
          <span>
            © {new Date().getFullYear()} Australia–Bhutan Association of Canberra Inc.
          </span>
          <span>Payments secured by Stripe</span>
        </div>
      </div>
    </footer>
  );
}
