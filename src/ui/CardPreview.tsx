import type { CardModel } from '../model/cards';
import { ACTION_COST_LABEL, CATEGORY_LABEL, TEML_RANKS } from '../model/cards';
import styles from './CardPreview.module.css';

interface Props {
  card: CardModel;
  selected?: boolean;
  onClick?: () => void;
  forPrint?: boolean;
}

export function CardPreview({ card, selected, onClick, forPrint }: Props) {
  const actionLabel = card.rules.actionCost ? ACTION_COST_LABEL[card.rules.actionCost] : '';
  const categoryLabel = CATEGORY_LABEL[card.category];

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''} ${forPrint ? styles.forPrint : ''} ${!card.print.include && !forPrint ? styles.hidden : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-pressed={selected}
    >
      <div className={styles.topBand}>
        <span className={styles.title}>{card.title}</span>
        <span className={styles.meta}>
          <span className={styles.category}>{categoryLabel}</span>
          {actionLabel && <span className={styles.actionCost}>{actionLabel}</span>}
        </span>
      </div>

      {card.subtitle && <div className={styles.subtitle}>{card.subtitle}</div>}

      {card.rules.traits.length > 0 && (
        <div className={styles.traits}>
          {card.rules.traits.map((t) => (
            <span key={t} className={styles.trait}>
              {t}
            </span>
          ))}
        </div>
      )}

      {card.rules.trigger && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Trigger</span> {card.rules.trigger}
        </div>
      )}
      {card.rules.requirements && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Requirements</span> {card.rules.requirements}
        </div>
      )}
      {card.rules.frequency && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Frequency</span> {card.rules.frequency}
        </div>
      )}

      <div className={styles.summary}>{card.rules.summary}</div>

      {card.rules.criticalSuccess && (
        <div className={styles.outcomeField}>
          <span className={styles.outcomeLabel}>Critical Success</span>
          {card.rules.criticalSuccess}
        </div>
      )}
      {card.rules.success && (
        <div className={styles.outcomeField}>
          <span className={styles.outcomeLabel}>Success</span>
          {card.rules.success}
        </div>
      )}
      {card.rules.failure && (
        <div className={styles.outcomeField}>
          <span className={styles.outcomeLabel}>Failure</span>
          {card.rules.failure}
        </div>
      )}
      {card.rules.criticalFailure && (
        <div className={styles.outcomeField}>
          <span className={styles.outcomeLabel}>Critical Failure</span>
          {card.rules.criticalFailure}
        </div>
      )}

      {card.mergedChildren && card.mergedChildren.length > 0 && (
        <div className={styles.mergedChildren}>
          <div className={styles.mergedChildrenLabel}>Also applies</div>
          {card.mergedChildren.map((child) => (
            <div key={child.name} className={styles.mergedChild}>
              <span className={styles.mergedChildName}>
                {child.name}
                {child.level !== undefined && (
                  <span className={styles.mergedChildLevel}> (lv{child.level})</span>
                )}
              </span>
              {child.summary && <span className={styles.mergedChildSummary}>{child.summary}</span>}
            </div>
          ))}
        </div>
      )}

      {card.mergedInto && !forPrint && (
        <div className={styles.mergedIntoBadge}>↗ Merged into: {card.mergedInto}</div>
      )}

      {(() => {
        const skillRows = card.writableFields.filter((f) => f.type === 'skill-row');
        const otherFields = card.writableFields.filter((f) => f.type !== 'skill-row');
        return (
          <>
            {skillRows.length > 0 && (
              <div className={styles.skillTable}>
                <div className={styles.skillColumnHeader}>
                  <span className={styles.skillName} />
                  <span className={styles.skillTeml}>T&nbsp;E&nbsp;M&nbsp;L</span>
                  <span className={styles.skillTotal}>Bonus</span>
                </div>
                {skillRows.map((f) => {
                  const rankIndex = TEML_RANKS.indexOf(f.rank as (typeof TEML_RANKS)[number]);
                  const circles = TEML_RANKS.map((_, i) => (i <= rankIndex ? '●' : '○')).join('');
                  return (
                    <div key={f.id} className={styles.skillRow}>
                      <span className={styles.skillName}>{f.label}</span>
                      <span className={styles.skillTeml}>{circles}</span>
                      <span className={styles.skillTotal} />
                    </div>
                  );
                })}
              </div>
            )}

            {otherFields.length > 0 && (
              <div className={styles.writableFields}>
                {otherFields.map((f) => {
                  if (f.type === 'section') {
                    return (
                      <div key={f.id} className={styles.sectionDivider}>
                        {f.label}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={f.id}
                      className={`${styles.writableField} ${styles[`size-${f.size ?? 'md'}`]}`}
                    >
                      <span className={styles.writableLabel}>{f.label}:</span>
                      {f.type === 'checkboxes' && f.boxes ? (
                        <span className={styles.checkboxes}>
                          {Array.from({ length: f.boxes }).map((_, i) => (
                            <span key={i} className={styles.checkbox}>
                              □
                            </span>
                          ))}
                        </span>
                      ) : f.type === 'notes' ? (
                        <span className={styles.notesLine}>______________________</span>
                      ) : (
                        <span className={styles.blankBox}>
                          [{' '.repeat(f.size === 'lg' ? 20 : f.size === 'md' ? 12 : 6)}]
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}

      {card.source.aonUrl && !forPrint && (
        <div className={styles.sourceFooter}>
          <a href={card.source.aonUrl} target="_blank" rel="noopener noreferrer" tabIndex={-1}>
            AoN ↗
          </a>
        </div>
      )}
    </div>
  );
}
