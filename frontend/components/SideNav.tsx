"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const sections = [
  { href: "/", label: "Studio", note: "overview" },
  { href: "/auto", label: "Auto Mode", note: "one prompt, full run" },
  { href: "/naming", label: "Channel Naming", note: "branding agent" },
  { href: "/pipeline", label: "Video Pipeline", note: "script → scenes → assets → seo" },
  { href: "/rewrite", label: "Script Rewrite", note: "optimize existing scripts" },
  { href: "/transcribe", label: "Video → Script", note: "upload, extract transcript" },
];

export default function SideNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* mobile-only hamburger trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className={`md:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-card glass-card flex items-center justify-center transition-opacity ${
          open ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <span className="flex flex-col gap-[3px]">
          <span className="w-4 h-[2px] bg-paper rounded-full" />
          <span className="w-4 h-[2px] bg-paper rounded-full" />
          <span className="w-4 h-[2px] bg-paper rounded-full" />
        </span>
      </button>

      {/* backdrop, mobile only, only when drawer open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] p-3 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="glass-card p-0 overflow-hidden flex flex-col h-full">
          <div className="px-5 pt-6 pb-5 border-b border-line/70 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-cyan to-violet shadow-glow-cyan pulse-dot" />
                <span className="font-display text-lg tracking-tight bg-gradient-to-r from-cyan to-violet bg-clip-text text-transparent">
                  Reelcraft
                </span>
              </div>
              <p className="text-xs text-mute mt-1.5 leading-relaxed">
                From idea to upload, one studio.
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="md:hidden text-mute hover:text-paper text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {sections.map((s) => {
              const active = pathname === s.href;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className={`block rounded-card px-3.5 py-2.5 transition-all duration-200 border ${
                    active
                      ? "bg-gradient-to-r from-cyan/10 to-violet/10 border-cyan/30 shadow-glow-cyan"
                      : "border-transparent hover:bg-white/[0.04] hover:border-line"
                  }`}
                >
                  <div className={`text-sm font-medium ${active ? "text-cyan" : "text-paper"}`}>{s.label}</div>
                  <div className="text-[11px] text-mute mt-0.5">{s.note}</div>
                </Link>
              );
            })}
          </nav>
          <div className="px-5 py-4 border-t border-line/70 text-[11px] text-mute">
            Built for the 48-Hour AI Transformation Challenge
          </div>
        </div>
      </aside>
    </>
  );
}
