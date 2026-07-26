/** Placeholder team content — copied verbatim from the design prototype
 *  (abac-website-preview.html, "files (3)" version) at Jigme's explicit
 *  instruction: match the prototype exactly, names included, no
 *  verification against real committee records.
 *
 *  None of the people below (except where noted) are confirmed real ABAC
 *  office-holders. The prototype's own footer note says as much: "Names and
 *  tenures shown are placeholders — photographs, biographies, and the
 *  confirmed presidents list (2010–2026) to be supplied by the committee."
 *
 *  Real, WordPress-migrated committee data still exists in content/team.ts
 *  (EXECUTIVE, FORMER_PRESIDENTS) and content/founders.ts — swap those back
 *  in on app/team/page.tsx once the committee confirms this page's content.
 */

export type PlaceholderPerson = {
  name: string;
  role: string;
  bio?: string;
  initials: string;
  color: string;
  textColor?: string;
  /** Public path to a real photo, when one has been supplied — falls back
   *  to the initials avatar when omitted. */
  photo?: string;
};

const EM = "/img/team/executive-member";

export const EXECUTIVE_PLACEHOLDER: PlaceholderPerson[] = [
  { name: "Dorji Tashi", role: "President", bio: "Leads the association's strategy and community representation across the ACT.", initials: "DT", color: "var(--gd)", photo: `${EM}/dorji-tashi.jpeg` },
  { name: "Jigme Jamtsho", role: "Vice-President", bio: "Coordinates cultural programs and the annual festival calendar.", initials: "JJ", color: "var(--orange)", photo: `${EM}/jigme-jamtsho.jpeg` },
  { name: "Kuenzang Dema", role: "General Secretary", bio: "Keeps the records, the minutes, and the association's governance in order.", initials: "KD", color: "var(--gold)", textColor: "#3D2E05", photo: `${EM}/kuenzang-dema.jpeg` },
  { name: "Tshering Phuntsho", role: "Treasurer", bio: "Manages membership payments, donations, and financial reporting to the AGM.", initials: "TP", color: "var(--gd-deep)", photo: `${EM}/tshering-phuntsho.jpeg` },
  { name: "Phuntsho Kinrab Dema", role: "Community Engagement Officer", bio: "Welcomes new arrivals and connects families with community programs and support.", initials: "PD", color: "var(--orange)", photo: `${EM}/phuntsho-kinrab-dema.jpeg` },
  { name: "Pema Yogini Yuphel", role: "Community Engagement Officer", bio: "Builds partnerships with ACT multicultural bodies and local organisations.", initials: "PY", color: "var(--gd)", photo: `${EM}/pema-yogini-yuphel.jpeg` },
  { name: "Tandin Sonam", role: "Sports Coordinator", bio: "Organises khuru, archery, football, and community sports days across the ACT.", initials: "TS", color: "var(--gd-deep)", photo: `${EM}/tandin-sonam.jpeg` },
  { name: "Sangay Tshomo", role: "Cultural Coordinator", bio: "Runs Dzongkha classes, dance groups, and traditional arts workshops.", initials: "ST", color: "var(--gold)", textColor: "#3D2E05", photo: `${EM}/sangay-tshomo.jpeg` },
  { name: "Leki Dorji", role: "Youth Coordinator", bio: "Drives the eleven-program youth action plan and youth leadership initiatives.", initials: "LD", color: "var(--orange)", photo: `${EM}/leki-dorji.jpeg` },
];

export const ADVISORY_PLACEHOLDER: PlaceholderPerson[] = [
  { name: "Rinzin Wangmo", role: "Chairperson", bio: "Chairs the advisory board and guides the association's long-term direction.", initials: "RW", color: "var(--gold)", textColor: "#3D2E05" },
  { name: "Kuenzang Dema", role: "General Secretary", bio: "Keeps the records, the minutes, and the association's governance in order.", initials: "KD", color: "var(--gd)", photo: `${EM}/kuenzang-dema.jpeg` },
  { name: "Tshering Norbu", role: "Adviser — Governance", bio: "Founding member; advises the committee on incorporation and association law.", initials: "TN", color: "var(--gd-deep)" },
  { name: "Choki Yangzom", role: "Adviser — Community welfare", bio: "Guides the welfare fund and links families with ACT support services.", initials: "CY", color: "var(--gold)", textColor: "#3D2E05" },
  { name: "Jigme Tenzin", role: "Adviser — Education", bio: "Mentors students and supports the Dzongkha language curriculum.", initials: "JT", color: "var(--orange)" },
  { name: "Dorji Tashi", role: "President", bio: "Leads the association's strategy and community representation across the ACT.", initials: "DT", color: "var(--gd-deep)", photo: `${EM}/dorji-tashi.jpeg` },
];

export const FOUNDERS_PLACEHOLDER: PlaceholderPerson[] = [
  { name: "Dasho Sonam Tobgay", role: "Founder", initials: "ST", color: "var(--gd-deep)" },
  { name: "Dr Lhawang Ugyel", role: "Founder", initials: "LU", color: "var(--gd)" },
  { name: "Ms Patt Darlington", role: "Founder", initials: "PD", color: "var(--gold)", textColor: "#3D2E05" },
  { name: "Drukdra Wangchuk", role: "Founder", initials: "DW", color: "var(--orange)" },
];

export type PlaceholderPresident = {
  name: string;
  tenure: string;
  initials: string;
  color: string;
  textColor?: string;
};

export const FORMER_PRESIDENTS_PLACEHOLDER: PlaceholderPresident[] = [
  { name: "Karma Tshering", tenure: "2023–2026", initials: "KT", color: "var(--gd)" },
  { name: "Namgay Dema", tenure: "2020–2023", initials: "ND", color: "var(--orange)" },
  { name: "Tandin Phuntsho", tenure: "2018–2020", initials: "TP", color: "var(--gold)", textColor: "#3D2E05" },
  { name: "Nima Gyeltshen", tenure: "2016–2018", initials: "NG", color: "var(--gd-deep)" },
  { name: "Kuenzang Choden", tenure: "2014–2016", initials: "KC", color: "var(--gd)" },
  { name: "Tashi Dorji", tenure: "2012–2014", initials: "TD", color: "var(--orange)" },
  { name: "Sangay Tenzin", tenure: "2010–2012", initials: "ST", color: "var(--gold)", textColor: "#3D2E05" },
];
