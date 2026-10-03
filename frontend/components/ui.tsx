"use client";
import { useState } from "react";
import { downloadText } from "@/lib/text";

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="px-6 lg:px-10 pt-10 pb-8 border-b border-line">
      <div className="inline-flex items-center gap-2 text-cyan text-xs font-medium mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
        {eyebrow}
      </div>
      <h1 className="font-display text-3xl tracking-tight text-paper">{title}</h1>
      <p className="text-mute mt-2 max-w-xl leading-relaxed">{description}</p>
    </div>
  );
}

export function Panel({ children, className = "", glow = "cyan" }: { children: React.ReactNode; className?: string; glow?: "cyan" | "violet" | "pink" | "none" }) {
  const glowClass = glow === "none" ? "" : "glass-card-hover";
  return (
    <div className={`glass-card ${glowClass} p-6 ${className}`}>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
}) {
  const base = "px-5 py-2.5 rounded-pill text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-cyan text-ink hover:brightness-110"
      : "border border-line text-paper hover:border-cyan/40 hover:bg-white/[0.04]";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-base2 border border-line rounded-card px-4 py-3 text-sm text-paper placeholder:text-mute/50 focus:border-cyan resize-y ${props.className || ""}`}
    />
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-base2 border border-line rounded-card px-4 py-2.5 text-sm text-paper placeholder:text-mute/50 focus:border-cyan ${props.className || ""}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <div className="text-xs text-mute mb-1.5 tracking-wide">{label}</div>
      {children}
    </label>
  );
}

export function LoadingLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-mute py-4">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan pulse-dot" />
      <span>{text}</span>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="border border-pink/30 bg-pink/5 text-pink text-sm rounded-card px-4 py-3 backdrop-blur">
      {message}
    </div>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs px-2.5 py-1 rounded-pill border border-line bg-white/[0.03] text-mute mr-1.5 mb-1.5 hover:border-cyan/30 hover:text-paper transition-colors">
      {children}
    </span>
  );
}


export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // clipboard permission denied — nothing more we can do here
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs text-mute hover:text-cyan transition-colors"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function DownloadButton({ filename, content, label = "Download" }: { filename: string; content: string; label?: string }) {
  return (
    <button onClick={() => downloadText(filename, content)} className="text-xs text-mute hover:text-cyan transition-colors">
      {label}
    </button>
  );
}

export function RegenerateButton({ onClick, disabled, label = "Regenerate" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-xs text-mute hover:text-cyan transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {disabled ? "Working..." : label}
    </button>
  );
}

export function PanelHeaderRow({ title, actions }: { title: string; actions: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-display text-base text-paper">{title}</h3>
      <div className="flex items-center gap-3">{actions}</div>
    </div>
  );
}