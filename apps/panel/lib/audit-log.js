import { getPanelContentFile, updatePanelContent } from "./content-file";

export async function readAuditLog() {
  const content = await getPanelContentFile();
  return Array.isArray(content.cryptoLogs) ? content.cryptoLogs : [];
}

export async function appendAuditLog(entry) {
  let nextLogs = [];

  await updatePanelContent((content) => {
    nextLogs = [entry, ...(content.cryptoLogs || [])].slice(0, 250);
    content.cryptoLogs = nextLogs;
    return content;
  });

  return nextLogs;
}
