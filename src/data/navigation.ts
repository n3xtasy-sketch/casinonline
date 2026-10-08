import {
  Home,
  Dice5,
  Gift,
  Gamepad2,
  Boxes,
  CreditCard,
  BookOpen,
  Star,
  GitCompare,
  Heart,
  Cherry,
  Radio,
  CircleDot,
  Spade,
  LayoutGrid,
  Rocket,
} from "lucide-react";
import type { NavGroup } from "@/types/navigation";

/** Primary navigation (PROJECT.md / TASKS.md). */
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
    { label: "Recenzii", href: "/recenzii", icon: Star },
    { label: "Compară", href: "/compara", icon: GitCompare },
    { label: "Favorite", href: "/favorite", icon: Heart },
  ],
};

/** Game category navigation. */
export const gameNav: NavGroup = {
  label: "Jocuri",
  items: [
    { label: "Sloturi", href: "/jocuri-casino/sloturi", icon: Cherry },
    { label: "Live Casino", href: "/jocuri-casino/live-casino", icon: Radio },
    { label: "Ruletă", href: "/jocuri-casino/ruleta", icon: CircleDot },
    { label: "Blackjack", href: "/jocuri-casino/blackjack", icon: Spade },
    { label: "Jocuri de masă", href: "/jocuri-casino/jocuri-de-masa", icon: LayoutGrid },
    { label: "Crash Games", href: "/jocuri-casino/crash-games", icon: Rocket },
  ],
};

export const sidebarGroups: NavGroup[] = [mainNav, gameNav];
