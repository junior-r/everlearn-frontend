/** Characters no file system accepts in a name. */
const UNSAFE_IN_FILE_NAME = /[\\/:*?"<>|\u0000-\u001f]/g;

/** A name a browser can save a file under, from words a member typed (a subject, a group). */
export function fileName(base: string, extension: string): string {
  const safe = base.replace(UNSAFE_IN_FILE_NAME, " ").replace(/\s+/g, " ").trim();
  return `${safe || "archivo"}.${extension}`;
}

/** Hands a file to the browser's own download, as if a link to it had been clicked. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked after the click has been handled, or some browsers cancel the download
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
