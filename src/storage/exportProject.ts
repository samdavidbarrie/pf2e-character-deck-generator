import type { DeckProject } from "../model/deckProject";

export function exportProjectJson(project: DeckProject): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = project.character.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  a.href = url;
  a.download = `pf2e-deck-${safeName}-level${project.character.level}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProjectJson(file: File): Promise<DeckProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as DeckProject;
        if (!parsed.character || !parsed.cards) {
          reject(new Error("File does not appear to be a valid deck project."));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error("Could not parse project file as JSON."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsText(file);
  });
}
