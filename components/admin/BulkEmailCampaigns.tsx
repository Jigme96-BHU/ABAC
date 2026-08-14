"use client";

import { useEffect, useState } from "react";
import { getBulkEmailCampaigns } from "@/app/admin/actions";

type Campaign = {
  id: string;
  admin_id: string;
  subject: string;
  message: string;
  recipient_count: number;
  sent_at: string;
  created_at: string;
};

export default function BulkEmailCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const res = await getBulkEmailCampaigns();
      if (!res.error) {
        setCampaigns(res.campaigns as Campaign[]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div>Loading campaign history...</div>;
  if (!campaigns.length) return <div style={{ color: "#666" }}>No campaigns sent yet</div>;

  return (
    <div>
      <h3>Campaign History (Audit Trail)</h3>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
              <th style={{ padding: 12, textAlign: "left" }}>Subject</th>
              <th style={{ padding: 12, textAlign: "left" }}>Recipients</th>
              <th style={{ padding: 12, textAlign: "left" }}>Sent</th>
              <th style={{ padding: 12, textAlign: "left" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} style={{ borderBottom: "1px solid #e0e0e0" }}>
                <td style={{ padding: 12 }}>{campaign.subject}</td>
                <td style={{ padding: 12 }}>{campaign.recipient_count}</td>
                <td style={{ padding: 12 }}>
                  {new Date(campaign.sent_at).toLocaleDateString()} at{" "}
                  {new Date(campaign.sent_at).toLocaleTimeString()}
                </td>
                <td style={{ padding: 12 }}>
                  {new Date(campaign.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
