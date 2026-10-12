// In-browser stand-in for the resume builder's API routes (src/app/api/*)
// and the FastAPI service behind them, used only by the static GitHub Pages build.
//  - register / resumes / analyses / cover letters: same validation and
//    ownership rules, stored in this visitor's localStorage instead of SQLite
//  - PDF uploads: text is extracted in the browser with pdf.js (pdf-parse needs Node)
//  - scoring + cover letters: the prompts and schemas from backend/gemini_service.py,
//    sent straight to Gemini with the visitor's own key, then validated with the
//    zod schemas from src/lib/aiBackend.ts
import { z } from "zod";
import { HttpError, checkPassword, createAuth, createDb, handleNextAuth, hashPassword, installFetch, json, newId } from "./runtime.js";
import { GeminiNotConfigured, generateJson, hasKey } from "./gemini.js";
import { mountDemoPanel } from "./demoPanel.js";

const REPO_URL = "https://github.com/munsakad/ATS-Resume-Builder-and-Cover-letter-Generation";

const SAMPLE_RESUME = [
  "Alex Rivera — Frontend Engineer (sample resume for this demo)",
  "alex.rivera@example.com · Austin, TX",
  "",
  "SUMMARY",
  "Frontend engineer with 3 years building React and TypeScript web apps, focused on accessible, fast UIs.",
  "",
  "EXPERIENCE",
  "Frontend Engineer, Example Analytics (2023–present)",
  "- Built a React + TypeScript dashboard used by 2,000 customers; cut bundle size 35% with code splitting.",
  "- Led migration from REST polling to WebSockets for live charts.",
  "- Wrote unit tests with Jest and React Testing Library; added Playwright smoke tests to CI.",
  "Web Developer Intern, Sample Studio (2022)",
  "- Shipped responsive marketing pages with Next.js and Tailwind CSS.",
  "",
  "SKILLS",
  "JavaScript, TypeScript, React, Next.js, HTML, CSS, Tailwind CSS, Jest, Git, REST APIs, Figma",
].join("\n");

// prisma/seed.ts (plus one sample resume so the demo has something to score)
const db = createDb("resumeai", {
  users: [{ id: "seed-sam", name: "Sam Lee", email: "sam@resumeai.dev", seedPassword: "Student123!" }],
  resumes: [
    {
      id: "sample-resume",
      userId: "seed-sam",
      title: "Sample — Frontend Engineer resume",
      content: SAMPLE_RESUME,
      fileName: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  analyses: [],
  coverLetters: [],
});
const auth = createAuth("resumeai");

async function authorize(email, password) {
  const user = db.read().users.find((u) => u.email === email.toLowerCase().trim());
  if (!user || !(await checkPassword(user, password))) return null;
  return { id: user.id, name: user.name, email: user.email };
}

// ---- backend/gemini_service.py ----------------------------------------------------
const SCORE_SCHEMA = {
  type: "OBJECT",
  properties: {
    ats_score: { type: "INTEGER", description: "0-100 match score between resume and job description" },
    matched_keywords: { type: "ARRAY", items: { type: "STRING" } },
    missing_keywords: { type: "ARRAY", items: { type: "STRING" } },
    suggestions: { type: "ARRAY", items: { type: "STRING" }, description: "3-6 concrete, actionable edits" },
    summary: { type: "STRING", description: "One or two sentence overall assessment" },
  },
  required: ["ats_score", "matched_keywords", "missing_keywords", "suggestions", "summary"],
};

const COVER_LETTER_SCHEMA = {
  type: "OBJECT",
  properties: {
    subject_line: { type: "STRING" },
    body: { type: "STRING", description: "Full cover letter body, 3-5 paragraphs, plain text with \\n\\n between paragraphs" },
  },
  required: ["subject_line", "body"],
};

const Q3 = '"' + '"' + '"';
const block = (label, text, max) => label + ":\n" + Q3 + "\n" + text.slice(0, max) + "\n" + Q3;

function scorePrompt(resume, jd) {
  return (
    "You are an ATS (Applicant Tracking System) resume screener.\n" +
    "Compare the resume below against the job description and produce:\n" +
    "- ats_score: an integer 0-100 estimating how well this resume would score in\n" +
    "  an automated ATS keyword/skills match against this job description.\n" +
    "- matched_keywords: important skills/terms from the job description that\n" +
    "  ARE present in the resume.\n" +
    "- missing_keywords: important skills/terms from the job description that are\n" +
    "  NOT present in the resume and should be added if genuinely true of the\n" +
    "  candidate.\n" +
    "- suggestions: 3-6 concrete, specific edits to improve the ATS match\n" +
    "  (e.g. \"Add 'Kubernetes' to your skills section\" not vague advice).\n" +
    "- summary: one or two sentence overall assessment.\n\n" +
    "Be honest and specific — do not inflate the score.\n\n" +
    block("RESUME", resume, 8000) + "\n\n" + block("JOB DESCRIPTION", jd, 4000)
  );
}

function coverLetterPrompt(resume, jd, tone) {
  return (
    "Write a " + tone + " cover letter for the candidate below, tailored\n" +
    "to the job description. Base every claim strictly on what's actually in the\n" +
    "resume — never invent experience, employers, or skills not present in it.\n" +
    "3-5 paragraphs. Return the body as plain text with blank lines between\n" +
    "paragraphs (no markdown, no placeholders like [Company Name] — infer the\n" +
    "company/role name from the job description text itself if possible,\n" +
    "otherwise write around it naturally).\n\n" +
    block("RESUME", resume, 8000) + "\n\n" + block("JOB DESCRIPTION", jd, 4000)
  );
}

// ---- src/lib/aiBackend.ts response validation ---------------------------------------------
const ScoreSchema = z.object({
  ats_score: z.number().int().min(0).max(100),
  matched_keywords: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  suggestions: z.array(z.string()),
  summary: z.string(),
});
const CoverLetterSchema = z.object({ subject_line: z.string(), body: z.string() });

async function gemini(prompt, schema) {
  try {
    return await generateJson("", prompt, schema);
  } catch (err) {
    if (err instanceof GeminiNotConfigured) {
      throw new HttpError(502, "This needs a Gemini API key in the static demo. Add yours in the demo panel (bottom-right).");
    }
    throw new HttpError(502, err.message);
  }
}

// Offline fallback, clearly labelled: plain keyword overlap, not an AI score
const STOP_WORDS = new Set(
  ("the and for with you your our are will that this from have who can all able into team work using use " +
    "including strong experience years year plus such about across within must should may also etc job role " +
    "we they them their its not but has been being per new more most other any each what when where how why " +
    "a an to of in on at as or be is by it if so do").split(" ")
);
function keywordEstimate(resume, jd) {
  const counts = new Map();
  for (const raw of jd.match(/[A-Za-z][A-Za-z0-9+#.-]*[A-Za-z0-9+#]/g) || []) {
    const word = raw.toLowerCase();
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  const terms = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w]) => w);
  const text = resume.toLowerCase();
  const matched = terms.filter((t) => text.includes(t));
  const missing = terms.filter((t) => !text.includes(t));
  return {
    ats_score: terms.length ? Math.round((matched.length / terms.length) * 100) : 0,
    matched_keywords: matched,
    missing_keywords: missing,
    suggestions: missing.slice(0, 4).map((k) => "Add \"" + k + "\" to your resume if it genuinely reflects your experience."),
    summary:
      "Offline estimate from simple keyword overlap, not Gemini. Add a Gemini API key in the demo panel " +
      "for the real ATS analysis.",
  };
}

// ---- PDF text extraction (browser replacement for pdf-parse) ---------------------------------
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
let pdfjsPromise;
function loadPdfJs() {
  pdfjsPromise =
    pdfjsPromise ||
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PDFJS + "pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new HttpError(500, "Could not load the PDF reader"));
      document.head.appendChild(script);
    });
  return pdfjsPromise;
}

async function extractText(form) {
  const pasted = (form.get("text") || "").toString().trim();
  const file = form.get("file");
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const content = await (await doc.getPage(i)).getTextContent();
        pages.push(content.items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join(""));
      }
      return { text: pages.join("\n"), fileName: file.name };
    }
    return { text: await file.text(), fileName: file.name };
  }
  return { text: pasted, fileName: null };
}

// ---- route handlers (src/app/api/*) ----------------------------------------------------------
const registerInput = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) });
const analyzeInput = z.object({ resumeId: z.string(), jobDescription: z.string().min(20) });
const letterInput = z.object({ resumeId: z.string(), jobDescription: z.string().min(20), tone: z.string().optional() });
const updateInput = z.object({ title: z.string().min(1).optional(), content: z.string().min(40).optional() });

function ownedResume(id, user, notFound = "Not found") {
  const resume = db.read().resumes.find((r) => r.id === id);
  if (!resume) throw new HttpError(404, notFound);
  if (resume.userId !== user.id) throw new HttpError(403, "This isn't yours");
  return resume;
}
const newestFirst = (a, b) => b.createdAt.localeCompare(a.createdAt);
const analysesFor = (id) => db.read().analyses.filter((a) => a.resumeId === id).sort(newestFirst);
const lettersFor = (id) => db.read().coverLetters.filter((c) => c.resumeId === id).sort(newestFirst);

async function handle(path, init) {
  const method = (init.method || "GET").toUpperCase();
  const body = () => JSON.parse(init.body || "{}");
  let m;

  if (path.startsWith("/api/auth/")) return handleNextAuth(path.slice("/api/auth/".length), init, auth, authorize);

  if (path === "/api/register" && method === "POST") {
    const input = registerInput.parse(body());
    const email = input.email.toLowerCase().trim();
    if (db.read().users.some((u) => u.email === email))
      return json({ error: "An account with that email already exists" }, 409);
    const passwordHash = await hashPassword(input.password);
    db.write((d) => d.users.push({ id: newId(), name: input.name, email, passwordHash, createdAt: new Date().toISOString() }));
    return json({ ok: true }, 201);
  }

  if (path === "/api/resumes") {
    const user = auth.requireUser();
    if (method === "POST") {
      const form = init.body;
      const title = ((form.get("title") || "").toString() || "Untitled resume").trim();
      const { text, fileName } = await extractText(form);
      if (text.trim().length < 40)
        return json({ error: "That doesn't look like enough resume content to work with." }, 400);
      const now = new Date().toISOString();
      const resume = { id: newId(), userId: user.id, title, content: text.trim(), fileName, createdAt: now, updatedAt: now };
      db.write((d) => d.resumes.push(resume));
      return json(resume, 201);
    }
    return json(
      db.read().resumes
        .filter((r) => r.userId === user.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((r) => {
          const analyses = analysesFor(r.id);
          return {
            ...r,
            _count: { analyses: analyses.length, coverLetters: lettersFor(r.id).length },
            analyses: analyses.slice(0, 1), // the dashboard shows the latest score
          };
        })
    );
  }

  if ((m = path.match(/^\/api\/resumes\/([^/]+)$/))) {
    const user = auth.requireUser();
    const resume = ownedResume(m[1], user);
    if (method === "GET") return json({ ...resume, analyses: analysesFor(resume.id), coverLetters: lettersFor(resume.id) });
    if (method === "PATCH") {
      const input = updateInput.parse(body());
      return json(
        db.write((d) => {
          const r = d.resumes.find((x) => x.id === resume.id);
          Object.assign(r, input, { updatedAt: new Date().toISOString() });
          return r;
        })
      );
    }
    if (method === "DELETE") {
      db.write((d) => {
        d.resumes = d.resumes.filter((r) => r.id !== resume.id);
        d.analyses = d.analyses.filter((a) => a.resumeId !== resume.id); // onDelete: Cascade
        d.coverLetters = d.coverLetters.filter((c) => c.resumeId !== resume.id);
      });
      return json({ ok: true });
    }
  }

  if (path === "/api/analyze" && method === "POST") {
    const user = auth.requireUser();
    const input = analyzeInput.parse(body());
    const resume = ownedResume(input.resumeId, user, "Resume not found");
    let result = hasKey() ? await gemini(scorePrompt(resume.content, input.jobDescription), SCORE_SCHEMA) : keywordEstimate(resume.content, input.jobDescription);
    if (typeof result.ats_score === "number") result = { ...result, ats_score: Math.max(0, Math.min(100, Math.round(result.ats_score))) }; // schemas.py clamp
    const parsed = ScoreSchema.safeParse(result);
    if (!parsed.success) throw new HttpError(502, "AI backend response didn't match the expected format");
    const analysis = {
      id: newId(),
      resumeId: resume.id,
      jobDescription: input.jobDescription,
      atsScore: parsed.data.ats_score,
      matchedKeywords: JSON.stringify(parsed.data.matched_keywords),
      missingKeywords: JSON.stringify(parsed.data.missing_keywords),
      suggestions: JSON.stringify(parsed.data.suggestions),
      summary: parsed.data.summary,
      createdAt: new Date().toISOString(),
    };
    db.write((d) => d.analyses.push(analysis));
    return json(analysis, 201);
  }

  if (path === "/api/cover-letter" && method === "POST") {
    const user = auth.requireUser();
    const input = letterInput.parse(body());
    const resume = ownedResume(input.resumeId, user, "Resume not found");
    const data = await gemini(coverLetterPrompt(resume.content, input.jobDescription, input.tone || "professional"), COVER_LETTER_SCHEMA);
    const parsed = CoverLetterSchema.safeParse(data);
    if (!parsed.success) throw new HttpError(502, "AI backend response didn't match the expected format");
    const letter = {
      id: newId(),
      resumeId: resume.id,
      jobDescription: input.jobDescription,
      subjectLine: parsed.data.subject_line,
      body: parsed.data.body,
      createdAt: new Date().toISOString(),
    };
    db.write((d) => d.coverLetters.push(letter));
    return json(letter, 201);
  }

  return json({ error: "Not found" }, 404);
}

let installed = false;
// Called at module load (before next-auth fetches the session); no DOM changes here
export function installDemo() {
  if (installed) return;
  installed = true;
  installFetch(handle);
}

let panelMounted = false;
// Called from an effect, after hydration, so React never sees the extra node
export function mountPanel() {
  if (panelMounted) return;
  panelMounted = true;
  mountDemoPanel({
    repoUrl: REPO_URL,
    note:
      "Static build: the Next.js API routes and the FastAPI service run in your browser. Sign in with " +
      "<b>sam@resumeai.dev / Student123!</b> (a sample resume is ready) or create an account, stored only in this browser.",
    offlineNote: "Without a key, scoring falls back to a labelled keyword-overlap estimate; PDF export works either way.",
  });
}
