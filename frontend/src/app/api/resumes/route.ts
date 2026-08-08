import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse } from "@/lib/authorize";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);
    const resumes = await prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { analyses: true, coverLetters: true } } },
    });
    return Response.json(resumes);
  } catch (err) {
    return authErrorResponse(err);
  }
}

async function extractText(form: FormData): Promise<{ text: string; fileName: string | null }> {
  const pasted = (form.get("text") as string | null)?.trim();
  const file = form.get("file") as File | null;

  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    if (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buf);
      return { text: parsed.text, fileName: file.name };
    }
    return { text: buf.toString("utf-8"), fileName: file.name };
  }
  return { text: pasted ?? "", fileName: null };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const form = await req.formData();
    const title = ((form.get("title") as string) || "Untitled resume").trim();
    const { text, fileName } = await extractText(form);

    if (text.trim().length < 40) {
      return Response.json({ error: "That doesn't look like enough resume content to work with." }, { status: 400 });
    }

    const resume = await prisma.resume.create({
      data: { userId: user.id, title, content: text.trim(), fileName },
    });
    return Response.json(resume, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
