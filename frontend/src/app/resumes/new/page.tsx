"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewResumePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"paste" | "upload">("upload");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData();
    form.append("title", title || "Untitled resume");
    if (mode === "paste") form.append("text", text);
    if (mode === "upload" && file) form.append("file", file);

    const res = await fetch("/api/resumes", { method: "POST", body: form });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Could not save resume");
      return;
    }
    router.push(`/resumes/${body.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold text-ink">Add a resume</h1>
      <p className="mt-1 text-sm text-gray-600">Upload an existing PDF/text file, or paste it in.</p>

      <div className="mt-6 flex gap-2">
        <button type="button" onClick={() => setMode("upload")} className={mode === "upload" ? "btn-primary !py-1.5 !px-3 text-xs" : "btn-outline !py-1.5 !px-3 text-xs"}>
          Upload file
        </button>
        <button type="button" onClick={() => setMode("paste")} className={mode === "paste" ? "btn-primary !py-1.5 !px-3 text-xs" : "btn-outline !py-1.5 !px-3 text-xs"}>
          Paste text
        </button>
      </div>

      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        <div>
          <label className="label">Title (for your own reference)</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Software Engineer resume — 2026" />
        </div>

        {mode === "upload" ? (
          <div>
            <label className="label">Resume file</label>
            <input required type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input" />
            <p className="mt-1 text-xs text-gray-500">PDF or plain text.</p>
          </div>
        ) : (
          <div>
            <label className="label">Resume text</label>
            <textarea required rows={10} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your resume content here…" />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Saving…" : "Save resume"}</button>
      </form>
    </div>
  );
}
