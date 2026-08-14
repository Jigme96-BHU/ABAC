"use client";

import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import StoriesDashboard from "./StoriesDashboard";
import DocumentsDashboard from "./DocumentsDashboard";
import VolunteersDashboard from "./VolunteersDashboard";
import CorporateDashboard from "./CorporateDashboard";
import ServiceRequestsDashboard from "./ServiceRequestsDashboard";
import BulkEmailForm from "./BulkEmailForm";
import BulkEmailCampaigns from "./BulkEmailCampaigns";
import TeamMembersDashboard from "./TeamMembersDashboard";
import type {
  EventRow,
  StoryRow,
  DocumentRow,
  VolunteerRow,
  CorporateMemberRow,
  ServiceRequestRow,
  TeamMemberRow,
} from "@/lib/supabase/types";

type Tab = "events" | "stories" | "documents" | "volunteers" | "corporate" | "services" | "email" | "team";

export default function AdminTabs({
  events,
  stories,
  documents,
  volunteers,
  corporateMembers,
  serviceRequests,
  teamMembers,
}: {
  events: EventRow[];
  stories: StoryRow[];
  documents: DocumentRow[];
  volunteers: VolunteerRow[];
  corporateMembers: CorporateMemberRow[];
  serviceRequests: ServiceRequestRow[];
  teamMembers: TeamMemberRow[];
}) {
  const [tab, setTab] = useState<Tab>("events");
  const pendingCorporate = corporateMembers.filter((m) => m.status === "pending").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          className={tab === "events" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setTab("events")}
        >
          Events ({events.length})
        </button>
        <button
          className={tab === "stories" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setTab("stories")}
        >
          Stories ({stories.length})
        </button>
        <button
          className={tab === "documents" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setTab("documents")}
        >
          Documents ({documents.length})
        </button>
        <button
          className={tab === "volunteers" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setTab("volunteers")}
        >
          Volunteers ({volunteers.length})
        </button>
        <button
          className={tab === "corporate" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setTab("corporate")}
        >
          Corporate ({corporateMembers.length}){pendingCorporate > 0 ? ` · ${pendingCorporate} pending` : ""}
        </button>
        <button
          className={tab === "services" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setTab("services")}
        >
          Services ({serviceRequests.length})
        </button>
        <button
          className={tab === "email" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setTab("email")}
        >
          Email
        </button>
        <button
          className={tab === "team" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setTab("team")}
        >
          Team ({teamMembers.length})
        </button>
      </div>

      {tab === "events" ? (
        <AdminDashboard events={events} />
      ) : tab === "stories" ? (
        <StoriesDashboard stories={stories} />
      ) : tab === "documents" ? (
        <DocumentsDashboard documents={documents} />
      ) : tab === "volunteers" ? (
        <VolunteersDashboard volunteers={volunteers} />
      ) : tab === "corporate" ? (
        <CorporateDashboard corporateMembers={corporateMembers} />
      ) : tab === "services" ? (
        <ServiceRequestsDashboard requests={serviceRequests} />
      ) : tab === "team" ? (
        <TeamMembersDashboard members={teamMembers} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div>
            <BulkEmailForm />
          </div>
          <div>
            <BulkEmailCampaigns />
          </div>
        </div>
      )}
    </div>
  );
}
