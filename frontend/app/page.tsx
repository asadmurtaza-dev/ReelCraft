"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

const cards = [
  {
    href: "/naming",
    num: "01",
    title: "Channel Naming",
    body: "Describe your niche and audience, or let the agent help you find a niche first. Get names, handles, a tagline, and content pillars.",
  },
  {
    href: "/pipeline",
    num: "02",
    title: "Video Pipeline",
    body: "Topic in, full production package out: script, scene breakdown, image prompts and images, video-gen prompts, SEO metadata.",
  },
  {
    href: "/rewrite",
    num: "03",
    title: "Script Rewrite",
    body: "Paste an existing script. Get a tighter, higher-retention rewrite plus fresh title, description and tag suggestions.",
  },
  {
    href: "/transcribe",
    num: "04",
    title: "Video → Script",
    body: "Upload a video or audio file. Get a cleaned-up transcript formatted as a script.",
  },
];

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function goToAuto() {
    const text = prompt.trim();
    if (!text) return;
    router.push(`/auto?q=${encodeURIComponent(text)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      goToAuto();
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Reelcraft"
        title="From idea to upload, one studio."
        description="Type what you need below and Auto Mode runs the whole pipeline, or open a tool directly."
      />

      <div className="px-6 lg:px-10 pt-8">
        <div className="glass-card glass-card-hover flex items-end gap-3 p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder='e.g. "mujhe ek tech review channel banana hai, iPhone 16 pe script chahiye aur images bhi bana do"'
            className="flex-1 bg-transparent resize-none text-sm text-paper placeholder:text-mute/60 px-3 py-2.5 max-h-32"
          />
          <button
            onClick={goToAuto}
            disabled={!prompt.trim()}
            className="px-5 py-2.5 rounded-pill text-sm font-medium bg-cyan text-ink hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run
          </button>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group">
            <div className="glass-card glass-card-hover p-6 h-full">
              <div className="flex items-start justify-between mb-4">
                <span className="font-display text-2xl text-mute/50 group-hover:text-cyan transition-colors">{c.num}</span>
                <span className="text-mute/50 group-hover:text-cyan transition-colors">→</span>
              </div>
              <h3 className="font-display text-lg mb-2 text-paper">{c.title}</h3>
              <p className="text-sm text-mute leading-relaxed">{c.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}