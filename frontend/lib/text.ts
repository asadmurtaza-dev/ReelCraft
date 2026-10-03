export function cleanScript(text: string): string {
  if (!text) return text;
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") 
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1") 
    .replace(/^#{1,6}\s*/gm, "") 
    .replace(/^[-*]\s+/gm, "") 
    .replace(/[ \t]+\n/g, "\n") 
    .trim();
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function srtTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const ms = Math.round((clamped % 1) * 1000);
  const s = Math.floor(clamped) % 60;
  const m = Math.floor(clamped / 60) % 60;
  const h = Math.floor(clamped / 3600);
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export function scenesToSrt(
  scenes: { scene_number: number; script_excerpt?: string; visual_description?: string; suggested_duration_seconds?: number }[]
): string {
  let cursor = 0;
  return scenes
    .map((s, i) => {
      const dur = s.suggested_duration_seconds || 5;
      const start = srtTimestamp(cursor);
      cursor += dur;
      const end = srtTimestamp(cursor);
      const text = (s.script_excerpt || s.visual_description || "").trim();
      return `${i + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join("\n");
}

export function loadLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable silently skip, it's a convenience feature
  }
}

export function clearLocal(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}