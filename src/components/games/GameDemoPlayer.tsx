"use client";

import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { isAllowedDemoUrl } from "@/lib/demo";

/**
 * On-site free-play (demo) player.
 *
 * - Renders nothing unless `demoUrl` is an https URL on the app allowlist
 *   (src/lib/demo.ts). The caller also gates on this, so a game without a demo
 *   shows no empty player — this guard is defensive.
 * - Click-to-load: the <iframe> is mounted only after the user clicks Play, so
 *   no third-party code runs on page load (perf + privacy) and there is no CLS.
 * - We do NOT treat iframe onLoad as proof the game works (a provider can refuse
 *   framing and still fire load), so the "open in a new tab" fallback is always
 *   offered once the demo is launched.
 */
export function GameDemoPlayer({ demoUrl, gameName }: { demoUrl?: string; gameName: string }) {
  const [launched, setLaunched] = useState(false);
  if (!isAllowedDemoUrl(demoUrl)) return null;

  return (
    <Card padding="md">
      <div className="flex flex-col gap-3">
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-gradient-to-br from-elevated to-surface">
          {launched ? (
            <iframe
              src={demoUrl}
              title={`Demo ${gameName}`}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
              allow="fullscreen"
              referrerPolicy="no-referrer"
            />
          ) : (
            <button
              type="button"
              onClick={() => setLaunched(true)}
              className="group absolute inset-0 grid place-items-center outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`Pornește demo pentru ${gameName}`}
            >
              <span className="flex flex-col items-center gap-2 text-ink-secondary transition-colors group-hover:text-ink">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-[#06110a] shadow-lg transition-transform group-hover:scale-105">
                  <Play size={28} fill="currentColor" strokeWidth={0} className="ml-0.5" />
                </span>
                <span className="text-sm font-medium">Joacă demo</span>
              </span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <span>Mod demo — fără bani reali · 18+ / Joacă responsabil</span>
          {launched ? (
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              Nu se încarcă? Deschide într-o filă nouă
              <ExternalLink size={13} />
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
