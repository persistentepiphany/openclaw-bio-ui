/**
 * download.js — Shared download utility for BioSentinel Dashboard
 *
 * Creates a temporary anchor element to trigger browser downloads
 * from in-memory content (Blob → objectURL → a.click()).
 */

/**
 * Download arbitrary content as a file.
 * @param {string} filename — name of the downloaded file
 * @param {string} content — file content
 * @param {string} mimeType — MIME type (e.g. "text/plain")
 */
export function downloadFile(filename, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a JavaScript object as pretty-printed JSON.
 * @param {string} filename — e.g. "4NQJ_analysis.json"
 * @param {object} data — object to serialize
 */
export function downloadJSON(filename, data) {
  downloadFile(filename, JSON.stringify(data, null, 2), "application/json");
}

/**
 * Download text content as a Markdown file.
 * @param {string} filename — e.g. "summary.md"
 * @param {string} content — markdown text
 */
export function downloadMarkdown(filename, content) {
  downloadFile(filename, content, "text/markdown");
}
