import mammoth from "mammoth";

export type ExtractedText = { text: string; pages?: number };

/**
 * Pull plain text out of an uploaded resume. PDF and DOCX cover essentially all
 * real submissions; plain text is here mostly for tests and pasted resumes.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ExtractedText> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  if (mimeType === "application/pdf" || ext === "pdf") {
    // unpdf ships a serverless-friendly pdfjs build — no worker setup, and it
    // does not try to read a bundled sample file the way pdf-parse does.
    const { extractText: extractPdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractPdfText(pdf, { mergePages: true });
    return { text: normalise(text), pages: totalPages };
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: normalise(value) };
  }

  if (mimeType.startsWith("text/") || ext === "txt" || ext === "md") {
    return { text: normalise(buffer.toString("utf8")) };
  }

  throw new Error(
    `Unsupported resume format "${mimeType || ext}". Upload a PDF, DOCX, or plain-text file.`,
  );
}

/**
 * Resumes are two-column layouts more often than not, and extractors interleave
 * the columns. We can't fully fix that here, but collapsing runaway whitespace
 * and stray hyphenation makes the text far easier for the model to read.
 */
function normalise(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/-\n(?=[a-z])/g, "") // de-hyphenate across line breaks
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

/** Guardrail so a 300-page PDF can't blow up a request. */
export function assertReasonableLength(text: string): void {
  if (text.trim().length < 120) {
    throw new Error(
      "Could not read enough text from that file. If it's a scanned PDF, it needs OCR first.",
    );
  }
  if (text.length > 200_000) {
    throw new Error("That file is far larger than a resume. Upload the resume only.");
  }
}
