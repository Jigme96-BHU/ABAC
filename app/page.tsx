import Link from "next/link";
import Image from "next/image";
import logo from "@/public/img/logo/abac-logo.png";
import heroBg from "@/public/img/hero/community.jpg";
import { fromRow } from "@/content/events";
import { createClient } from "@/lib/supabase/server";
import { getAllStories } from "@/lib/get-stories";
import type { EventRow as DBEventRow } from "@/lib/supabase/types";
import StoryCard from "@/components/StoryCard";
import EventRow from "@/components/EventRow";
import RoyalPortrait from "@/components/RoyalPortrait";

export default async function HomePage() {
  const allStories = await getAllStories();
  const latest = allStories.slice(0, 4);

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: upcomingRows } = await supabase
    .from("events")
    .select("*")
    .eq("published", true)
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(4)
    .returns<DBEventRow[]>();
  const upcoming = (upcomingRows ?? []).map(fromRow);

  return (
    <main>
      <RoyalPortrait />

      <div className="hero">
        {/* Community backdrop — the ACT Bhutanese community at the National Day
            celebration, darkened behind a navy scrim so the text stays legible.
            Decorative, so alt="" and it's excluded from the accessibility tree. */}
        <Image src={heroBg} alt="" fill sizes="100vw" className="hero-bg" placeholder="blur" priority />
        <div className="hero-scrim" />
        <div className="wrap" style={{ position: "relative" }}>
          <div className="hero-inner">
            <span className="dz-eyebrow">༄༅། ཨུས་ཊེ་ལི་ཡ་དང་འབྲུག་མཐུན་འབྲེལ་ཚོགས་པ་ཀེན་བེ་ར།</span>
            <div className="royal-sub">AUSTRALIA–BHUTAN ASSOCIATION OF CANBERRA</div>
            <h1>One community, far from home, close together.</h1>
            <p>
              The Australia–Bhutan Association of Canberra connects Bhutanese families
              across the ACT — culture, language, support, and celebration, in English and
              Dzongkha.
            </p>
            <div className="orn">
              <span />
              <i>◆</i>
              <span />
            </div>
            <div className="hero-actions">
              <Link className="btn btn-gold" href="/events">
                Explore events
              </Link>
            </div>
          </div>
          <div className="hero-logo">
            <Image src={logo} alt="ABAC crest" width={200} height={200} priority />
          </div>
        </div>
      </div>

      <section className="block" id="about">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <span className="dz-eyebrow">ང་བཅས་ཀྱི་སྐོར།</span>
          <h2 style={{ fontSize: "clamp(24px,3.4vw,32px)", marginBottom: 16 }}>About us</h2>
          <p style={{ marginBottom: 14 }}>
            The Australia–Bhutan Association of Canberra is an incorporated community
            association serving Bhutanese families, students, and friends of Bhutan across
            the ACT. We are guided by the values of <em>lay-ju-dey</em> (gratitude) and{" "}
            <em>tha-dam-tse</em> (loyalty and integrity).
          </p>
          <p style={{ marginBottom: 20 }}>
            The association runs cultural celebrations, Dzongkha language programs for
            children, youth leadership initiatives, and a welfare support service for
            members facing hardship — alongside representing the community at Canberra&apos;s
            multicultural events.
          </p>
          <Link className="btn btn-ghost btn-sm" href="/team">
            Meet the team
          </Link>
        </div>
      </section>

      <section className="block alt">
        <div className="wrap">
          <div
            className="section-head"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "end",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <span className="dz-eyebrow">ལོ་རྒྱུས་དང་གནད་དོན་གཙོ་ཅན།</span>
              <h2>Stories and highlights</h2>
            </div>
            <Link className="btn btn-ghost btn-sm" href="/events">
              See all events
            </Link>
          </div>
          <div className="story-grid">
            {latest.map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <span className="dz-eyebrow">ཞབས་ཏོག</span>
            <h2>What membership gives you</h2>
          </div>
          <div className="grid3">
            <div className="card">
              <div className="ic">☸</div>
              <h3>Community support</h3>
              <p>
                Welfare assistance, embassy liaison help, and travel-document support when
                your family needs it.
              </p>
            </div>
            <div className="card">
              <div className="ic">༄</div>
              <h3>Culture and language</h3>
              <p>
                Dzongkha classes for children, Losar and Blessed Rainy Day celebrations, and
                traditional arts workshops.
              </p>
            </div>
            <div className="card">
              <div className="ic">འ</div>
              <h3>Member events</h3>
              <p>
                Member-only gatherings, picnics, and programs across Canberra — RSVP in one
                tap from the events calendar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="block alt">
        <div className="wrap">
          <div
            className="section-head"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "end",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <span className="dz-eyebrow">ལས་རིམ།</span>
              <h2>Upcoming events</h2>
            </div>
            <Link className="btn btn-ghost btn-sm" href="/events">
              Full calendar
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p style={{ color: "var(--ink-soft)" }}>
              No upcoming events posted yet — check back soon.
            </p>
          ) : (
            upcoming.map((e) => <EventRow key={e.id} event={e} />)
          )}
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="cta-band">
            <div>
              <span className="dz-eyebrow" style={{ color: "var(--gold-bright)" }}>
                འཐུས་མི་མཛད་གནང་།
              </span>
              <h2>Become a member</h2>
              <p>
                Join the ABAC family — registration takes two minutes and your membership is
                active instantly.
              </p>
            </div>
            <Link className="btn btn-gold" href="/join">
              Join ABAC
            </Link>
          </div>
        </div>
      </section>

      <section className="block alt">
        <div
          className="wrap"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 18,
          }}
        >
          <div className="card" style={{ background: "var(--gd-deep)", border: "none", color: "#fff" }}>
            <span className="dz-eyebrow" style={{ color: "var(--gold-bright)" }}>
              མི་སྡེ་ལུ་ཞལ་འདེབས།
            </span>
            <h3 style={{ color: "#fff", fontSize: 22 }}>Support the community</h3>
            <p style={{ color: "#E6DDC4", margin: "10px 0 18px" }}>
              Donations fund welfare support and cultural programs. Every gift stays in the
              Canberra Bhutanese community.
            </p>
            <Link className="btn btn-gold btn-sm" href="/donate">
              Donate
            </Link>
          </div>
          <div className="card">
            <span className="dz-eyebrow">དྲི་བ།</span>
            <h3 style={{ fontSize: 22 }}>Questions? Ask in Dzongkha or English</h3>
            <p style={{ margin: "10px 0 18px" }}>
              Our chatbot answers common questions about joining, fees, and events — tap the
              bubble in the corner anytime.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
