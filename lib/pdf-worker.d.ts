// pdfjs-dist ships this worker entry point without type declarations.
// We only need to import it for its side effect / namespace object shape
// (see lib/pdf-worker-setup.ts), so an untyped ambient module is sufficient.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
