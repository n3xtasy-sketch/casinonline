import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Optional uppercase section label shown above the group. */
  label?: string;
  items: NavItem[];
}
