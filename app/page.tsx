import Link from "next/link";
import Image from "next/image";
import logo from "@/public/img/logo/abac-logo.png";
import HeroSlideshow from "@/components/HeroSlideshow";
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
        {/* Community backdrop — ACT Bhutanese community photos, cross-faded and
            darkened behind a navy scrim so the text stays legible. Decorative,
            so it's excluded from the accessibility tree. Edit the list in
            content/hero-slides.ts to change which photos appear. */}
        <HeroSlideshow />
        <div className="hero-scrim" />
        <div className="wrap" style={{ position: "relative" }}>
          <div className="hero-inner">
            <span className="dz-eyebrow">༄༅། ཨུས་ཊེ་ལི་ཡ་དང་འབྲུག་མཐུན་འབྲེལ་ཚོགས་པ་ཀེན་བེ་ར།</span>
            <div className="royal-sub">AUSTRALIA–BHUTAN ASSOCIATION OF CANBERRA</div>
            <h1>For a Stronger Community</h1>
            <p>
              The Australia–Bhutan Association of Canberra connects Bhutanese families and
              multicultural communities across the ACT through cultural heritage, language,
              support, and celebration.
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
            The Australia–Bhutan Association of Canberra Inc. (ABAC) is a community
            organisation dedicated to supporting Bhutanese individuals and families,
            students, and friends of Bhutan across the Australian Capital Territory (ACT).
            ABAC is guided by the foundational Bhutanese principles of <em>lay-ju-drey</em>{" "}
            (the law of karmic cause and effect) and <em>tha-dam-tse</em> (unwavering
            loyalty, trust, and moral integrity).
          </p>
          <p style={{ marginBottom: 20 }}>
            To promote Bhutanese cultural heritage and strengthen social cohesion, ABAC
            organises national and cultural celebrations, youth leadership initiatives, and
            educational programs for children. It also provides welfare assistance to
            community members experiencing hardship and actively represents Bhutanese
            culture and heritage at Canberra’s major multicultural events and across
            relevant civic and community forums.
          </p>
          <div className="pay-box objects-box" style={{ marginTop: 24, marginBottom: 22 }}>
            <div className="pay-head">
              <strong>Our Constitutional Objects</strong>
            </div>
            <p style={{ margin: "6px 0 12px", color: "var(--ink-soft)" }}>
              ABAC is governed by its approved constitution and exists to advance five
              public community purposes:
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))",
                gap: 8,
              }}
            >
              {[
                "Unity and mutual understanding",
                "Multicultural participation",
                "Community welfare",
                "Cultural heritage",
                "Interstate collaboration",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 7,
                    padding: "8px 11px",
                    background: "#FFFEF9",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "var(--gd-ink)",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
            <p style={{ margin: "12px 0 0", color: "var(--ink-soft)", fontSize: 13 }}>
              This means building a respectful community, supporting members in times of
              need, preserving Bhutanese spiritual and cultural heritage, and strengthening
              ABAC&apos;s relationship with the Royal Bhutanese Embassy, Bhutanese
              organisations, and the wider ACT community.
            </p>
          </div>
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
              <h3>Community &amp; welfare support</h3>
              <p>
                Mutual support during settlement, illness, bereavement, and emergencies,
                including embassy liaison and help for newly arrived families connecting with
                local services.
              </p>
            </div>
            <div className="card">
              <div className="ic">༄</div>
              <h3>Culture, language &amp; heritage</h3>
              <p>
                Promotes Dzongkha language learning, Losar and Blessed Rainy Day
                celebrations, traditional arts, and support for the Bhutanese Buddhist &amp;
                Cultural Centre.
              </p>
            </div>
            <div className="card">
              <div className="ic">འ</div>
              <h3>Events &amp; member activities</h3>
              <p>
                Cultural, social, sporting, and educational events, plus member-only programs
                and gatherings across Canberra — RSVP straight from the events calendar.
              </p>
            </div>
            <div className="card">
              <div className="ic">⚖</div>
              <h3>A voice in the association</h3>
              <p>
                Attend and vote at Annual General Meetings, stand for elected office where
                eligible, and receive notices and reports on ABAC&apos;s governance and
                activities.
              </p>
            </div>
            <div className="card">
              <div className="ic">✦</div>
              <h3>Leadership &amp; volunteering</h3>
              <p>
                Leadership and professional-development initiatives, hands-on volunteering
                with committees and working groups, and recognition for outstanding service to
                the community.
              </p>
            </div>
            <div className="card">
              <div className="ic">⚭</div>
              <h3>A fair, connected community</h3>
              <p>
                Networking with fellow members, and a guarantee of fair, respectful treatment
                and procedural fairness in every matter affecting your membership.
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
