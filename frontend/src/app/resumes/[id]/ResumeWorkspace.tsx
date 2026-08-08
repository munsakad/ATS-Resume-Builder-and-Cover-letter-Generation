"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DownloadPdfButton from "@/components/DownloadPdfButton";
import { ResumePdfDocument, CoverLetterPdfDocument } from "@/components/PdfDocs";

type Analysis = {
  id: string;
  jobDescription: string;
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  summary: string;
  createdAt: string;
};
type CoverLetter = { id: string; jobDescription: string; subjectLine: string; body: string; createdAt: string };

export default function ResumeWorkspace({
  resume,
  initialAnalyses,
  initialCoverLetters,
}: {
  resume: { id: string; title: string; content: string };
  initialAnalyses: Analysis[];
  initialCoverLetters: CoverLetter[];
}) {
  const router = useRouter();
  const [content, setContent] = useState(resume.content);
  const [savingContent, setSavingContent] = useState(false);
  const [editingContent, setEditingContent] = useState(false);

  const [jobDescription, setJobDescription] = useState("");
  const [analyses, setAnalyses] = useState(initialAnalyses);
  const [coverLetters, setCoverLetters] = useState(initialCoverLetters);
  const [scoring, setScoring] = useState(false);
  const [writingLetter, setWritingLetter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = analyses[0];

  async function saveContent() {
    setSavingContent(true);
    const res = await fetch(`/api/resumes/${resume.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSavingContent(false);
    if (res.ok) {
      setEditingContent(false);
      router.refresh();
    }
  }

  async function runScore() {
    if (jobDescription.trim().length < 20) {
      setError("Paste a fuller job description first (at least a couple sentences).");
      return;
    }
    setScoring(true);
    setError(null);
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId: resume.id, jobDescription }),
    });
    const body = await res.json();
    setScoring(false);
    if (!res.ok) {
      setError(body.error ?? "Could not score resume");
      return;
    }
    setAnalyses((a) => [
      { ...body, matchedKeywords: JSON.parse(body.matchedKeywords), missingKeywords: JSON.parse(body.missingKeywords), suggestions: JSON.parse(body.suggestions), createdAt: body.createdAt },
      ...a,
    ]);
  }

  async function writeCoverLetter() {
    if (jobDescription.trim().length < 20) {
      setError("Paste a fuller job description first (at least a couple sentences).");
      return;
    }
    setWritingLetter(true);
    setError(null);
    const res = await fetch("/api/cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId: resume.id, jobDescription }),
    });
    const body = await res.json();
    setWritingLetter(false);
    if (!res.ok) {
      setError(body.error ?? "Could not generate cover letter");
      return;
    }
    setCoverLetters((c) => [body, ...c]);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-ink">{resume.title}</h1>

      <div className="mt-6 card">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink">Resume content</h2>
          <div className="flex gap-2">
            <DownloadPdfButton document={<ResumePdfDocument title={resume.title} content={content} />} fileName={`${resume.title}.pdf`} label="Export PDF" />
            {!editingContent && <button onClick={() => setEditingContent(true)} className="btn-outline !py-1.5 !px-3 text-xs">Edit</button>}
          </div>
        </div>
        {editingContent ? (
          <div className="mt-3 space-y-2">
            <textarea rows={14} className="input font-mono text-xs" value={content} onChange={(e) => setContent(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={saveContent} disabled={savingContent} className="btn-primary !py-1.5 !px-3 text-xs">{savingContent ? "Saving…" : "Save"}</button>
              <button onClick={() => { setContent(resume.content); setEditingContent(false); }} className="btn-outline !py-1.5 !px-3 text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-sm text-gray-700">{content}</pre>
        )}
      </div>

      <div className="mt-6 card">
        <h2 className="font-bold text-ink">Target job description</h2>
        <p className="mt-1 text-sm text-gray-600">Paste a job posting, then score your match or generate a tailored cover letter.</p>
        <textarea rows={6} className="input mt-3" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description here…" />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-3 flex gap-3">
          <button onClick={runScore} disabled={scoring} className="btn-primary">{scoring ? "Scoring…" : "Score ATS match"}</button>
          <button onClick={writeCoverLetter} disabled={writingLetter} className="btn-outline">{writingLetter ? "Writing…" : "Generate cover letter"}</button>
        </div>
      </div>

      {latest && (
        <div className="mt-6 card">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">Latest ATS score</h2>
            <span className={`badge text-base ${latest.atsScore >= 70 ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`}>{latest.atsScore}/100</span>
          </div>
          <p className="mt-2 text-sm text-gray-700">{latest.summary}</p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Matched keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {latest.matchedKeywords.map((k) => <span key={k} className="badge bg-ok/10 text-ok">{k}</span>)}
              </div>
            </div>
            <div>
              <p className="label">Missing keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {latest.missingKeywords.map((k) => <span key={k} className="badge bg-danger/10 text-danger">{k}</span>)}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="label">Suggestions</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
              {latest.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}

      {coverLetters.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-ink">Cover letters</h2>
          <div className="mt-3 space-y-3">
            {coverLetters.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-ink">{c.subjectLine}</p>
                  <DownloadPdfButton document={<CoverLetterPdfDocument subjectLine={c.subjectLine} body={c.body} />} fileName={`Cover letter - ${resume.title}.pdf`} label="Export PDF" />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analyses.length > 1 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-ink">Previous scores</h2>
          <div className="mt-3 space-y-2">
            {analyses.slice(1).map((a) => (
              <div key={a.id} className="card !p-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</p>
                <span className={`badge ${a.atsScore >= 70 ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`}>{a.atsScore}/100</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
