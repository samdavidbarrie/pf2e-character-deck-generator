export type CardCategory =
  | "summary"
  | "basic-action"
  | "skill-action"
  | "feat-action"
  | "feat-passive"
  | "reaction"
  | "free-action"
  | "spell"
  | "focus-spell"
  | "weapon"
  | "equipment"
  | "reminder"
  | "manual";

export type ActionCost =
  | "free"
  | "reaction"
  | "1"
  | "2"
  | "3"
  | "variable"
  | "passive";

export type WritableFieldType = "blank" | "checkboxes" | "counter" | "notes" | "skill-row" | "section";

/** Proficiency ranks in ascending order — used by skill-row fields. */
export const TEML_RANKS = ["trained", "expert", "master", "legendary"] as const;

export interface WritableField {
  id: string;
  label: string;
  type: WritableFieldType;
  size?: "sm" | "md" | "lg";
  boxes?: number;
  /** For skill-row: the skill's current proficiency rank (fills circles up to this rank). */
  rank?: string;
}

export interface CardModel {
  id: string;
  stableKey: string;

  title: string;
  subtitle?: string;
  category: CardCategory;

  source: {
    system: "generated" | "manual" | "rules-reference";
    originalName?: string;
    aonUrl?: string;
    pathbuilderPath?: string;
  };

  rules: {
    actionCost?: ActionCost;
    traits: string[];
    level?: number;
    rank?: number;
    trigger?: string;
    requirements?: string;
    frequency?: string;
    summary: string;
    criticalSuccess?: string;
    success?: string;
    failure?: string;
    criticalFailure?: string;
  };

  writableFields: WritableField[];

  print: {
    include: boolean;
    priority: number;
    size: "standard" | "double" | "mini";
    pageBreakBefore?: boolean;
  };

  userEdits: {
    edited: boolean;
    locked?: boolean;
    notes?: string;
  };

  /** Passive feat cards merged onto this card after AoN enrichment. */
  mergedChildren?: Array<{
    name: string;
    level?: number;
    summary?: string;
  }>;

  /** Title of the parent card this card was merged into (hides it from print). */
  mergedInto?: string;
}

export const ACTION_COST_LABEL: Record<ActionCost, string> = {
  free: "[free]",
  reaction: "[reaction]",
  "1": "[1]",
  "2": "[2]",
  "3": "[3]",
  variable: "[variable]",
  passive: "",
};

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  summary: "Summary",
  "basic-action": "Basic Action",
  "skill-action": "Skill Action",
  "feat-action": "Feat",
  "feat-passive": "Feat (Passive)",
  reaction: "Reaction",
  "free-action": "Free Action",
  spell: "Spell",
  "focus-spell": "Focus Spell",
  weapon: "Weapon",
  equipment: "Equipment",
  reminder: "Reminder",
  manual: "Custom",
};
