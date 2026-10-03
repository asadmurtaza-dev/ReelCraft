"use client";
import { useState } from "react";
import { PageHeader, Panel, Button, TextArea, Field, LoadingLine, ErrorNote, Tag, CopyButton, DownloadButton, RegenerateButton, PanelHeaderRow } from "@/components/ui";
import { api } from "@/lib/api";
import { cleanScript } from "@/lib/text";

export default function RewritePage() {
  const [script, setScript] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  async function run() {
    if (!script.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.rewrite(script, notes);
      if (data.rewritten_script) data.rewritten_script = cleanScript(data.rewritten_script);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    // same original script + notes, ask for another pass
    await run();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Section 03"
        title="Script rewrite & optimize"
        description="Paste a script you already have. The agent tightens pacing and hooks, then generates fresh title/description/tags for the improved version."
      />
      <div className="p-10 max-w-3xl space-y-6">
        <Panel>
          <Field label="Existing script">
            <TextArea rows={10} placeholder="Paste your draft script here..." value={script} onChange={(e) => setScript(e.target.value)} />
          </Field>
          <Field label="Any specific notes? (optional)">
            <TextArea rows={2} placeholder="e.g. keep it under 5 minutes, make the hook punchier" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button onClick={run} disabled={loading || !script.trim()}>
            {loading ? "Rewriting..." : "Rewrite script"}
          </Button>
        </Panel>

        {loading && <LoadingLine text="Tightening pacing and hooks..." />}
        {error && <ErrorNote message={error} />}

        {result && (
          <div className="space-y-6">
            <Panel>
              <PanelHeaderRow
                title="Rewritten script"
                actions={
                  <>
                    <RegenerateButton onClick={regenerate} disabled={loading} />
                    <DownloadButton filename="rewritten-script.txt" content={result.rewritten_script || ""} />
                    <CopyButton text={result.rewritten_script || ""} />
                  </>
                }
              />
              <div className="text-sm text-paper/75 whitespace-pre-wrap leading-relaxed">{result.rewritten_script}</div>
            </Panel>

            {result.metadata && (
              <Panel>
                <PanelHeaderRow
                  title="Fresh metadata"
                  actions={
                    <CopyButton
                      text={[
                        `Titles:\n${(result.metadata.titles || []).join("\n")}`,
                        `Description:\n${result.metadata.description || ""}`,
                        `Tags:\n${(result.metadata.tags || []).join(", ")}`,
                      ].join("\n\n")}
                    />
                  }
                />
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-xs text-mute mb-1.5">Title options</div>
                    {result.metadata.titles?.map((t: string, i: number) => <p key={i} className="text-paper">{t}</p>)}
                  </div>
                  <div>
                    <div className="text-xs text-mute mb-1.5">Description</div>
                    <p className="text-paper/75 leading-relaxed">{result.metadata.description}</p>
                  </div>
                  <div>
                    <div className="text-xs text-mute mb-1.5">Tags</div>
                    <div>{result.metadata.tags?.map((t: string, i: number) => <Tag key={i}>{t}</Tag>)}</div>
                  </div>
                </div>
              </Panel>
            )}
          </div>
        )}
      </div>
    </div>
  );
}