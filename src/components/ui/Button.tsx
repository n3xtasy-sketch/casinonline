import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-[#06110a] hover:bg-accent-hover active:bg-accent-active",
  secondary: "border border-border-strong bg-elevated text-ink hover:bg-raised",
  ghost: "text-accent hover:text-link-hover",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** Render as a Next link when provided. */
  href?: string;
  children: ReactNode;
};

export function Button({ variant = "primary", href, className, children, ...rest }: Props) {
  const classes = cn(base, variants[variant], className);

  if (href) {
    // Affiliate / outbound destinations need a full navigation (not next/link):
    // /go/* is a redirect route handler, and monetized links must carry
    // rel="sponsored nofollow" (Google affiliate-link policy).
    const isAffiliate = href.startsWith("/go/") || /^https?:\/\//.test(href);
    if (isAffiliate) {
      return (
        <a href={href} rel="sponsored nofollow noopener" className={classes}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
