"use client";
// Static GitHub Pages build: replaces src/app/resumes/[id]/page.tsx. Static
// export can't pre-render per-user ids, so the id travels as ?id= instead.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RequireAuth from "@/demo/RequireAuth";
import ResumeWorkspace from "./ResumeWorkspace";

type Props = React.ComponentProps<typeof ResumeWorkspace>;

function ResumeView() {
  const id = useSearchParams().get("id");
  const [data, setData] = useState<Props | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) {
      setMissing(true);
      return;
    }
    fetch(`/api/resumes/${encodeURIComponent(id)}`).then(async (res) => {
      if (!res.ok) {
        setMissing(true);
        return;
      }
      const r = await res.json();
      // same JSON decoding the server page did
      setData({
        resume: { id: r.id, title: r.title, content: r.content },
        initialAnalyses: r.analyses.map((a: any) => ({
          id: a.id,
          jobDescription: a.jobDescription,
          atsScore: a.atsScore,
          matchedKeywords: JSON.parse(a.matchedKeywords),
          missingKeywords: JSON.parse(a.missingKeywords),
          suggestions: JSON.parse(a.suggestions),
          summary: a.summary,
          createdAt: a.createdAt,
        })),
        initialCoverLetters: r.coverLetters.map((c: any) => ({
          id: c.id,
          jobDescription: c.jobDescription,
          subjectLine: c.subjectLine,
          body: c.body,
          createdAt: c.createdAt,
        })),
      });
    });
  }, [id]);

  if (missing) return <p className="mx-auto max-w-3xl px-6 py-16 text-center text-gray-500">Resume not found.</p>;
  if (!data) return <p className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-gray-500">Loading…</p>;
  return <ResumeWorkspace key={data.resume.id} {...data} />;
}

export default function ResumePage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <ResumeView />
      </Suspense>
    </RequireAuth>
  );
}
