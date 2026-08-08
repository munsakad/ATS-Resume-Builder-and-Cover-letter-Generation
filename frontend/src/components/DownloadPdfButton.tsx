"use client";

import dynamic from "next/dynamic";

const PDFDownloadLink = dynamic(() => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink), {
  ssr: false,
  loading: () => <button className="btn-outline !py-1.5 !px-3 text-xs" disabled>Preparing PDF…</button>,
});

export default function DownloadPdfButton({ document, fileName, label }: { document: React.ReactElement; fileName: string; label: string }) {
  return (
    // @ts-ignore - PDFDownloadLink's render-prop typing doesn't play perfectly with dynamic()
    <PDFDownloadLink document={document} fileName={fileName}>
      {({ loading }: { loading: boolean }) => (
        <button className="btn-outline !py-1.5 !px-3 text-xs" disabled={loading}>
          {loading ? "Preparing PDF…" : label}
        </button>
      )}
    </PDFDownloadLink>
  );
}
