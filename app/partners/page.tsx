import type { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { CORPORATE_TIERS } from "@/lib/corporate-tiers";

export const metadata: Metadata = {
  title: "Our Partners",
  description: "Businesses and organisations partnering with ABAC through Corporate Membership.",
};

type PartnerRow = {
  business_name: string;
  tier: string;
  logo_path: string | null;
  website: string | null;
};

export default async function PartnersPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_active_corporate_partners").returns<PartnerRow[]>();

  const partners = Array.isArray(data) ? data : [];
  const groups = CORPORATE_TIERS.map((t) => ({
    ...t,
    partners: partners.filter((p) => p.tier === t.value),
  })).filter((g) => g.partners.length > 0);

  return (
    <main>
      <section className="block">
        <div className="wrap">
          <h2 style={{ fontSize: 32, marginBottom: 6 }}>Our Partners</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 28, maxWidth: 640 }}>
            ABAC&apos;s Corporate Members support our cultural programs, welfare services, and
            community events across Canberra.
          </p>

          {groups.length === 0 ? (
            <p style={{ color: "var(--ink-soft)" }}>
              No corporate partners listed yet — interested in becoming one?{" "}
              <a href="/join">Apply for Corporate Membership</a>.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.value} style={{ marginBottom: 36 }}>
                <h3 style={{ fontSize: 20, marginBottom: 14 }}>{group.label}</h3>
                <div className="story-grid">
                  {group.partners.map((p) => (
                    <div key={p.business_name} className="card" style={{ textAlign: "center" }}>
                      {p.logo_path ? (
                        <div style={{ position: "relative", height: 80, marginBottom: 14 }}>
                          <Image
                            src={p.logo_path}
                            alt={p.business_name}
                            fill
                            sizes="240px"
                            style={{ objectFit: "contain" }}
                          />
                        </div>
                      ) : (
                        <div style={{ height: 80, marginBottom: 14 }} />
                      )}
                      {p.website ? (
                        <a href={p.website} target="_blank" rel="noopener">
                          <strong>{p.business_name}</strong>
                        </a>
                      ) : (
                        <strong>{p.business_name}</strong>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
