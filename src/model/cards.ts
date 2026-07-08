export type CardCategory =
  | 'summary'
  | 'basic-action'
  | 'skill-action'
  | 'feat-action'
  | 'feat-passive'
  | 'reaction'
  | 'free-action'
  | 'spell'
  | 'focus-spell'
  | 'weapon'
  | 'equipment'
  | 'reminder'
  | 'manual';

export type ActionCost =
  'free' | 'reaction' | '1' | '2' | '3' | '1-2' | '1-3' | '2-3' | 'variable' | 'passive';

export type WritableFieldType =
  'blank' | 'checkboxes' | 'counter' | 'notes' | 'skill-row' | 'section' | 'display';

/** Proficiency ranks in ascending order — used by skill-row fields. */
export const TEML_RANKS = ['trained', 'expert', 'master', 'legendary'] as const;

export interface WritableField {
  id: string;
  label: string;
  type: WritableFieldType;
  size?: 'sm' | 'md' | 'lg';
  boxes?: number;
  /** For skill-row: the skill's current proficiency rank (fills circles up to this rank). */
  rank?: string;
  /** For display fields: pre-filled text shown instead of a blank. */
  value?: string;
  /** Quadrant position for cards using layout: 'quadrant'. 1=top-left, 2=top-right, 3=bottom-left, 4=bottom-right. */
  quadrant?: 1 | 2 | 3 | 4;
}

export interface CardModel {
  id: string;
  stableKey: string;

  title: string;
  subtitle?: string;
  category: CardCategory;

  source: {
    system: 'generated' | 'manual' | 'rules-reference';
    originalName?: string;
    aonUrl?: string;
    pathbuilderPath?: string;
    /** Property rune names stored for AoN enrichment lookup. */
    runes?: string[];
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
    /** Extra labelled text blocks (rune descriptions, crit spec, etc.). Can overflow to a back card. */
    extraSections?: Array<{ heading?: string; body: string }>;
    /** Spell / ability targeting info applied from AoN enrichment. */
    range?: string;
    area?: string;
    targets?: string;
    defense?: string;
    duration?: string;
    /** True if the spell requires a spell attack roll (targets AC). Set by AoN enrichment. */
    spellAttack?: boolean;
    /** Equipment item metadata set by AoN enrichment. */
    usage?: string; // e.g. "held in 1 hand"
    bulk?: string; // e.g. "L"
    price?: string; // e.g. "50 gp"
    activateTag?: string; // activation trait(s), e.g. "manipulate"
  };

  layout?: 'standard' | 'quadrant';
  /** When true, renders a writable level blank in the top-right rank area instead of the computed rank label. */
  rankBlank?: boolean;
  writableFields: WritableField[];

  print: {
    include: boolean;
    priority: number;
    size: 'standard' | 'double' | 'mini';
    pageBreakBefore?: boolean;
    /** Number of physical copies to print. Defaults to 1. Used for consumable equipment. */
    copies?: number;
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

  /** ID of the front card that this card continues (back-of-card content). */
  continuationOf?: string;
}

export const ACTION_COST_LABEL: Record<ActionCost, string> = {
  free: '◇',
  reaction: '↺',
  '1': '◆',
  '2': '◆◆',
  '3': '◆◆◆',
  '1-2': '◆–◆◆',
  '1-3': '◆–◆◆◆',
  '2-3': '◆◆–◆◆◆',
  variable: '◆?',
  passive: '',
};

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  summary: 'Summary',
  'basic-action': 'Basic',
  'skill-action': 'Skill',
  'feat-action': 'Feat',
  'feat-passive': 'Passive',
  reaction: 'Reaction',
  'free-action': 'Free',
  spell: 'Spell',
  'focus-spell': 'Focus',
  weapon: 'Weapon',
  equipment: 'Equipment',
  reminder: 'Reminder',
  manual: 'Custom',
};

export const CATEGORY_COLOR: Record<CardCategory, string> = {
  summary: '#efefef',
  'basic-action': '#f5e8cc',
  'skill-action': '#d6edda',
  reaction: '#fbe3c8',
  'free-action': '#fdf5c8',
  'feat-action': '#e8d6f0',
  'feat-passive': '#f0e4f8',
  spell: '#d0def5',
  'focus-spell': '#c8ecf0',
  weapon: '#f5d8d8',
  equipment: '#e8e4d8',
  reminder: '#f8f8f2',
  manual: '#f0f0f0',
};
