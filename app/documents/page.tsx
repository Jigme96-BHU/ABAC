import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_CATEGORIES } from "@/lib/document-categories";
import { formatFileSize } from "@/lib/format-bytes";
import type { DocumentRow } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Policies & Documents",
  description:
    "ABAC's constitution, membership policy, financial reports, and meeting minutes — view and download.",
};

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>();

  const documents = data ?? [];
  const groups = DOCUMENT_CATEGORIES.map((c) => ({
    ...c,
    documents: documents.filter((d) => d.category === c.value),
  })).filter((g) => g.documents.length > 0);

  return (
    <main>
      <section className="block">
        <div className="wrap">
          <h2 style={{ fontSize: 32, marginBottom: 6 }}>Policies &amp; Documents</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 28, maxWidth: 640 }}>
            ABAC&apos;s constitution, membership policy, financial reports, and meeting minutes.
          </p>

          {groups.length === 0 ? (
            <p style={{ color: "var(--ink-soft)" }}>No documents published yet — check back soon.</p>
          ) : (
            groups.map((group) => (
              <div key={group.value} style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 20, marginBottom: 10 }}>{group.label}</h3>
                <table className="hist-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>File</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.documents.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <strong>{d.title}</strong>
                          {d.description && (
                            <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 2 }}>
                              {d.description}
                            </div>
                          )}
                        </td>
                        <td style={{ color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
                          {d.file_name.split(".").pop()?.toUpperCase()}
                          {d.file_size != null && ` · ${formatFileSize(d.file_size)}`}
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <a className="btn btn-ghost btn-sm" href={d.file_path} target="_blank" rel="noopener">
                            View / download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
