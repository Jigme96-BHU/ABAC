"use client";

import { useState, useTransition } from "react";
import {
  sendBulkEmail,
  searchMembers,
  searchCorporateMembers,
  createEmailAttachmentUploadUrl,
  EMAIL_ATTACHMENT_MAX_BYTES,
  type BulkEmailFilter,
} from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";

type IndividualRecipient = { id: string; name: string; email: string };

export default function BulkEmailForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<BulkEmailFilter>({
    audience: "community",
    membershipTypes: ["single", "family"],
    includeInactive: false,
  });
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function addAttachmentFiles(files: FileList | null) {
    if (!files) return;
    const oversized = [...files].filter((f) => f.size > EMAIL_ATTACHMENT_MAX_BYTES);
    if (oversized.length > 0) {
      setResult({ error: `${oversized.map((f) => f.name).join(", ")} must each be under 5MB.` });
      return;
    }
    setAttachmentFiles((prev) => [...prev, ...files]);
  }

  function removeAttachmentFile(index: number) {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const [individualQuery, setIndividualQuery] = useState("");
  const [individualResults, setIndividualResults] = useState<IndividualRecipient[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<IndividualRecipient[]>([]);
  const [individualSearching, startIndividualSearch] = useTransition();

  function switchAudience(audience: "community" | "corporate") {
    handleFilterChange("audience", audience);
    // A selected person's id only makes sense against the table it was
    // searched from — switching audience would otherwise silently carry
    // over ids into the wrong table's lookup.
    setSelectedIndividuals([]);
    setIndividualResults([]);
    setIndividualQuery("");
  }

  function runIndividualSearch() {
    const q = individualQuery.trim();
    if (!q) {
      setIndividualResults([]);
      return;
    }
    startIndividualSearch(async () => {
      const res =
        filter.audience === "corporate" ? await searchCorporateMembers(q) : await searchMembers(q);
      if (res.error) {
        setIndividualResults([]);
        return;
      }
      const normalised: IndividualRecipient[] =
        filter.audience === "corporate"
          ? res.results.map((m: any) => ({ id: m.id, name: m.business_name, email: m.email }))
          : res.results.map((m: any) => ({ id: m.id, name: m.name, email: m.email }));
      setIndividualResults(normalised.filter((r) => r.email));
    });
  }

  function addIndividual(person: IndividualRecipient) {
    setSelectedIndividuals((prev) => (prev.some((p) => p.id === person.id) ? prev : [...prev, person]));
  }

  function removeIndividual(id: string) {
    setSelectedIndividuals((prev) => prev.filter((p) => p.id !== id));
  }

  const handleFilterChange = (key: keyof BulkEmailFilter, value: any) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleMembershipType = (type: "single" | "family") => {
    const current = filter.membershipTypes || [];
    if (current.includes(type)) {
      handleFilterChange(
        "membershipTypes",
        current.filter((t) => t !== type)
      );
    } else {
      handleFilterChange("membershipTypes", [...current, type]);
    }
  };

  const handleToggleCorporateTier = (tier: "gold" | "platinum" | "diamond") => {
    const current = filter.corporateTiers || [];
    if (current.includes(tier)) {
      handleFilterChange(
        "corporateTiers",
        current.filter((t) => t !== tier)
      );
    } else {
      handleFilterChange("corporateTiers", [...current, tier]);
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      setResult({ error: "Subject is required" });
      return;
    }
    if (!message.trim()) {
      setResult({ error: "Message is required" });
      return;
    }

    setLoading(true);
    setResult(null);

    // Straight to Storage from the browser, same reason as every other
    // upload in this project — routing files through the server action's
    // own request body hits Next.js's 1MB default limit.
    const uploaded: { path: string; filename: string }[] = [];
    const browserSupabase = createClient();
    for (let i = 0; i < attachmentFiles.length; i++) {
      const file = attachmentFiles[i];
      setUploadStatus(`Uploading ${file.name} (${i + 1}/${attachmentFiles.length})…`);
      const uploadUrl = await createEmailAttachmentUploadUrl(file.type);
      if (uploadUrl.error || !uploadUrl.path || !uploadUrl.token) {
        setResult({ error: uploadUrl.error ?? `Couldn't prepare ${file.name} for upload.` });
        setUploadStatus(null);
        setLoading(false);
        return;
      }
      const { error: putError } = await browserSupabase.storage
        .from("email-attachments")
        .uploadToSignedUrl(uploadUrl.path, uploadUrl.token, file);
      if (putError) {
        setResult({ error: `Couldn't upload ${file.name}: ${putError.message}` });
        setUploadStatus(null);
        setLoading(false);
        return;
      }
      uploaded.push({ path: uploadUrl.path, filename: file.name });
    }
    setUploadStatus(null);

    const filterWithIndividuals: BulkEmailFilter = {
      ...filter,
      individualMemberIds: selectedIndividuals.map((p) => p.id),
    };
    const res = await sendBulkEmail(subject, message, filterWithIndividuals, uploaded);

    if (res.error) {
      setResult({ error: res.error });
    } else {
      setResult({ success: `Email sent to ${res.recipientCount} members` });
      setSubject("");
      setMessage("");
      setFilter({ audience: filter.audience, membershipTypes: ["single", "family"], includeInactive: false });
      setAttachmentFiles([]);
      setSelectedIndividuals([]);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h3>Send Bulk Announcement</h3>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
          Subject *
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject line"
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #e0e0e0",
            borderRadius: 4,
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
          Message *
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Email message content"
          rows={8}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #e0e0e0",
            borderRadius: 4,
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ marginBottom: 20, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
        <h4 style={{ marginTop: 0, marginBottom: 12 }}>Filter Recipients</h4>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            Audience
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => switchAudience("community")}
              style={{
                padding: "6px 14px",
                borderRadius: 4,
                border: filter.audience === "community" ? "1px solid #16324F" : "1px solid #ccc",
                background: filter.audience === "community" ? "#16324F" : "#fff",
                color: filter.audience === "community" ? "#fff" : "#333",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Community members
            </button>
            <button
              type="button"
              onClick={() => switchAudience("corporate")}
              style={{
                padding: "6px 14px",
                borderRadius: 4,
                border: filter.audience === "corporate" ? "1px solid #16324F" : "1px solid #ccc",
                background: filter.audience === "corporate" ? "#16324F" : "#fff",
                color: filter.audience === "corporate" ? "#fff" : "#333",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Corporate members
            </button>
          </div>
        </div>

        {filter.audience === "community" ? (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
              Membership Types
            </label>
            <label style={{ display: "block", marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={filter.membershipTypes?.includes("single") || false}
                onChange={() => handleToggleMembershipType("single")}
              />
              {" "}Single Members
            </label>
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={filter.membershipTypes?.includes("family") || false}
                onChange={() => handleToggleMembershipType("family")}
              />
              {" "}Family Members
            </label>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
              Corporate Tiers
            </label>
            <label style={{ display: "block", marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={filter.corporateTiers?.includes("gold") || false}
                onChange={() => handleToggleCorporateTier("gold")}
              />
              {" "}Gold
            </label>
            <label style={{ display: "block", marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={filter.corporateTiers?.includes("platinum") || false}
                onChange={() => handleToggleCorporateTier("platinum")}
              />
              {" "}Platinum
            </label>
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={filter.corporateTiers?.includes("diamond") || false}
                onChange={() => handleToggleCorporateTier("diamond")}
              />
              {" "}Diamond
            </label>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            Date Range
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input
              type="date"
              value={filter.dateRange?.start || ""}
              onChange={(e) =>
                handleFilterChange("dateRange", {
                  ...filter.dateRange,
                  start: e.target.value,
                })
              }
              placeholder="From"
              style={{
                padding: "8px 12px",
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                fontSize: 14,
              }}
            />
            <input
              type="date"
              value={filter.dateRange?.end || ""}
              onChange={(e) =>
                handleFilterChange("dateRange", {
                  ...filter.dateRange,
                  end: e.target.value,
                })
              }
              placeholder="To"
              style={{
                padding: "8px 12px",
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                fontSize: 14,
              }}
            />
          </div>
        </div>

        <label style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={filter.includeInactive || false}
            onChange={(e) => handleFilterChange("includeInactive", e.target.checked)}
          />
          {" "}Include Inactive Members
        </label>
      </div>

      <div style={{ marginBottom: 20, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
        <h4 style={{ marginTop: 0, marginBottom: 4 }}>Also send to specific people</h4>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 12px" }}>
          Search by name or email and add anyone who should get this email regardless of the
          filters above — useful for sending to just a few individuals.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="text"
            value={individualQuery}
            onChange={(e) => setIndividualQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runIndividualSearch();
              }
            }}
            placeholder={filter.audience === "corporate" ? "Business name or email" : "Name or email"}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid #e0e0e0",
              borderRadius: 4,
              fontSize: 14,
            }}
          />
          <button
            type="button"
            onClick={runIndividualSearch}
            disabled={individualSearching}
            style={{
              padding: "8px 16px",
              background: "#16324F",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {individualSearching ? "Searching…" : "Search"}
          </button>
        </div>

        {individualResults.length > 0 && (
          <div style={{ marginBottom: 12, border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff" }}>
            {individualResults.map((person) => {
              const alreadyAdded = selectedIndividuals.some((p) => p.id === person.id);
              return (
                <div
                  key={person.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: 13,
                  }}
                >
                  <span>
                    <strong>{person.name}</strong> · {person.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => addIndividual(person)}
                    disabled={alreadyAdded}
                    style={{
                      padding: "4px 10px",
                      background: alreadyAdded ? "#eee" : "#16324F",
                      color: alreadyAdded ? "#999" : "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: alreadyAdded ? "default" : "pointer",
                      fontSize: 12,
                    }}
                  >
                    {alreadyAdded ? "Added" : "+ Add"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {selectedIndividuals.length > 0 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, margin: "0 0 6px" }}>
              Selected ({selectedIndividuals.length}):
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {selectedIndividuals.map((person) => (
                <span
                  key={person.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    background: "#e8eef4",
                    borderRadius: 999,
                    fontSize: 12,
                  }}
                >
                  {person.name}
                  <button
                    type="button"
                    onClick={() => removeIndividual(person.id)}
                    aria-label={`Remove ${person.name}`}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
          Attachments (Optional)
        </label>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 8px" }}>
          PDF, DOC/DOCX, or image files, up to 5MB each — uploaded once you click Send Email.
        </p>
        <input
          type="file"
          multiple
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => addAttachmentFiles(e.target.files)}
          style={{
            padding: "8px 12px",
            border: "1px solid #e0e0e0",
            borderRadius: 4,
          }}
        />
        {attachmentFiles.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {attachmentFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  background: "#fff",
                  border: "1px solid #e0e0e0",
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                <span>
                  {file.name} <span style={{ color: "#999" }}>({(file.size / 1024).toFixed(0)} KB)</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachmentFile(i)}
                  aria-label={`Remove ${file.name}`}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#c33" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {result && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 4,
            background: result.error ? "#fee" : "#efe",
            color: result.error ? "#c33" : "#363",
            fontSize: 14,
          }}
        >
          {result.error || result.success}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setShowPreview(!showPreview)}
          style={{
            padding: "8px 16px",
            background: "#f0f0f0",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          {showPreview ? "Hide Preview" : "Preview"}
        </button>
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "#16324F",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 14,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {uploadStatus ?? (loading ? "Sending..." : "Send Email")}
        </button>
      </div>

      {showPreview && (
        <div style={{ marginTop: 20, padding: 16, background: "#fafafa", borderRadius: 8 }}>
          <h4>Preview</h4>
          <p style={{ margin: "8px 0", fontSize: 12, color: "#666" }}>
            <strong>To:</strong> All filtered recipients
          </p>
          <p style={{ margin: "8px 0", fontSize: 12, color: "#666" }}>
            <strong>Subject:</strong> {subject || "(no subject)"}
          </p>
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "#fff",
              borderRadius: 4,
              border: "1px solid #e0e0e0",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.5 }}>
              {message || "(empty message)"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
