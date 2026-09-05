// pdf-parse (via pdfjs-dist) normally loads its worker script with a
// runtime dynamic import: `import(/*webpackIgnore: true*/ this.workerSrc)`
// (see pdfjs-dist's WorkerTransport._setupFakeWorkerGlobal). The
// `webpackIgnore` comment asks bundlers to leave that import alone and let
// Node's own module loader resolve it at request time — but Turbopack does
// not honor it: it still statically intercepts the import and rewrites the
// target into its own virtual `[project]/...` module scheme, which then
// fails to resolve no matter what real filesystem path `workerSrc` holds
// (first "Cannot find module .../pdf.worker.mjs", then, after pointing
// workerSrc at a require.resolve'd absolute path, "Cannot find package
// '[project]'").
//
// The actual escape hatch: pdfjs's loader checks
// `globalThis.pdfjsWorker?.WorkerMessageHandler` FIRST and skips the dynamic
// import entirely if it's already set. Statically importing the worker
// module ourselves (a normal import Turbopack bundles correctly, unlike the
// runtime-computed one inside pdfjs) and assigning it to that global
// short-circuits pdfjs's broken import path before any parsing happens.
// This is pdfjs-dist's own documented pattern for Node/bundler environments.
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

let configured = false;

export function ensurePdfWorkerConfigured() {
  if (configured) return;
  (globalThis as unknown as { pdfjsWorker: unknown }).pdfjsWorker = pdfjsWorker;
  configured = true;
}
