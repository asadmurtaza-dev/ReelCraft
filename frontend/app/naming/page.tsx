"use client";
import { useState } from "react";
import { PageHeader, Panel, Button, TextArea, Field, LoadingLine, ErrorNote, Tag, CopyButton, RegenerateButton, PanelHeaderRow } from "@/components/ui";
import { api } from "@/lib/api";

export default function NamingPage() {
  const [hasNiche, setHasNiche] = useState(true);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  async function run() {
    if (!description.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.naming(description, hasNiche);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    // same inputs, ask for a fresh set — useful when the first batch didn't land
    await run();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Section 01"
        title="Channel naming & branding"
        description="Already know your niche? Get straight to names. Starting from scratch? The agent helps you find a niche first, then builds the branding around it."
      />
      <div className="p-10 max-w-3xl space-y-6">
        <Panel>
          {/* mode toggle */}
          <div className="flex gap-2 mb-5 p-1 rounded-pill border border-line w-fit">
            <button
              onClick={() => setHasNiche(true)}
              className={`px-4 py-2 rounded-pill text-sm font-medium transition-all ${
                hasNiche ? "bg-gradient-to-r from-cyan to-violet text-ink" : "text-mute hover:text-paper"
              }`}
            >
              I have a niche
            </button>
            <button
              onClick={() => setHasNiche(false)}
              className={`px-4 py-2 rounded-pill text-sm font-medium transition-all ${
                !hasNiche ? "bg-gradient-to-r from-cyan to-violet text-ink" : "text-mute hover:text-paper"
              }`}
            >
              Help me pick one
            </button>
          </div>

          {hasNiche ? (
            <Field label="Describe the channel you're planning">
              <TextArea
                rows={5}
                placeholder="e.g. Urdu-language tech reviews for students in Pakistan, budget phones and laptops, casual but informative tone..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          ) : (
            <Field label="Tell the agent about yourself — interests, skills, experience, personality, anything">
              <TextArea
                rows={5}
                placeholder="e.g. I'm good at explaining things simply, I've worked in finance for 3 years, I like gaming and fitness, I'm comfortable on camera but not into vlogging..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          )}

          <Button onClick={run} disabled={loading || !description.trim()}>
            {loading ? "Generating..." : hasNiche ? "Generate names" : "Find my niche"}
          </Button>
        </Panel>

        {loading && <LoadingLine text={hasNiche ? "Researching naming angles..." : "Exploring niche directions for you..."} />}
        {error && <ErrorNote message={error} />}

        {result && (
          <div className="space-y-6">
            {result.niche_options?.length > 0 && (
              <Panel glow="violet">
                <h3 className="font-display text-base mb-4">Niche directions to consider</h3>
                <div className="space-y-4">
                  {result.niche_options.map((n: any, i: number) => (
                    <div key={i} className="border-b border-line last:border-0 pb-4 last:pb-0">
                      <span className="font-display text-violet">{n.niche}</span>
                      <p className="text-sm text-paper/75 mt-1">{n.why}</p>
                    </div>
                  ))}
                </div>
                {result.recommended_niche && (
                  <div className="mt-4 pt-4 border-t border-line text-sm">
                    <span className="text-cyan">Going with: </span>
                    <span className="text-paper/75">{result.recommended_niche}</span>
                  </div>
                )}
              </Panel>
            )}

            <Panel>
              <PanelHeaderRow
                title="Name options"
                actions={
                  <>
                    <RegenerateButton onClick={regenerate} disabled={loading} />
                    <CopyButton text={(result.names || []).map((n: any) => `${n.name} (${n.handle_suggestion}) — ${n.why_it_works}`).join("\n\n")} />
                  </>
                }
              />
              <div className="space-y-4">
                {result.names?.map((n: any, i: number) => (
                  <div key={i} className="border-b border-line last:border-0 pb-4 last:pb-0">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-lg text-cyan">{n.name}</span>
                      <span className="text-xs text-mute">{n.handle_suggestion}</span>
                    </div>
                    <p className="text-sm text-paper/75 mt-1">{n.why_it_works}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <h3 className="font-display text-base mb-3">Tagline options</h3>
              <ul className="space-y-1.5 text-sm text-paper">
                {result.tagline_options?.map((t: string, i: number) => (
                  <li key={i} className="text-paper/75">— {t}</li>
                ))}
              </ul>
            </Panel>

            <Panel>
              <PanelHeaderRow title="Channel description" actions={<CopyButton text={result.channel_description || ""} />} />
              <p className="text-sm text-paper/75 leading-relaxed">{result.channel_description}</p>
            </Panel>

            <Panel>
              <h3 className="font-display text-base mb-3">Content pillars</h3>
              <div>
                {result.content_pillars?.map((p: string, i: number) => (
                  <Tag key={i}>{p}</Tag>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}