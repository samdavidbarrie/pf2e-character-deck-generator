import { useRef, useState } from 'react';
import { useAppStore } from '../app/store';
import type { ActionCost, CardCategory, CardModel } from '../model/cards';
import { CATEGORY_LABEL } from '../model/cards';
import styles from './CardEditor.module.css';

const ACTION_COST_OPTIONS: Array<{ value: ActionCost | ''; label: string }> = [
  { value: '', label: 'None / passive' },
  { value: '1', label: '1 action' },
  { value: '2', label: '2 actions' },
  { value: '3', label: '3 actions' },
  { value: 'free', label: 'Free action' },
  { value: 'reaction', label: 'Reaction' },
  { value: 'variable', label: 'Variable' },
];

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL) as Array<[CardCategory, string]>;

const BASE = import.meta.env.BASE_URL as string;

interface InsertItem {
  /** Text inserted into the textarea */
  insert: string;
  /** Tooltip / aria-label */
  title: string;
  /** If set, render an <img> instead of the text label */
  icon?: string;
  /** Fallback text label (always set; shown when no icon) */
  label: string;
}

const INSERT_ITEMS: InsertItem[] = [
  { label: '◆', title: '1 action', insert: '◆', icon: `${BASE}icons/action-1.png` },
  { label: '◆◆', title: '2 actions', insert: '◆◆', icon: `${BASE}icons/action-2.png` },
  { label: '◆◆◆', title: '3 actions', insert: '◆◆◆', icon: `${BASE}icons/action-3.png` },
  { label: '◇', title: 'Free action', insert: '◇', icon: `${BASE}icons/action-free.png` },
  { label: '↺', title: 'Reaction', insert: '↺', icon: `${BASE}icons/action-reaction.png` },
  { label: '─', title: 'Horizontal rule', insert: '\n---\n' },
  { label: '\u21b5 card', title: 'New card (split point)', insert: '\n[newcard]' },
  { label: '___', title: 'Pencil-fill blank (___)', insert: '___' },
];

/**
 * Build the combined summary text shown in the editor textarea.
 * Outcome sections (CS/S/F/CF) are appended as `\n**Label** text` lines so
 * the user edits them all in one place.
 *
 * If the summary is long enough that the card would auto-split, a `[newcard]`
 * marker is injected at the estimated split point so the user can see and
 * optionally move or remove it.  Writing the marker back via onChange makes
 * it permanent; the auto-split logic then defers to it.
 */
const AUTO_SPLIT_THRESHOLD = 850; // mirrors splitOverflowOnce combined limit

function buildEditorSummary(rules: CardModel['rules']): string {
  let summaryPart = rules.summary;
  let rest = '';
  if (rules.criticalSuccess) rest += '\n**Critical Success** ' + rules.criticalSuccess;
  if (rules.success) rest += '\n**Success** ' + rules.success;
  if (rules.failure) rest += '\n**Failure** ' + rules.failure;
  if (rules.criticalFailure) rest += '\n**Critical Failure** ' + rules.criticalFailure;
  for (const sec of rules.extraSections ?? []) {
    rest += `\n**${sec.heading ?? 'Extra'}** ${sec.body}`;
  }

  // Inject a [newcard] marker so the user can see and adjust the split point.
  // Mirrors the two cases in splitOverflowOnce:
  //   1. summary + outcomes combined too long → split between summary and outcomes
  //   2. plain summary alone too long → split within the summary text
  if (!summaryPart.includes('[newcard]')) {
    const hasOutcomes = !!(
      rules.criticalSuccess ||
      rules.success ||
      rules.failure ||
      rules.criticalFailure
    );
    const outcomesLen =
      (rules.criticalSuccess?.length ?? 0) +
      (rules.success?.length ?? 0) +
      (rules.failure?.length ?? 0) +
      (rules.criticalFailure?.length ?? 0);

    if (hasOutcomes && summaryPart.length + outcomesLen > AUTO_SPLIT_THRESHOLD) {
      if (summaryPart.length <= 680) {
        // Summary fits on front — mark the junction between summary and outcomes.
        rest = '\n[newcard]' + rest;
      } else {
        // Summary itself overflows — find a cut point within it.
        let cutAt = summaryPart.lastIndexOf('. ', 680);
        if (cutAt < 340) cutAt = summaryPart.lastIndexOf(' ', 680);
        if (cutAt > 0) {
          summaryPart =
            summaryPart.slice(0, cutAt + 1) + '\n[newcard]' + summaryPart.slice(cutAt + 1);
        }
      }
    } else if (!hasOutcomes && summaryPart.length > 800) {
      // Plain summary only — insert at the sentence boundary before ~680 chars.
      let cutAt = summaryPart.lastIndexOf('. ', 680);
      if (cutAt < 340) cutAt = summaryPart.lastIndexOf(' ', 680);
      if (cutAt > 0) {
        summaryPart =
          summaryPart.slice(0, cutAt + 1) + '\n[newcard]' + summaryPart.slice(cutAt + 1);
      }
    }
  }

  return summaryPart + rest;
}

// Splits on any `\n**Label** ` — captures the full **label** token.
const OUTCOME_SPLIT_RE = /\n(\*\*[^*]+\*\*) /;

type OutcomeKey = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
const OUTCOME_KEY: Record<string, OutcomeKey> = {
  '**Critical Success**': 'criticalSuccess',
  '**Success**': 'success',
  '**Failure**': 'failure',
  '**Critical Failure**': 'criticalFailure',
};

/**
 * Parse combined editor text back to separate rules fields.
 * Outcome sections are identified by the `\n**Label** ` prefix on a new line.
 */
function parseEditorSummary(
  text: string,
): Pick<
  CardModel['rules'],
  'summary' | 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' | 'extraSections'
> {
  const parts = text.split(OUTCOME_SPLIT_RE);
  const result: Pick<
    CardModel['rules'],
    'summary' | 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' | 'extraSections'
  > = {
    summary: parts[0],
    criticalSuccess: undefined,
    success: undefined,
    failure: undefined,
    criticalFailure: undefined,
    extraSections: undefined,
  };
  const sections: Array<{ heading?: string; body: string }> = [];
  // With one capture group, split alternates [text, label, text, label, text, …]
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const rawLabel = parts[i]; // e.g. "**Critical Success**"
    const heading = rawLabel.slice(2, -2); // strip **
    const content = parts[i + 1].trimEnd() || undefined;
    const outcomeKey = OUTCOME_KEY[rawLabel];
    if (outcomeKey) {
      result[outcomeKey] = content;
    } else if (content) {
      sections.push({ heading, body: content });
    }
  }
  if (sections.length > 0) result.extraSections = sections;
  return result;
}

interface Props {
  card: CardModel;
}

export function CardEditor({ card }: Props) {
  const { updateCard, duplicateCard, resetCardToGenerated, toggleCardInclude } = useAppStore();

  function patch(changes: Partial<CardModel>) {
    updateCard(card.id, changes);
  }

  function patchRules(changes: Partial<CardModel['rules']>) {
    patch({ rules: { ...card.rules, ...changes } });
  }

  const currentFontSize = card.userEdits.titleFontSize ?? 10;

  function adjustTitleFontSize(delta: number) {
    const next = Math.round((currentFontSize + delta) * 10) / 10;
    const clamped = Math.min(12, Math.max(4, next));
    patch({ userEdits: { ...card.userEdits, titleFontSize: clamped } });
  }

  const summaryRef = useRef<HTMLTextAreaElement>(null);

  // Traits are edited as a local comma-separated string to avoid cursor-reset
  // on every keystroke. We sync from the card when the selected card changes
  // by storing the last-seen card id alongside the text.
  const [traitsState, setTraitsState] = useState({
    id: card.id,
    text: card.rules.traits.join(', '),
  });
  const traitsText = traitsState.id === card.id ? traitsState.text : card.rules.traits.join(', ');
  function setTraitsText(text: string) {
    setTraitsState({ id: card.id, text });
  }

  function insertIntoSummary(text: string) {
    const el = summaryRef.current;
    // Use the textarea's DOM value (combined summary + outcomes)
    const current = el?.value ?? buildEditorSummary(card.rules);
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + text + current.slice(end);
    patchRules(parseEditorSummary(next));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <h3 className={styles.editorTitle}>Edit Card</h3>
        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            onClick={() => duplicateCard(card.id)}
            title="Duplicate card"
            aria-label="Duplicate card"
          >
            ⧉
          </button>
          {card.source.system === 'generated' && (
            <button
              className={styles.iconBtn}
              onClick={() => resetCardToGenerated(card.id)}
              title="Reset to generated"
              aria-label="Reset card to generated version"
            >
              ↺
            </button>
          )}
          <button
            className={`${styles.iconBtn} ${card.print.include ? styles.active : ''}`}
            onClick={() => toggleCardInclude(card.id)}
            title={card.print.include ? 'Hide from print' : 'Include in print'}
            aria-label={card.print.include ? 'Hide card from print' : 'Include card in print'}
          >
            {card.print.include ? '◉' : '○'}
          </button>
        </div>
      </div>

      <div className={styles.fields}>
        {/* Title + font-size stepper */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabelRow}>
            <span>Title</span>
            <span className={styles.fontSizeStepper}>
              {card.userEdits.titleFontSize !== undefined && (
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() =>
                    patch({ userEdits: { ...card.userEdits, titleFontSize: undefined } })
                  }
                  title="Reset title font size to default"
                  aria-label="Reset title font size to default"
                >
                  ↺
                </button>
              )}
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => adjustTitleFontSize(-0.5)}
                title="Decrease title font size"
                aria-label="Decrease title font size"
              >
                −
              </button>
              <input
                type="number"
                className={styles.fontSizeInput}
                min={4}
                max={12}
                step={0.5}
                value={currentFontSize}
                title="Title font size in pt"
                aria-label="Title font size in pt"
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) {
                    const clamped = Math.min(12, Math.max(4, Math.round(v * 10) / 10));
                    patch({ userEdits: { ...card.userEdits, titleFontSize: clamped } });
                  }
                }}
              />
              <span className={styles.fontSizeUnit}>pt</span>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => adjustTitleFontSize(0.5)}
                title="Increase title font size"
              >
                +
              </button>
            </span>
          </div>
          <input
            type="text"
            value={card.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </div>

        <label className={styles.fieldGroup}>
          <span>Category</span>
          <select
            value={card.category}
            onChange={(e) => patch({ category: e.target.value as CardCategory })}
          >
            {CATEGORY_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.fieldGroup}>
          <span>Level</span>
          <input
            type="number"
            min={0}
            max={25}
            value={card.rules.level ?? ''}
            placeholder="—"
            onChange={(e) =>
              patchRules({ level: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Action cost</span>
          <select
            value={card.rules.actionCost ?? ''}
            onChange={(e) =>
              patchRules({ actionCost: (e.target.value || undefined) as ActionCost | undefined })
            }
          >
            {ACTION_COST_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.fieldGroup}>
          <span>Traits (comma-separated)</span>
          <input
            type="text"
            value={traitsText}
            onChange={(e) => setTraitsText(e.target.value)}
            onBlur={() =>
              patchRules({
                traits: traitsText
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Trigger</span>
          <input
            type="text"
            value={card.rules.trigger ?? ''}
            onChange={(e) => patchRules({ trigger: e.target.value || undefined })}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Requirements</span>
          <input
            type="text"
            value={card.rules.requirements ?? ''}
            onChange={(e) => patchRules({ requirements: e.target.value || undefined })}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Frequency</span>
          <input
            type="text"
            value={card.rules.frequency ?? ''}
            onChange={(e) => patchRules({ frequency: e.target.value || undefined })}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Usage</span>
          <input
            type="text"
            value={card.rules.usage ?? ''}
            onChange={(e) => patchRules({ usage: e.target.value || undefined })}
            placeholder="e.g. held in 1 hand"
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Hands</span>
          <input
            type="text"
            value={card.rules.hands ?? ''}
            onChange={(e) => patchRules({ hands: e.target.value || undefined })}
            placeholder="e.g. 2"
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Type</span>
          <input
            type="text"
            value={card.rules.weaponType ?? ''}
            onChange={(e) => patchRules({ weaponType: e.target.value || undefined })}
            placeholder="Melee / Ranged"
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Category</span>
          <select
            value={card.rules.weaponCategory ?? ''}
            onChange={(e) => patchRules({ weaponCategory: e.target.value || undefined })}
          >
            <option value="">—</option>
            <option value="Simple">Simple</option>
            <option value="Martial">Martial</option>
            <option value="Advanced">Advanced</option>
            <option value="Unarmed">Unarmed</option>
          </select>
        </label>

        <label className={styles.fieldGroup}>
          <span>Group</span>
          <input
            type="text"
            value={card.rules.weaponGroup ?? ''}
            onChange={(e) => patchRules({ weaponGroup: e.target.value || undefined })}
            placeholder="e.g. Polearm, Sword"
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Bulk</span>
          <input
            type="text"
            value={card.rules.bulk ?? ''}
            onChange={(e) => patchRules({ bulk: e.target.value || undefined })}
            placeholder="e.g. L, 1, 2"
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Price</span>
          <input
            type="text"
            value={card.rules.price ?? ''}
            onChange={(e) => patchRules({ price: e.target.value || undefined })}
            placeholder="e.g. 50 gp"
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Bonus</span>
          <input
            type="text"
            value={card.rules.bonus ?? ''}
            onChange={(e) => patchRules({ bonus: e.target.value || undefined })}
            placeholder="e.g. +14, Acrobatics +15"
          />
        </label>

        {(card.rules.range !== undefined ||
          card.rules.area !== undefined ||
          card.rules.targets !== undefined ||
          card.rules.defense !== undefined ||
          card.rules.duration !== undefined) && (
          <>
            {[
              { key: 'range', label: 'Range' },
              { key: 'area', label: 'Area' },
              { key: 'targets', label: 'Targets' },
              { key: 'defense', label: 'Defense' },
              { key: 'duration', label: 'Duration' },
            ].map(({ key, label }) => (
              <label key={key} className={styles.fieldGroup}>
                <span>{label}</span>
                <input
                  type="text"
                  value={(card.rules[key as keyof typeof card.rules] as string) ?? ''}
                  onChange={(e) => patchRules({ [key]: e.target.value || undefined })}
                />
              </label>
            ))}
          </>
        )}

        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabelRow}>
            <span>Summary</span>
            <span className={styles.fontSizeStepper}>
              {card.userEdits.bodyFontSize !== undefined && (
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() =>
                    patch({ userEdits: { ...card.userEdits, bodyFontSize: undefined } })
                  }
                  title="Reset body font size to default"
                  aria-label="Reset body font size to default"
                >
                  ↺
                </button>
              )}
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => {
                  const cur = card.userEdits.bodyFontSize ?? 6.8;
                  const next = Math.min(12, Math.max(4, Math.round((cur - 0.5) * 10) / 10));
                  patch({ userEdits: { ...card.userEdits, bodyFontSize: next } });
                }}
                title="Decrease body font size"
                aria-label="Decrease body font size"
              >
                −
              </button>
              <input
                type="number"
                className={styles.fontSizeInput}
                min={4}
                max={12}
                step={0.5}
                value={card.userEdits.bodyFontSize ?? 6.8}
                title="Body font size in pt"
                aria-label="Body font size in pt"
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) {
                    const clamped = Math.min(12, Math.max(4, Math.round(v * 10) / 10));
                    patch({ userEdits: { ...card.userEdits, bodyFontSize: clamped } });
                  }
                }}
              />
              <span className={styles.fontSizeUnit}>pt</span>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => {
                  const cur = card.userEdits.bodyFontSize ?? 6.8;
                  const next = Math.min(12, Math.max(4, Math.round((cur + 0.5) * 10) / 10));
                  patch({ userEdits: { ...card.userEdits, bodyFontSize: next } });
                }}
                title="Increase body font size"
                aria-label="Increase body font size"
              >
                +
              </button>
            </span>
          </div>
          <div className={styles.insertToolbar} role="toolbar" aria-label="Insert into summary">
            {INSERT_ITEMS.map(({ label, title, insert, icon }) => (
              <button
                key={label}
                type="button"
                className={styles.insertBtn}
                title={title}
                aria-label={`Insert ${title}`}
                onMouseDown={(e) => {
                  // Prevent blur so selectionStart/End are still valid
                  e.preventDefault();
                  insertIntoSummary(insert);
                }}
              >
                {icon ? <img src={icon} alt={title} className={styles.insertBtnIcon} /> : label}
              </button>
            ))}
          </div>
          <textarea
            ref={summaryRef}
            rows={12}
            value={buildEditorSummary(card.rules)}
            onChange={(e) => patchRules(parseEditorSummary(e.target.value))}
          />
        </div>

        <label className={styles.fieldGroup}>
          <span>AoN / Source URL</span>
          <input
            type="url"
            value={card.source.aonUrl ?? ''}
            onChange={(e) =>
              patch({ source: { ...card.source, aonUrl: e.target.value || undefined } })
            }
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>
            Related Abilities{' '}
            <small className={styles.hint}>(editor-only — not printed on card)</small>
          </span>
          <textarea
            rows={8}
            value={card.userEdits.notes ?? ''}
            onChange={(e) =>
              patch({ userEdits: { ...card.userEdits, notes: e.target.value || undefined } })
            }
          />
        </label>
      </div>

      {card.userEdits.edited && <div className={styles.editedBadge}>Edited</div>}
    </div>
  );
}
