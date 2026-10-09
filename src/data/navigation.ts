import {
  Home,
  Dice5,
  Gift,
  Gamepad2,
  Boxes,
  CreditCard,
  BookOpen,
  Cherry,
  LayoutGrid,
  Rocket,
} from "lucide-react";
import type { NavGroup } from "@/types/navigation";

/** Primary navigation (PROJECT.md / TASKS.md). Only existing routes. */
export const mainNav: NavGroup = {
  label: "Explorare",
  items: [
    { label: "Home", href: "/", icon: Home },
    { label: "Cazinouri", href: "/cazinouri-online", icon: Dice5 },
    { label: "Bonusuri", href: "/bonusuri-casino", icon: Gift },
    { label: "Jocuri", href: "/jocuri-casino", icon: Gamepad2 },
    { label: "Furnizori", href: "/furnizori", icon: Boxes },
    { label: "Metode de plată", href: "/metode-de-plata", icon: CreditCard },
    { label: "Ghiduri", href: "/ghiduri", icon: BookOpen },
  ],
};

/** Game categories → the listing filtered via the supported ?categorie= param. */
export const gameNav: NavGroup = {
  label: "Jocuri",
  items: [
    { label: "Sloturi", href: "/jocuri-casino?categorie=sloturi", icon: Cherry },
    { label: "Megaways", href: "/jocuri-casino?categorie=megaways", icon: LayoutGrid },
    { label: "Jackpot", href: "/jocuri-casino?categorie=jackpot", icon: Rocket },
  ],
};

export const sidebarGroups: NavGroup[] = [mainNav, gameNav];
