const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.detail || JSON.stringify(j);
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  naming: (description: string, has_niche: boolean = true) =>
    request("/api/naming", { method: "POST", body: JSON.stringify({ description, has_niche }) }),

  script: (topic: string, length_minutes: number, tone: string) =>
    request("/api/pipeline/script", { method: "POST", body: JSON.stringify({ topic, length_minutes, tone }) }),

  scenes: (script: string) =>
    request("/api/pipeline/scenes", { method: "POST", body: JSON.stringify({ script }) }),

  imagePrompts: (scenes: any[]) =>
    request("/api/pipeline/image-prompts", { method: "POST", body: JSON.stringify({ scenes }) }),

  videoPrompts: (scenes: any[]) =>
    request("/api/pipeline/video-prompts", { method: "POST", body: JSON.stringify({ scenes }) }),

  seo: (topic: string, script: string) =>
    request("/api/pipeline/seo", { method: "POST", body: JSON.stringify({ topic, script }) }),

  generateImage: (prompt: string, width = 1024, height = 576, provider?: string) =>
    request("/api/pipeline/generate-image", { method: "POST", body: JSON.stringify({ prompt, width, height, provider }) }),

  rewrite: (script: string, notes: string) =>
    request("/api/rewrite", { method: "POST", body: JSON.stringify({ script, notes }) }),

  transcribe: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/transcribe", { method: "POST", body: form });
  },
  transcribeLink: (url: string) =>
    request("/api/transcribe/link", { method: "POST", body: JSON.stringify({ url }) }),
  auto: (message: string) =>
    request("/api/auto", { method: "POST", body: JSON.stringify({ message }) }),
};
