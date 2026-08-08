import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ResumeWorkspace from "./ResumeWorkspace";

export default async function ResumeDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const resume = await prisma.resume.findUnique({
    where: { id: params.id },
    include: {
      analyses: { orderBy: { createdAt: "desc" } },
      coverLetters: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!resume) notFound();
  if (resume.userId !== session.user.id) redirect("/dashboard");

  const analyses = resume.analyses.map((a) => ({
    id: a.id,
    jobDescription: a.jobDescription,
    atsScore: a.atsScore,
    matchedKeywords: JSON.parse(a.matchedKeywords) as string[],
    missingKeywords: JSON.parse(a.missingKeywords) as string[],
    suggestions: JSON.parse(a.suggestions) as string[],
    summary: a.summary,
    createdAt: a.createdAt.toISOString(),
  }));

  const coverLetters = resume.coverLetters.map((c) => ({
    id: c.id,
    jobDescription: c.jobDescription,
    subjectLine: c.subjectLine,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <ResumeWorkspace
      resume={{ id: resume.id, title: resume.title, content: resume.content }}
      initialAnalyses={analyses}
      initialCoverLetters={coverLetters}
    />
  );
}
