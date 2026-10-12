"use client";
// Static GitHub Pages build: client-side version of src/app/dashboard/page.tsx
// (same markup; data comes from GET /api/resumes instead of Prisma)
import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/demo/RequireAuth";

type ResumeSummary = {
  id: string;
  title: string;
  fileName: string | null;
  analyses: { atsScore: number }[];
  _count: { coverLetters: number };
};

function Resumes() {
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/resumes")
      .then((r) => r.json())
      .then(setResumes);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Your resumes</h1>
        <Link href="/resumes/new" className="btn-primary">Add resume</Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {resumes === null && <p className="col-span-full text-center text-sm text-gray-500">Loading…</p>}
        {resumes?.map((r) => {
          const latest = r.analyses[0];
          return (
            <Link key={r.id} href={`/resumes/view?id=${r.id}`} className="card block hover:border-brand">
              <h2 className="font-bold text-ink">{r.title}</h2>
              <p className="mt-1 text-xs text-gray-500">{r.fileName ?? "Pasted text"} · {r._count.coverLetters} cover letter{r._count.coverLetters === 1 ? "" : "s"}</p>
              {latest && (
                <span className={`badge mt-3 ${latest.atsScore >= 70 ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`}>
                  Last score: {latest.atsScore}/100
                </span>
              )}
            </Link>
          );
        })}
        {resumes?.length === 0 && (
          <p className="col-span-full card text-center text-gray-500">No resumes yet — upload or paste one to get started.</p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Resumes />
    </RequireAuth>
  );
}
