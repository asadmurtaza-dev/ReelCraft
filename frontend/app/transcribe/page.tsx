"use client";
import { useState, useRef } from "react";
import { PageHeader, Panel, Button, TextInput, Field, LoadingLine, ErrorNote, CopyButton, DownloadButton, PanelHeaderRow } from "@/components/ui";
import { api } from "@/lib/api";
import { cleanScript } from "@/lib/text";

type Mode = "upload" | "link";

export default function TranscribePage() {
  const [mode, setMode] = useState<Mode>("link");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canRun = mode === "upload" ? !!file : url.trim().length > 0;

  async function run() {
    if (!canRun) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = mode === "upload" ? await api.transcribe(file as File) : await api.transcribeLink(url.trim());
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Section 04"
        title="Video → script extraction"
        description="Upload a video or audio file, or paste a link. YouTube links use the video's captions when available, so they finish in seconds."
      />
      <div className="p-6 lg:p-10 max-w-3xl space-y-6">
        <Panel>
          <div className="flex gap-1 mb-5 p-1 rounded-pill border border-line w-fit">
            {(["link", "upload"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-pill text-sm font-medium transition-colors ${
                  mode === m ? "bg-cyan text-ink" : "text-mute hover:text-paper"
                }`}
              >
                {m === "link" ? "Paste a link" : "Upload a file"}
              </button>
            ))}
          </div>

          {mode === "link" ? (
            <Field label="Video link (YouTube, Instagram, or a direct video URL)">
              <TextInput
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") run();
                }}
              />
            </Field>
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              className="border border-dashed border-line rounded-card py-12 text-center cursor-pointer hover:border-cyan transition-colors"
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*,audio/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-paper">{file ? file.name : "Click to choose a video or audio file"}</p>
              <p className="text-xs text-mute mt-1">
                {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "MP4, MOV, MP3, WAV... (demo cap: 50MB)"}
              </p>
            </div>
          )}

          <div className="mt-4">
            <Button onClick={run} disabled={loading || !canRun}>
              {loading ? "Working..." : "Extract script"}
            </Button>
          </div>
        </Panel>

        {loading && (
          <LoadingLine
            text={mode === "link" ? "Fetching the transcript and cleaning it up..." : "Listening and cleaning up the transcript..."}
          />
        )}
        {error && <ErrorNote message={error} />}

        {result && (
          <Panel>
            <PanelHeaderRow
              title="Extracted script"
              actions={
                <>
                  <DownloadButton filename="transcript.txt" content={cleanScript(result.script)} />
                  <CopyButton text={cleanScript(result.script)} />
                </>
              }
            />
            <p className="text-xs text-mute mb-4 break-all">
              {result.filename}
              {result.method === "captions" && " · from the video's captions"}
              {result.method === "audio" && " · transcribed from audio"}
            </p>
            <div className="text-sm text-paper/80 whitespace-pre-wrap leading-relaxed">{cleanScript(result.script)}</div>
          </Panel>
        )}
      </div>
    </div>
  );
}