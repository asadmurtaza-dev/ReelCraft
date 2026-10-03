"use client";
import { useState, useRef, useEffect } from "react";
import {
  PageHeader, Panel, Button, TextArea, TextInput, Field, ErrorNote, Tag,
  CopyButton, DownloadButton, RegenerateButton, PanelHeaderRow,
} from "@/components/ui";
import { api } from "@/lib/api";
import { cleanScript, scenesToSrt, loadLocal, saveLocal, clearLocal } from "@/lib/text";

type Status = "idle" | "waiting" | "running" | "done" | "error";

type AgentId = "script" | "scenes" | "seo" | "image_prompts" | "video_prompts" | "images";

interface AgentState {
  status: Status;
  error?: string;
}

const AGENT_META: Record<AgentId, { title: string; note: string }> = {
  script: { title: "Script Agent", note: "writes the full script from your topic" },
  scenes: { title: "Scene Breakdown Agent", note: "splits the script into shots" },
  seo: { title: "SEO Agent", note: "titles, description, tags, thumbnail text" },
  image_prompts: { title: "Image Prompt Agent", note: "a text-to-image prompt per scene" },
  video_prompts: { title: "Video Prompt Agent", note: "a text-to-video prompt per scene" },
  images: { title: "Image Generation Agent", note: "renders the actual scene images" },
};

const AGENT_ORDER: AgentId[] = ["script", "scenes", "seo", "image_prompts", "video_prompts", "images"];
const IDLE_AGENTS: Record<AgentId, AgentState> = {
  script: { status: "idle" }, scenes: { status: "idle" }, seo: { status: "idle" },
  image_prompts: { status: "idle" }, video_prompts: { status: "idle" }, images: { status: "idle" },
};

function StatusDot({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    idle: "bg-mute/30", waiting: "bg-mute/50", running: "bg-amber pulse-dot", done: "bg-cyan", error: "bg-pink",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${styles[status]}`} />;
}

function StatusLabel({ status }: { status: Status }) {
  const text: Record<Status, string> = {
    idle: "Idle", waiting: "Waiting on dependency", running: "Running", done: "Done", error: "Failed",
  };
  const color: Record<Status, string> = {
    idle: "text-mute", waiting: "text-mute", running: "text-amber", done: "text-cyan", error: "text-pink",
  };
  return <span className={`text-xs ${color[status]}`}>{text[status]}</span>;
}

type ImgStatus = "pending" | "loading" | "loaded" | "failed";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function preload(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

const IMAGE_GAP_MS = 15000;
const IMAGE_MAX_TRIES = 3;
const STORAGE_KEY = "reelcraft:pipeline:v1";

interface SavedState {
  topic: string; lengthMinutes: number; tone: string;
  script: string; scenes: any[]; seo: any; imagePrompts: any[]; videoPrompts: any[];
  images: Record<number, any>; imageStatus: Record<number, ImgStatus>;
}

export default function PipelinePage() {
  const [topic, setTopic] = useState("");
  const [lengthMinutes, setLengthMinutes] = useState(8);
  const [tone, setTone] = useState("conversational, energetic");

  const [agents, setAgents] = useState<Record<AgentId, AgentState>>(IDLE_AGENTS);

  const [script, setScript] = useState("");
  const [scenes, setScenes] = useState<any[]>([]);
  const [seo, setSeo] = useState<any>(null);
  const [imagePrompts, setImagePrompts] = useState<any[]>([]);
  const [videoPrompts, setVideoPrompts] = useState<any[]>([]);
  const [images, setImages] = useState<Record<number, any>>({});
  const [imageStatus, setImageStatus] = useState<Record<number, ImgStatus>>({});
  const [globalError, setGlobalError] = useState("");
  const [running, setRunning] = useState(false);
  const [restored, setRestored] = useState(false);

  const scriptRef = useRef("");
  const scenesRef = useRef<any[]>([]);

  // Restore the last completed run on mount so a refresh doesn't lose it.
  useEffect(() => {
    const saved = loadLocal<SavedState>(STORAGE_KEY);
    if (saved) {
      setTopic(saved.topic || "");
      setLengthMinutes(saved.lengthMinutes || 8);
      setTone(saved.tone || "conversational, energetic");
      setScript(saved.script || "");
      scriptRef.current = saved.script || "";
      setScenes(saved.scenes || []);
      scenesRef.current = saved.scenes || [];
      setSeo(saved.seo || null);
      setImagePrompts(saved.imagePrompts || []);
      setVideoPrompts(saved.videoPrompts || []);
      setImages(saved.images || {});
      setImageStatus(saved.imageStatus || {});
      setAgents({
        script: { status: saved.script ? "done" : "idle" },
        scenes: { status: saved.scenes?.length ? "done" : "idle" },
        seo: { status: saved.seo ? "done" : "idle" },
        image_prompts: { status: saved.imagePrompts?.length ? "done" : "idle" },
        video_prompts: { status: saved.videoPrompts?.length ? "done" : "idle" },
        images: { status: Object.keys(saved.images || {}).length ? "done" : "idle" },
      });
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist after anything meaningful changes (skip the very first render/restore pass).
  useEffect(() => {
    if (!restored) return;
    if (!script && scenes.length === 0 && !seo) return; // nothing worth saving yet
    // Drop any base64 images before saving — they can be megabytes each and would blow the quota.
    const safeImages: Record<number, any> = {};
    for (const [k, v] of Object.entries(images)) if (v?.url) safeImages[Number(k)] = v;
    saveLocal(STORAGE_KEY, {
      topic, lengthMinutes, tone, script, scenes, seo, imagePrompts, videoPrompts,
      images: safeImages, imageStatus,
    } as SavedState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, topic, lengthMinutes, tone, script, scenes, seo, imagePrompts, videoPrompts, images, imageStatus]);

  function clearSavedRun() {
    clearLocal(STORAGE_KEY);
    setTopic(""); setScript(""); setScenes([]); setSeo(null);
    setImagePrompts([]); setVideoPrompts([]); setImages({}); setImageStatus({});
    setAgents(IDLE_AGENTS);
    scriptRef.current = ""; scenesRef.current = [];
  }

  function setAgent(id: AgentId, patch: Partial<AgentState>) {
    setAgents((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function runScript() {
    if (!topic.trim()) return;
    setAgent("script", { status: "running" });
    setGlobalError("");
    try {
      const r = await api.script(topic, lengthMinutes, tone);
      const clean = cleanScript(r.script);
      scriptRef.current = clean;
      setScript(clean);
      setAgent("script", { status: "done" });
      return true;
    } catch (e: any) {
      setAgent("script", { status: "error", error: e.message });
      setGlobalError(e.message);
      return false;
    }
  }

  async function runScenes() {
    setAgent("scenes", { status: "running" });
    try {
      const r = await api.scenes(scriptRef.current);
      scenesRef.current = r.scenes || [];
      setScenes(r.scenes || []);
      setAgent("scenes", { status: "done" });
      return true;
    } catch (e: any) {
      setAgent("scenes", { status: "error", error: e.message });
      return false;
    }
  }

  async function runSeo() {
    setAgent("seo", { status: "running" });
    try {
      const r = await api.seo(topic, scriptRef.current);
      setSeo(r);
      setAgent("seo", { status: "done" });
    } catch (e: any) {
      setAgent("seo", { status: "error", error: e.message });
    }
  }

  async function runImagePrompts() {
    setAgent("image_prompts", { status: "running" });
    try {
      const r = await api.imagePrompts(scenesRef.current);
      const prompts = r.image_prompts || [];
      setImagePrompts(prompts);
      setAgent("image_prompts", { status: "done" });
      return prompts;
    } catch (e: any) {
      setAgent("image_prompts", { status: "error", error: e.message });
      return null;
    }
  }

  async function runVideoPrompts() {
    setAgent("video_prompts", { status: "running" });
    try {
      const r = await api.videoPrompts(scenesRef.current);
      setVideoPrompts(r.video_prompts || []);
      setAgent("video_prompts", { status: "done" });
    } catch (e: any) {
      setAgent("video_prompts", { status: "error", error: e.message });
    }
  }

  async function generateOne(p: any): Promise<boolean> {
    const n = p.scene_number;
    setImageStatus((prev) => ({ ...prev, [n]: "loading" }));
    for (let attempt = 0; attempt < IMAGE_MAX_TRIES; attempt++) {
      try {
        const img = await api.generateImage(p.prompt);
        const src = img.url || (img.b64 ? `data:image/png;base64,${img.b64}` : "");
        if (src && (img.b64 || (await preload(src)))) {
          setImages((prev) => ({ ...prev, [n]: img }));
          setImageStatus((prev) => ({ ...prev, [n]: "loaded" }));
          return true;
        }
      } catch {
        // fall through to wait + retry
      }
      if (attempt < IMAGE_MAX_TRIES - 1) await sleep(IMAGE_GAP_MS);
    }
    setImageStatus((prev) => ({ ...prev, [n]: "failed" }));
    return false;
  }

  async function runImages(prompts: any[]) {
    setAgent("images", { status: "running" });
    const initial: Record<number, ImgStatus> = {};
    for (const p of prompts) initial[p.scene_number] = "pending";
    setImageStatus(initial);
    setImages({});

    let anyOk = false;
    for (let i = 0; i < prompts.length; i++) {
      const ok = await generateOne(prompts[i]);
      anyOk = anyOk || ok;
      if (i < prompts.length - 1) await sleep(IMAGE_GAP_MS);
    }
    if (anyOk) setAgent("images", { status: "done" });
    else setAgent("images", { status: "error", error: "No image could be generated. Try Retry on each scene in a minute." });
  }

  async function retryImage(sceneNumber: number) {
    const p = imagePrompts.find((ip: any) => ip.scene_number === sceneNumber);
    if (!p) return;
    await generateOne(p);
  }

  // ----- Regenerate actions: same inputs, ask each agent to try again -----
  async function regenerateScript() {
    const ok = await runScript();
    if (ok) {
      // downstream results are now stale against the new script
      setScenes([]); setSeo(null); setImagePrompts([]); setVideoPrompts([]); setImages({}); setImageStatus({});
      setAgent("scenes", { status: "idle" }); setAgent("seo", { status: "idle" });
      setAgent("image_prompts", { status: "idle" }); setAgent("video_prompts", { status: "idle" }); setAgent("images", { status: "idle" });
    }
  }
  async function regenerateScenes() {
    const ok = await runScenes();
    if (ok) { setImagePrompts([]); setVideoPrompts([]); setImages({}); setImageStatus({}); }
  }
  async function regenerateSeo() { await runSeo(); }
  async function regenerateImagePrompts() {
    const prompts = await runImagePrompts();
    if (prompts) await runImages(prompts);
  }
  async function regenerateVideoPrompts() { await runVideoPrompts(); }
  async function regenerateAllImages() {
    if (imagePrompts.length) await runImages(imagePrompts);
  }

  async function runAll() {
    if (!topic.trim()) return;
    setRunning(true);
    setGlobalError("");
    setScript(""); setScenes([]); setSeo(null); setImagePrompts([]); setVideoPrompts([]); setImages({}); setImageStatus({});
    setAgents({
      script: { status: "running" }, scenes: { status: "waiting" }, seo: { status: "waiting" },
      image_prompts: { status: "waiting" }, video_prompts: { status: "waiting" }, images: { status: "waiting" },
    });

    const ok = await runScript();
    setRunning(false);
    if (ok) { runScenes().then((sok) => { if (sok) { runImagePrompts().then((p) => p && runImages(p)); runVideoPrompts(); } }); runSeo(); }
  }

  const seoCopyText = seo
    ? [`Titles:\n${(seo.titles || []).join("\n")}`, `Description:\n${seo.description || ""}`, `Tags:\n${(seo.tags || []).join(", ")}`].join("\n\n")
    : "";
  const imagePromptsCopyText = imagePrompts.map((p: any) => `#${p.scene_number} ${p.prompt}`).join("\n\n");
  const videoPromptsCopyText = videoPrompts.map((p: any) => `#${p.scene_number} ${p.prompt}`).join("\n\n");

  return (
    <div>
      <PageHeader
        eyebrow="Section 02"
        title="Long-form video pipeline"
        description="One topic in — every agent that can run at once, does. Scenes and SEO start together right after the script; image and video prompts start together right after scenes."
      />
      <div className="p-6 lg:p-8 w-full max-w-[1600px] space-y-6">
        <Panel>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-mute">{script ? "Restored from your last run — edit and re-run any step below." : ""}</span>
            {(script || scenes.length > 0) && (
              <button onClick={clearSavedRun} className="text-xs text-mute hover:text-pink transition-colors">
                Clear saved run
              </button>
            )}
          </div>
          <Field label="Video topic">
            <TextInput placeholder="e.g. Why budget phones are getting better than flagships" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Target length (minutes)">
              <TextInput type="number" value={lengthMinutes} onChange={(e) => setLengthMinutes(Number(e.target.value))} />
            </Field>
            <Field label="Tone">
              <TextInput value={tone} onChange={(e) => setTone(e.target.value)} />
            </Field>
          </div>
          <Button onClick={runAll} disabled={running || !topic.trim()}>
            {running ? "Starting pipeline..." : "Run pipeline"}
          </Button>
        </Panel>

        {globalError && <ErrorNote message={globalError} />}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {AGENT_ORDER.map((id) => (
            <Panel key={id} className="!p-4">
              <div className="flex items-center gap-2 mb-1">
                <StatusDot status={agents[id].status} />
                <span className="text-sm font-medium">{AGENT_META[id].title}</span>
              </div>
              <p className="text-xs text-mute mb-2">{AGENT_META[id].note}</p>
              <StatusLabel status={agents[id].status} />
              {agents[id].status === "error" && <p className="text-xs text-pink mt-1">{agents[id].error}</p>}
            </Panel>
          ))}
        </div>

        {script && (
          <Panel>
            <PanelHeaderRow
              title="Script"
              actions={
                <>
                  <RegenerateButton onClick={regenerateScript} disabled={agents.script.status === "running"} />
                  <DownloadButton filename="script.txt" content={script} />
                  <CopyButton text={script} />
                </>
              }
            />
            <TextArea rows={10} value={script} onChange={(e) => { setScript(e.target.value); scriptRef.current = e.target.value; }} />
          </Panel>
        )}

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {scenes.length > 0 && (
            <Panel>
              <PanelHeaderRow
                title="Scenes"
                actions={
                  <>
                    <RegenerateButton onClick={regenerateScenes} disabled={agents.scenes.status === "running"} />
                    <DownloadButton filename="scenes.srt" content={scenesToSrt(scenes)} label=".srt" />
                    <CopyButton text={scenes.map((s: any) => `#${s.scene_number} ${s.visual_description}`).join("\n\n")} />
                  </>
                }
              />
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {scenes.map((s: any) => (
                  <div key={s.scene_number} className="flex gap-3 border-b border-line last:border-0 pb-3 last:pb-0">
                    <span className="font-display text-mute/60 w-6 shrink-0">{s.scene_number}</span>
                    <div className="text-sm">
                      <p className="text-paper">{s.visual_description}</p>
                      <p className="text-mute text-xs mt-1">~{s.suggested_duration_seconds}s</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {seo && (
            <Panel>
              <PanelHeaderRow
                title="SEO metadata"
                actions={
                  <>
                    <RegenerateButton onClick={regenerateSeo} disabled={agents.seo.status === "running"} />
                    <CopyButton text={seoCopyText} />
                  </>
                }
              />
              <div className="space-y-3 text-sm max-h-96 overflow-y-auto">
                <div>
                  <div className="text-xs text-mute mb-1.5">Title options</div>
                  {seo.titles?.map((t: string, i: number) => <p key={i} className="text-paper">{t}</p>)}
                </div>
                <div>
                  <div className="text-xs text-mute mb-1.5">Tags</div>
                  <div>{seo.tags?.map((t: string, i: number) => <Tag key={i}>{t}</Tag>)}</div>
                </div>
              </div>
            </Panel>
          )}

          {imagePrompts.length > 0 && (
            <Panel>
              <PanelHeaderRow
                title="Image prompts"
                actions={
                  <>
                    <RegenerateButton onClick={regenerateImagePrompts} disabled={agents.image_prompts.status === "running"} />
                    <CopyButton text={imagePromptsCopyText} />
                  </>
                }
              />
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {imagePrompts.map((p: any) => (
                  <div key={p.scene_number} className="text-sm">
                    <span className="text-cyan mr-2">#{p.scene_number}</span>
                    <span className="text-paper/75">{p.prompt}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {videoPrompts.length > 0 && (
            <Panel>
              <PanelHeaderRow
                title="Video-gen prompts"
                actions={
                  <>
                    <RegenerateButton onClick={regenerateVideoPrompts} disabled={agents.video_prompts.status === "running"} />
                    <CopyButton text={videoPromptsCopyText} />
                  </>
                }
              />
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {videoPrompts.map((p: any) => (
                  <div key={p.scene_number} className="text-sm">
                    <span className="text-amber mr-2">#{p.scene_number}</span>
                    <span className="text-paper/75">{p.prompt}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {imagePrompts.length > 0 && Object.keys(imageStatus).length > 0 && (
          <Panel>
            <PanelHeaderRow
              title="Generated images"
              actions={<RegenerateButton onClick={regenerateAllImages} disabled={agents.images.status === "running"} label="Regenerate all" />}
            />
            <p className="text-xs text-mute mb-4">
              Free image service allows about one image every 15 seconds, so they appear one by one.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {imagePrompts.map((p: any) => {
                const n = p.scene_number;
                const status: ImgStatus = imageStatus[n] || "pending";
                const img = images[n];
                const src = img ? img.url || (img.b64 ? `data:image/png;base64,${img.b64}` : "") : "";
                return (
                  <div key={n} className="border border-line rounded-card overflow-hidden">
                    {status === "loaded" && src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={`Scene ${n}`} className="w-full h-36 object-cover" />
                    ) : status === "failed" ? (
                      <div className="w-full h-36 bg-surface/60 flex flex-col items-center justify-center gap-2 text-center px-2">
                        <span className="text-xs text-mute">Image didn't load</span>
                        <button onClick={() => retryImage(n)} className="text-xs text-cyan hover:underline">Retry</button>
                      </div>
                    ) : (
                      <div className="w-full h-36 bg-surface/60 flex flex-col items-center justify-center gap-2">
                        <span className={`w-2 h-2 rounded-full bg-cyan ${status === "loading" ? "pulse-dot" : "opacity-30"}`} />
                        <span className="text-xs text-mute">{status === "loading" ? "Generating..." : "Waiting in queue"}</span>
                      </div>
                    )}
                    <div className="px-3 py-2 text-xs text-mute">Scene {n}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}