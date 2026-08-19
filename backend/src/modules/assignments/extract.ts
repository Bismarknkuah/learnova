/**
 * Server-side document text extraction for the AI Assignment Workspace.
 * Supports PDF (pdf-parse) and Word .docx (mammoth). Plain text passes through.
 * Images would need OCR (a model) — flagged to the caller rather than silently failing.
 */
export async function extractText(buffer: Buffer, mime: string, filename: string): Promise<{ text: string; kind: string }> {
  const name = filename.toLowerCase();

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const data = await pdfParse(buffer);
    return { text: data.text.trim(), kind: 'pdf' };
  }

  if (name.endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: value.trim(), kind: 'docx' };
  }

  if (mime.startsWith('text/') || /\.(txt|md|csv)$/.test(name)) {
    return { text: buffer.toString('utf8').trim(), kind: 'text' };
  }

  if (mime.startsWith('image/')) {
    throw new Error('Image OCR is not enabled — please paste the text, or upload a PDF/Word document.');
  }

  throw new Error('Unsupported file type. Upload a PDF, Word (.docx), or text file.');
}
