import type { CardModel, WritableField } from "../../model/cards";
import type { ProficiencyRank } from "../../model/character";

let _idCounter = 0;
function nextId(): string {
  return `generated-${++_idCounter}`;
}

export function blankField(label: string, size: WritableField["size"] = "md"): WritableField {
  return { id: crypto.randomUUID(), label, type: "blank", size };
}

export function checkboxField(label: string, boxes: number): WritableField {
  return { id: crypto.randomUUID(), label, type: "checkboxes", boxes };
}

export function notesField(label = "Notes"): WritableField {
  return { id: crypto.randomUUID(), label, type: "notes", size: "lg" };
}

/** A full-width section divider label — creates a visual break between groups of fields. */
export function sectionField(label: string): WritableField {
  return { id: crypto.randomUUID(), label, type: "section" };
}

/**
 * A skill row: shows a TEML proficiency column (circles pre-filled up to rank)
 * with a blank total box.
 */
export function skillField(label: string, rank: ProficiencyRank): WritableField {
  return { id: crypto.randomUUID(), label, type: "skill-row", rank };
}

// Re-export nextId for templates that need a unique card id
export { nextId };

export function defaultCard(overrides: Partial<CardModel> & Pick<CardModel, "title" | "category" | "stableKey">): CardModel {
  return {
    id: nextId(),
    subtitle: undefined,
    source: { system: "generated" },
    rules: {
      traits: [],
      summary: "Rules summary not imported. Add a short table-facing summary or use the source link.",
    },
    writableFields: [],
    print: { include: true, priority: 50, size: "standard" },
    userEdits: { edited: false },
    ...overrides,
  };
}
