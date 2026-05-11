export function getDocumentViewHref(documentId: string) {
  return `/api/documents/${documentId}/download`;
}

export function getDocumentDownloadHref(documentId: string) {
  return `/api/documents/${documentId}/download?download=1`;
}
