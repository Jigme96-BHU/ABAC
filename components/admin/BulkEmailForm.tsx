"use client";

import { useState } from "react";
import { sendBulkEmail, type BulkEmailFilter } from "@/app/admin/actions";

export default function BulkEmailForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<BulkEmailFilter>({
    audience: "community",
    membershipTypes: ["single", "family"],
    includeInactive: false,
  });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

    const res = await sendBulkEmail(subject, message, filter, attachments);

    if (res.error) {
      setResult({ error: res.error });
    } else {
      setResult({ success: `Email sent to ${res.recipientCount} members` });
      setSubject("");
      setMessage("");
      setFilter({ audience: filter.audience, membershipTypes: ["single", "family"], includeInactive: false });
      setAttachments([]);
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
              onClick={() => handleFilterChange("audience", "community")}
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
              onClick={() => handleFilterChange("audience", "corporate")}
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

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
          Attachments (Optional)
        </label>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 8px" }}>
          You can attach images and documents to this email
        </p>
        <input
          type="file"
          multiple
          style={{
            padding: "8px 12px",
            border: "1px solid #e0e0e0",
            borderRadius: 4,
          }}
        />
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
          {loading ? "Sending..." : "Send Email"}
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
