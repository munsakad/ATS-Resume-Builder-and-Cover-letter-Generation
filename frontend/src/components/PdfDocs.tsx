"use client";

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1E1B2E", lineHeight: 1.5 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  paragraph: { marginBottom: 10 },
  line: { marginBottom: 2 },
  header: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  meta: { fontSize: 9, color: "#666666", marginBottom: 16 },
});

export function ResumePdfDocument({ title, content }: { title: string; content: string }) {
  const paragraphs = content.split(/\n{2,}/);
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {paragraphs.map((p, i) => (
          <View key={i} style={styles.paragraph}>
            {p.split("\n").map((line, j) => (
              <Text key={j} style={styles.line}>{line}</Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export function CoverLetterPdfDocument({ subjectLine, body }: { subjectLine: string; body: string }) {
  const paragraphs = body.split(/\n{2,}/);
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.header}>{subjectLine}</Text>
        <Text style={styles.meta}>{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>{p}</Text>
        ))}
      </Page>
    </Document>
  );
}
