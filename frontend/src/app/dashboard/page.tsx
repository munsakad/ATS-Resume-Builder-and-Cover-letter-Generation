import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const resumes = await prisma.resume.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { coverLetters: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Your resumes</h1>
        <Link href="/resumes/new" className="btn-primary">Add resume</Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {resumes.map((r) => {
          const latest = r.analyses[0];
          return (
            <Link key={r.id} href={`/resumes/${r.id}`} className="card block hover:border-brand">
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
        {resumes.length === 0 && (
          <p className="col-span-full card text-center text-gray-500">No resumes yet — upload or paste one to get started.</p>
        )}
      </div>
    </div>
  );
}
