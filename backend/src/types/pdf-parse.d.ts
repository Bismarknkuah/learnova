declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfData { text: string; numpages: number; info: unknown }
  function pdfParse(buffer: Buffer): Promise<PdfData>;
  export default pdfParse;
}
declare module 'pdf-parse' {
  interface PdfData { text: string; numpages: number; info: unknown }
  function pdfParse(buffer: Buffer): Promise<PdfData>;
  export default pdfParse;
}
