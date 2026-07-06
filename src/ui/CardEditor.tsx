import { useAppStore } from "../app/store";
import type { CardModel, CardCategory, ActionCost } from "../model/cards";
import { CATEGORY_LABEL } from "../model/cards";
import styles from "./CardEditor.module.css";

const ACTION_COST_OPTIONS: Array<{ value: ActionCost | ""; label: string }> = [
  { value: "", label: "None / passive" },
  { value: "1", label: "1 action" },
  { value: "2", label: "2 actions" },
  { value: "3", label: "3 actions" },
  { value: "free", label: "Free action" },
  { value: "reaction", label: "Reaction" },
  { value: "variable", label: "Variable" },
];

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL) as Array<[CardCategory, string]>;

interface Props {
  card: CardModel;
}

export function CardEditor({ card }: Props) {
  const { updateCard, duplicateCard, resetCardToGenerated, toggleCardInclude } = useAppStore();

  function patch(changes: Partial<CardModel>) {
    updateCard(card.id, changes);
  }

  function patchRules(changes: Partial<CardModel["rules"]>) {
    patch({ rules: { ...card.rules, ...changes } });
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
          {card.source.system === "generated" && (
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
            className={`${styles.iconBtn} ${card.print.include ? styles.active : ""}`}
            onClick={() => toggleCardInclude(card.id)}
            title={card.print.include ? "Hide from print" : "Include in print"}
            aria-label={card.print.include ? "Hide card from print" : "Include card in print"}
          >
            {card.print.include ? "◉" : "○"}
          </button>
        </div>
      </div>

      <div className={styles.fields}>
        <label className={styles.fieldGroup}>
          <span>Title</span>
          <input
            type="text"
            value={card.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Subtitle</span>
          <input
            type="text"
            value={card.subtitle ?? ""}
            onChange={(e) => patch({ subtitle: e.target.value || undefined })}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Category</span>
          <select
            value={card.category}
            onChange={(e) => patch({ category: e.target.value as CardCategory })}
          >
            {CATEGORY_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>

        <label className={styles.fieldGroup}>
          <span>Action cost</span>
          <select
            value={card.rules.actionCost ?? ""}
            onChange={(e) => patchRules({ actionCost: (e.target.value || undefined) as ActionCost | undefined })}
          >
            {ACTION_COST_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className={styles.fieldGroup}>
          <span>Traits (comma-separated)</span>
          <input
            type="text"
            value={card.rules.traits.join(", ")}
            onChange={(e) =>
              patchRules({ traits: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
            }
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Trigger</span>
          <input
            type="text"
            value={card.rules.trigger ?? ""}
            onChange={(e) => patchRules({ trigger: e.target.value || undefined })}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Requirements</span>
          <input
            type="text"
            value={card.rules.requirements ?? ""}
            onChange={(e) => patchRules({ requirements: e.target.value || undefined })}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Frequency</span>
          <input
            type="text"
            value={card.rules.frequency ?? ""}
            onChange={(e) => patchRules({ frequency: e.target.value || undefined })}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Summary</span>
          <textarea
            rows={5}
            value={card.rules.summary}
            onChange={(e) => patchRules({ summary: e.target.value })}
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>AoN / Source URL</span>
          <input
            type="url"
            value={card.source.aonUrl ?? ""}
            onChange={(e) =>
              patch({ source: { ...card.source, aonUrl: e.target.value || undefined } })
            }
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Notes</span>
          <textarea
            rows={2}
            value={card.userEdits.notes ?? ""}
            onChange={(e) =>
              patch({ userEdits: { ...card.userEdits, notes: e.target.value || undefined } })
            }
          />
        </label>
      </div>

      {card.userEdits.edited && (
        <div className={styles.editedBadge}>Edited</div>
      )}
    </div>
  );
}
