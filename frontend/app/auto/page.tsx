"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Tag, CopyButton, RegenerateButton } from "@/components/ui";
import { api } from "@/lib/api";
import { cleanScript, loadLocal, saveLocal, clearLocal } from "@/lib/text";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  plan?: any;
  outputs?: any;
  loading?: boolean;
  error?: string;
}

const STORAGE_KEY = "reelcraft:auto:messages:v1";

function uid() {
  return Math.random().toString(36).slice(2);
}

function SceneImage({ img }: { img: any }) {
  const [failed, setFailed] = useState(false);
  const src = img.url || (img.b64 ? `data:image/png;base64,${img.b64}` : "");
  if (failed || !src) {
    return (
      <div className="w-full h-28 bg-surface/60 flex items-center justify-center text-xs text-mute px-2 text-center">
        Image didn't load
      </div>
    );
  }
  return (
    
    <img src={src} alt={`Scene ${img.scene_number}`} className="w-full h-28 object-cover" onError={() => setFailed(true)} />
  );
}

function AssistantContent({ msg, onRegenerate }: { msg: ChatMessage; onRegenerate: () => void }) {
  if (msg.loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-mute">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan pulse-dot" />
        <span>Planning, then running each step...</span>
      </div>
    );
  }
  if (msg.error) {
    return (
      <div>
        <div className="text-sm text-pink mb-2">{msg.error}</div>
        <RegenerateButton onClick={onRegenerate} label="Try again" />
      </div>
    );
  }

  const out = msg.outputs || {};
  const scriptText = out.rewrite?.rewritten_script ? cleanScript(out.rewrite.rewritten_script) : out.script ? cleanScript(out.script) : "";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        {msg.plan ? (
          <div>
            <p className="text-sm text-paper mb-2">{msg.plan.summary}</p>
            <div>{msg.plan.tasks?.map((t: string, i: number) => <Tag key={i}>{t}</Tag>)}</div>
          </div>
        ) : <div />}
        <div className="flex items-center gap-3 shrink-0">
          {scriptText && <CopyButton text={scriptText} />}
          <RegenerateButton onClick={onRegenerate} />
        </div>
      </div>

      {out.naming && (
        <div className="border-t border-line pt-4">
          <div className="text-xs text-cyan mb-2 tracking-wide">CHANNEL NAMING</div>
          <div className="space-y-2">
            {out.naming.names?.map((n: any, i: number) => (
              <div key={i} className="text-sm">
                <span className="text-cyan">{n.name}</span>
                <span className="text-paper/75"> — {n.why_it_works}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {out.rewrite && (
        <div className="border-t border-line pt-4">
          <div className="text-xs text-cyan mb-2 tracking-wide">REWRITTEN SCRIPT</div>
          <div className="text-sm text-paper/75 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">{cleanScript(out.rewrite.rewritten_script)}</div>
        </div>
      )}

      {out.script && (
        <div className="border-t border-line pt-4">
          <div className="text-xs text-cyan mb-2 tracking-wide">SCRIPT</div>
          <div className="text-sm text-paper/75 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">{cleanScript(out.script)}</div>
        </div>
      )}

      {out.images && out.images.length > 0 && (
        <div className="border-t border-line pt-4">
          <div className="text-xs text-cyan mb-2 tracking-wide">GENERATED IMAGES</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {out.images.map((img: any, i: number) => (
              <div key={i} className="rounded-card overflow-hidden border border-line">
                <SceneImage img={img} />
              </div>
            ))}
          </div>
        </div>
      )}

      {out.seo && (
        <div className="border-t border-line pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-cyan tracking-wide">SEO METADATA</div>
            <CopyButton text={[`Titles:\n${(out.seo.titles || []).join("\n")}`, `Tags:\n${(out.seo.tags || []).join(", ")}`].join("\n\n")} />
          </div>
          <div className="space-y-2 text-sm">
            {out.seo.titles?.map((t: string, i: number) => <p key={i} className="text-paper">{t}</p>)}
            <div>{out.seo.tags?.map((t: string, i: number) => <Tag key={i}>{t}</Tag>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AutoChat() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    const saved = loadLocal<ChatMessage[]>(STORAGE_KEY);
    if (saved && saved.length) setMessages(saved.map((m) => (m.loading ? { ...m, loading: false, error: "Interrupted — try again." } : m)));
    restoredRef.current = true;
  }, []);

  useEffect(() => {
    if (!restoredRef.current) return;
    const slim = messages.map((m) => {
      if (!m.outputs?.images) return m;
      return { ...m, outputs: { ...m.outputs, images: m.outputs.images.map((img: any) => (img.url ? img : { ...img, b64: undefined })) } };
    });
    saveLocal(STORAGE_KEY, slim);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      send(q);
    }
  
  }, [searchParams]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);

    const userMsg: ChatMessage = { id: uid(), role: "user", text };
    const assistantId = uid();
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", loading: true }]);
    await runAssistant(text, assistantId);
  }

  async function runAssistant(text: string, assistantId: string) {
    setBusy(true);
    setMessages((m) => m.map((msg) => (msg.id === assistantId ? { ...msg, loading: true, error: undefined } : msg)));
    try {
      const data = await api.auto(text);
      setMessages((m) =>
        m.map((msg) => (msg.id === assistantId ? { ...msg, loading: false, plan: data.plan, outputs: data.outputs } : msg))
      );
    } catch (e: any) {
      setMessages((m) =>
        m.map((msg) => (msg.id === assistantId ? { ...msg, loading: false, error: e.message || "Something went wrong" } : msg))
      );
    } finally {
      setBusy(false);
    }
  }

  function regenerate(assistantId: string) {
    if (busy) return;
    const idx = messages.findIndex((m) => m.id === assistantId);
    const userMsg = idx > 0 ? messages[idx - 1] : null;
    if (!userMsg?.text) return;
    runAssistant(userMsg.text, assistantId);
  }

  function clearChat() {
    setMessages([]);
    clearLocal(STORAGE_KEY);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-10 pt-8 pb-5 flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-cyan text-xs font-medium mb-3 px-3 py-1 rounded-pill border border-cyan/25 bg-cyan/5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan pulse-dot" />
            Auto Mode
          </div>
          <h1 className="font-display text-2xl tracking-tight">Just tell it what you need</h1>
          <p className="text-mute text-sm mt-1">Roman Urdu, Urdu, or English — one message runs the whole pipeline.</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="text-xs text-mute hover:text-pink transition-colors mt-1">
            Clear chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-10 space-y-5">
        {messages.length === 0 && (
          <div className="text-sm text-mute/70 py-10">
            Try something like: <span className="text-mute">"mujhe ek tech review channel banana hai, iPhone 16 pe ek video ka script chahiye, aur uske images bhi bana do"</span>
          </div>
        )}
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-xl bg-gradient-to-r from-cyan/15 to-violet/15 border border-cyan/20 rounded-card rounded-tr-sm px-4 py-3 text-sm text-paper">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-2xl w-full glass-card rounded-tl-sm px-5 py-4">
                <AssistantContent msg={msg} onRegenerate={() => regenerate(msg.id)} />
              </div>
            </div>
          )
        )}
        <div ref={bottomRef} className="h-2" />
      </div>

      <div className="px-10 pb-8 pt-4">
        <div className="glass-card flex items-end gap-3 p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Type what you need, then press Enter..."
            className="flex-1 bg-transparent resize-none text-sm text-paper placeholder:text-mute/50 outline-none px-2 py-2 max-h-32"
          />
          <Button onClick={() => send()} disabled={busy || !input.trim()}>
            {busy ? "Running..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AutoPage() {
  return (
    <Suspense fallback={null}>
      <AutoChat />
    </Suspense>
  );
}