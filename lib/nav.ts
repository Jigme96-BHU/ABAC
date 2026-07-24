/** Single source of truth for site navigation.
 *  `header` controls the desktop bar; the mobile menu shows every link. */
export type NavItem = { href: string; label: string; header: boolean };

export const NAV: NavItem[] = [
  { href: "/", label: "Home", header: true },
  { href: "/events", label: "Events", header: true },
  { href: "/stories", label: "Stories", header: true },
  { href: "/join", label: "Join", header: true },
  { href: "/services", label: "Services", header: true },
  { href: "/team", label: "Team", header: true },
  { href: "/donate", label: "Donate", header: false },
  { href: "/contact", label: "Contact", header: true },
];

export const HEADER_NAV = NAV.filter((n) => n.header);
