import { splitOverflowCards } from '../generation/generateDeck';
import type { ActionCost, CardModel } from '../model/cards';
import { ACTION_COST_LABEL, CATEGORY_COLOR, TEML_RANKS } from '../model/cards';
import styles from './CardPreview.module.css';

interface Props {
  card: CardModel;
  selected?: boolean;
  onClick?: () => void;
  forPrint?: boolean;
  onToggleInclude?: () => void;
}

const BASE = import.meta.env.BASE_URL;

/** Primary skill for each skill-action by card title. 'Skill' means multiple options. */
const SKILL_FOR_ACTION: Record<string, string> = {
  // Acrobatics
  Balance: 'Acrobatics',
  'Maneuver in Flight': 'Acrobatics',
  Squeeze: 'Acrobatics',
  'Tumble Through': 'Acrobatics',
  // Athletics
  Climb: 'Athletics',
  Disarm: 'Athletics',
  'Force Open': 'Athletics',
  Grapple: 'Athletics',
  'High Jump': 'Athletics',
  'Long Jump': 'Athletics',
  Shove: 'Athletics',
  Swim: 'Athletics',
  Trip: 'Athletics',
  // Deception
  'Create a Diversion': 'Deception',
  Feint: 'Deception',
  Impersonate: 'Deception',
  Lie: 'Deception',
  // Diplomacy
  'Gather Information': 'Diplomacy',
  'Make an Impression': 'Diplomacy',
  Request: 'Diplomacy',
  // Intimidation
  Coerce: 'Intimidation',
  Demoralize: 'Intimidation',
  // Medicine
  'Administer First Aid': 'Medicine',
  'Treat Disease': 'Medicine',
  'Treat Poison': 'Medicine',
  'Treat Wounds': 'Medicine',
  // Nature
  'Command an Animal': 'Nature',
  // Performance
  Perform: 'Performance',
  // Society
  'Create Forgery': 'Society',
  // Stealth
  'Conceal an Object': 'Stealth',
  Hide: 'Stealth',
  Sneak: 'Stealth',
  // Survival
  'Cover Tracks': 'Survival',
  Track: 'Survival',
  // Thievery
  'Disable a Device': 'Thievery',
  'Palm an Object': 'Thievery',
  'Pick a Lock': 'Thievery',
  Steal: 'Thievery',
  // Perception (treated as a skill)
  Seek: 'Perception',
  'Sense Motive': 'Perception',
  // Multiple / varies
  Escape: 'Skill',
  'Identify Alchemy': 'Skill',
  'Identify Magic': 'Skill',
  'Learn a Spell': 'Skill',
  'Recall Knowledge': 'Skill',
  'Earn Income': 'Skill',
  Subsist: 'Skill',
};

/** Render text that may contain **bold** markers produced by stripHtml. */
function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part || null
    ),
  );
}
const ACTION_ICON: Partial<Record<ActionCost, string>> = {
  '1': `${BASE}icons/action-1.png`,
  '2': `${BASE}icons/action-2.png`,
  '3': `${BASE}icons/action-3.png`,
  free: `${BASE}icons/action-free.png`,
  reaction: `${BASE}icons/action-reaction.png`,
};
const ACTION_RANGE_PARTS: Partial<Record<ActionCost, [ActionCost, ActionCost]>> = {
  '1-2': ['1', '2'],
  '1-3': ['1', '3'],
  '2-3': ['2', '3'],
};

function ActionCostDisplay({ cost }: { cost: ActionCost }) {
  if (cost === 'passive') return null;
  const icon = ACTION_ICON[cost];
  if (icon) {
    return <img src={icon} className={styles.actionIcon} alt={ACTION_COST_LABEL[cost]} />;
  }
  const range = ACTION_RANGE_PARTS[cost];
  if (range) {
    return (
      <span className={styles.actionRange}>
        <img src={ACTION_ICON[range[0]]} className={styles.actionIcon} alt={range[0]} />
        <span className={styles.actionRangeDash}>–</span>
        <img src={ACTION_ICON[range[1]]} className={styles.actionIcon} alt={range[1]} />
      </span>
    );
  }
  // fallback (variable)
  return <span className={styles.actionCost}>{ACTION_COST_LABEL[cost]}</span>;
}

export function CardPreview({ card, selected, onClick, forPrint, onToggleInclude }: Props) {
  const splitCount = !forPrint && !card.continuationOf ? splitOverflowCards([card]).length : 1;

  // For spell cards, only show Spell DC when defense is a save, Spell Attack when it's a
  // spell-attack roll. If neither applies (e.g. auto-hit spells like Force Barrage) hide both.
  const isSpellCard = card.category === 'spell' || card.category === 'focus-spell';
  const defenseIsSave =
    isSpellCard &&
    !!card.rules.defense &&
    /\b(fortitude|reflex|will|fort)\b/i.test(card.rules.defense);

  // For skill-action cards, show the relevant skill above the summary and remove it from the bottom.
  const isSkillAction = card.category === 'skill-action' && !card.continuationOf;
  const skillLabel = isSkillAction ? (SKILL_FOR_ACTION[card.title] ?? 'Skill') : null;

  // For sparse print cards, scale up body text to better fill the physical card.
  const printScaleClass = (() => {
    if (!forPrint) return '';
    if (card.writableFields.some((f) => f.type === 'skill-row')) return '';
    const allChars =
      [
        card.rules.summary ?? '',
        card.rules.requirements ?? '',
        card.rules.trigger ?? '',
        card.rules.frequency ?? '',
        card.rules.criticalSuccess ?? '',
        card.rules.success ?? '',
        card.rules.failure ?? '',
        card.rules.criticalFailure ?? '',
        ...(card.rules.extraSections?.flatMap((s) => [s.heading ?? '', s.body ?? '']) ?? []),
      ].join('').length +
      card.rules.traits.length * 20;
    if (allChars > 650) return styles.scaleDense;
    const hasOutcomes = !!(
      card.rules.criticalSuccess ||
      card.rules.success ||
      card.rules.failure ||
      card.rules.criticalFailure
    );
    if (hasOutcomes) return '';
    if (allChars < 200) return styles.scaleLg;
    if (allChars < 380) return styles.scaleMd;
    if (allChars < 540) return styles.scaleSm;
    return '';
  })();

  const effectiveWritableFields = (() => {
    let fields = card.writableFields;
    if (isSpellCard) {
      fields = fields.filter((f) => {
        if (f.label === 'Spell DC') return defenseIsSave;
        if (f.label === 'Spell Attack') return card.rules.spellAttack === true;
        return true;
      });
    }
    if (isSkillAction) {
      fields = fields.filter((f) => f.label !== 'Skill bonus');
    }
    return fields;
  })();

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''} ${forPrint ? styles.forPrint : ''} ${!card.print.include && !forPrint ? styles.hidden : ''} ${printScaleClass}`}
      style={{ backgroundColor: CATEGORY_COLOR[card.category] }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-pressed={selected}
    >
      <div className={styles.topBand}>
        {onToggleInclude && (
          <button
            className={`${styles.includeToggle} ${card.print.include ? styles.toggleIncluded : styles.toggleExcluded}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleInclude();
            }}
            aria-label={card.print.include ? 'Hide from print' : 'Include in print'}
            title={card.print.include ? 'Hide from print' : 'Include in print'}
          >
            {card.print.include ? '✓' : '–'}
          </button>
        )}
        <span className={styles.title}>
          {card.continuationOf && <span className={styles.backBadge}>↩</span>}
          {card.title}
          {splitCount > 1 && <span className={styles.splitBadge}>×{splitCount}</span>}
        </span>
        <span className={styles.metaRight}>
          {card.rules.actionCost && <ActionCostDisplay cost={card.rules.actionCost} />}
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

      {(card.rules.range ||
        card.rules.area ||
        card.rules.targets ||
        card.rules.defense ||
        card.rules.duration) && (
        <div className={styles.spellMeta}>
          {card.rules.range && (
            <span>
              <span className={styles.spellMetaLabel}>Range</span> {card.rules.range}
            </span>
          )}
          {card.rules.area && (
            <span>
              <span className={styles.spellMetaLabel}>Area</span> {card.rules.area}
            </span>
          )}
          {card.rules.targets && (
            <span>
              <span className={styles.spellMetaLabel}>Targets</span> {card.rules.targets}
            </span>
          )}
          {card.rules.defense && (
            <span>
              <span className={styles.spellMetaLabel}>Defense</span> {card.rules.defense}
            </span>
          )}
          {card.rules.duration && (
            <span>
              <span className={styles.spellMetaLabel}>Duration</span> {card.rules.duration}
            </span>
          )}
        </div>
      )}

      {skillLabel && (
        <div className={styles.skillTopField}>
          <span className={styles.skillTopLabel}>{skillLabel}:</span>
          <span className={styles.skillTopSign}>+</span>
          <span className={styles.skillTopBlank} />
        </div>
      )}

      <div className={styles.summary}>{renderBold(card.rules.summary)}</div>

      {card.rules.criticalSuccess && (
        <div className={styles.outcomeField}>
          <span className={styles.outcomeLabel}>Critical Success</span>
          {renderBold(card.rules.criticalSuccess)}
        </div>
      )}
      {card.rules.success && (
        <div className={styles.outcomeField}>
          <span className={styles.outcomeLabel}>Success</span>
          {renderBold(card.rules.success)}
        </div>
      )}
      {card.rules.failure && (
        <div className={styles.outcomeField}>
          <span className={styles.outcomeLabel}>Failure</span>
          {renderBold(card.rules.failure)}
        </div>
      )}
      {card.rules.criticalFailure && (
        <div className={styles.outcomeField}>
          <span className={styles.outcomeLabel}>Critical Failure</span>
          {renderBold(card.rules.criticalFailure)}
        </div>
      )}

      {card.rules.extraSections?.map((sec, i) => (
        <div key={i} className={styles.extraSection}>
          {sec.heading && <span className={styles.outcomeLabel}>{sec.heading}</span>}
          {sec.body ? (
            renderBold(sec.body)
          ) : (
            <span className={styles.runeBodyPlaceholder}>See AoN ↗</span>
          )}
        </div>
      ))}

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
        const skillRows = effectiveWritableFields.filter((f) => f.type === 'skill-row');
        const otherFields = effectiveWritableFields.filter((f) => f.type !== 'skill-row');
        return (
          <>
            {skillRows.length > 0 && (
              <div className={styles.skillTable}>
                <div className={styles.skillColumnHeader}>
                  <span className={styles.skillName} />
                  <span className={styles.skillTeml}>T&nbsp;E&nbsp;M&nbsp;L</span>
                  <span className={styles.skillTotalHeader}>Bonus</span>
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
                          {' '.repeat(f.size === 'lg' ? 20 : f.size === 'md' ? 12 : 6)}
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
