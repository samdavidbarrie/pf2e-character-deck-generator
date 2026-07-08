import { Fragment } from 'react';
import { splitOverflowCards } from '../generation/generateDeck';
import type { ActionCost, CardCategory, CardModel } from '../model/cards';
import { ACTION_COST_LABEL, TEML_RANKS } from '../model/cards';
import styles from './CardPreview.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// PF2e card visual helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract tradition name from subtitle strings like "Rank 3 · Arcane" or "Focus Spell · Primal". */
function parseTradition(subtitle: string | undefined): string {
  if (!subtitle) return '';
  const after = subtitle.split('·').pop()?.trim().toLowerCase() ?? '';
  return after;
}

const TRADITION_CLASS: Record<string, string> = {
  arcane: styles.themeArcane,
  divine: styles.themeDivine,
  occult: styles.themeOccult,
  primal: styles.themePrimal,
};

const TRADITION_LABEL: Record<string, string> = {
  arcane: 'Arcane',
  divine: 'Divine',
  occult: 'Occult',
  primal: 'Primal',
};

interface CardTabInfo {
  tabLabel: string;
  themeClass: string;
}

function getCardTabInfo(card: CardModel): CardTabInfo {
  if (card.category === 'spell' || card.category === 'focus-spell') {
    const tradition = parseTradition(card.subtitle);
    if (TRADITION_LABEL[tradition]) {
      return { tabLabel: TRADITION_LABEL[tradition], themeClass: TRADITION_CLASS[tradition] };
    }
    if (card.category === 'focus-spell') {
      return { tabLabel: 'Focus', themeClass: styles.themeFocus };
    }
    return { tabLabel: 'Spell', themeClass: styles.themeSpell };
  }

  const categoryTab: Partial<Record<CardCategory, CardTabInfo>> = {
    'basic-action': { tabLabel: 'Action', themeClass: styles.themeAction },
    'skill-action': { tabLabel: 'Action', themeClass: styles.themeAction },
    'feat-action': { tabLabel: 'Feat', themeClass: styles.themeFeat },
    'feat-passive': { tabLabel: 'Feat', themeClass: styles.themeFeat },
    reaction: { tabLabel: 'Reaction', themeClass: styles.themeAction },
    'free-action': { tabLabel: 'Free', themeClass: styles.themeAction },
    weapon: { tabLabel: 'Weapon', themeClass: styles.themeWeapon },
    equipment: { tabLabel: 'Equipment', themeClass: styles.themeEquipment },
    summary: { tabLabel: '', themeClass: styles.themeSummary },
    reminder: { tabLabel: '', themeClass: styles.themeReminder },
    manual: { tabLabel: '', themeClass: '' },
  };
  return categoryTab[card.category] ?? { tabLabel: '', themeClass: '' };
}

function getRankLabel(card: CardModel): string {
  // Continuation cards don't need a rank — the front card carries that info.
  if (card.continuationOf) return '';

  const isCantrip = card.rules.traits.some((t) => t.toLowerCase() === 'cantrip');
  if (card.category === 'spell') {
    if (isCantrip) return 'Cantrip'; // rank varies by caster level; left blank for pencil-in
    return card.rules.rank !== undefined ? `Spell ${card.rules.rank}` : 'Spell';
  }
  if (card.category === 'focus-spell') {
    if (isCantrip) return 'Cantrip';
    return card.rules.rank !== undefined ? `Focus ${card.rules.rank}` : 'Focus';
  }
  if (card.category === 'equipment' && card.rules.level !== undefined) {
    return `Item ${card.rules.level}`;
  }
  // Feats: include the feat's own minimum level (filled by AoN enrichment).
  if (card.category === 'feat-action' || card.category === 'feat-passive') {
    return card.rules.level !== undefined ? `Feat ${card.rules.level}` : 'Feat';
  }
  const labelMap: Partial<Record<CardCategory, string>> = {
    'basic-action': 'Action',
    'skill-action': 'Skill',
    reaction: 'Reaction',
    'free-action': 'Free',
    weapon: 'Weapon',
    equipment: 'Equipment',
  };
  return labelMap[card.category] ?? '';
}

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
const ACTION_ICON: Partial<Record<ActionCost, string>> = {
  '1': `${BASE}icons/action-1.png`,
  '2': `${BASE}icons/action-2.png`,
  '3': `${BASE}icons/action-3.png`,
  free: `${BASE}icons/action-free.png`,
  reaction: `${BASE}icons/action-reaction.png`,
};

/**
 * Map the Unicode action symbols (stored in card text by replaceActivationActionWords)
 * to inline icon image sources. Multi-character sequences must appear before single ones.
 */
const INLINE_ACTION_ICONS: [string, string][] = [
  ['◆◆◆', ACTION_ICON['3'] ?? ''],
  ['◆◆', ACTION_ICON['2'] ?? ''],
  ['◆', ACTION_ICON['1'] ?? ''],
  ['◇', ACTION_ICON['free'] ?? ''],
  ['↺', ACTION_ICON['reaction'] ?? ''],
].filter(([, src]) => src) as [string, string][];

const INLINE_ACTION_SPLIT_RE = new RegExp(
  `(\\*\\*[^*]+\\*\\*|${INLINE_ACTION_ICONS.map(([s]) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'g',
);

/** Render text with **bold** markers as <strong> and Unicode action symbols as icon images. */
function renderBold(text: string): React.ReactNode {
  const parts = text.split(INLINE_ACTION_SPLIT_RE);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    const icon = INLINE_ACTION_ICONS.find(([s]) => s === part);
    if (icon) {
      return <img key={i} src={icon[1]} className={styles.actionIconInline} alt={part} />;
    }
    return part || null;
  });
}
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
  const hasItemLevel = card.category === 'equipment' && card.rules.level !== undefined;
  const skillLabel = isSkillAction ? (SKILL_FOR_ACTION[card.title] ?? 'Skill') : null;

  // Scale body text to match card density — applied in both deck-builder and print views
  // so the two surfaces look identical.
  const scaleClass = (() => {
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
    if (allChars > 750) return styles.scaleDense;
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
        // Spell DC is now shown inline in the Defense metadata row
        if (f.label === 'Spell DC') return false;
        if (f.label === 'Spell Attack') return card.rules.spellAttack === true;
        return true;
      });
    }
    if (isSkillAction) {
      fields = fields.filter((f) => f.label !== 'Skill bonus');
    }
    return fields;
  })();

  const { tabLabel, themeClass } = getCardTabInfo(card);
  const rankLabel = getRankLabel(card);
  // Show action cost inline in the title row for all cards except equipment activations
  // (where the cost is shown in the Activate metadata line instead).
  const showActionCostInTitle =
    !!card.rules.actionCost && card.rules.actionCost !== 'passive' && card.category !== 'equipment';

  // Rarity-aware trait class: uncommon / rare / unique get coloured pill styles
  const rarityTraits = new Set(['uncommon', 'rare', 'unique']);
  const sizeTraits = new Set(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);

  return (
    <div
      className={[
        styles.card,
        themeClass,
        selected ? styles.selected : '',
        forPrint ? styles.forPrint : '',
        !card.print.include && !forPrint ? styles.hidden : '',
        scaleClass,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-pressed={selected}
    >
      {/* Tradition / category coloured tab */}
      {tabLabel && <div className={styles.traditionTab}>{tabLabel}</div>}

      {/* Card header: TITLE ◆◆  SPELL 3 */}
      <div className={styles.cardHeader}>
        <div className={styles.titleRow}>
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
          <div className={styles.titleGroup}>
            <span className={styles.title}>
              {card.continuationOf && <span className={styles.backBadge}>↩</span>}
              {card.title}
              {splitCount > 1 && <span className={styles.splitBadge}>×{splitCount}</span>}
            </span>
            {showActionCostInTitle && (
              <span className={styles.titleActionCost}>
                <ActionCostDisplay cost={card.rules.actionCost!} />
              </span>
            )}
          </div>
          {rankLabel && !card.rankBlank && <span className={styles.cardRank}>{rankLabel}</span>}
          {card.rankBlank && (
            <span className={styles.cardRankBlank}>
              Level <span className={styles.rankBlankLine} />
            </span>
          )}
        </div>
      </div>
      <div className={styles.headerRule} />

      {/* Padded content body */}
      <div className={styles.cardBody}>
        {/* Subtitle — hidden for feat cards (rank label carries type+level) and
            in print for spell cards (tradition tab + rank replace it). */}
        {(() => {
          const isFeatCard = card.category === 'feat-action' || card.category === 'feat-passive';
          if (!card.subtitle || isFeatCard) return null;
          return (
            <div className={`${styles.subtitle}${isSpellCard ? ` ${styles.subtitleSpell}` : ''}`}>
              {card.subtitle}
            </div>
          );
        })()}

        {card.rules.traits.length > 0 && (
          <div className={styles.traits}>
            {card.rules.traits.map((t) => {
              const lower = t.toLowerCase();
              const traitClass = rarityTraits.has(lower)
                ? styles[lower]
                : sizeTraits.has(lower)
                  ? styles.size
                  : '';
              return (
                <span key={t} className={[styles.trait, traitClass].filter(Boolean).join(' ')}>
                  {t}
                </span>
              );
            })}
          </div>
        )}

        {(hasItemLevel ||
          card.rules.usage ||
          card.rules.bulk ||
          card.rules.activateTag ||
          card.rules.price) && (
          <div className={styles.itemMeta}>
            {/* Row 1: Item; Usage; Bulk */}
            {(hasItemLevel || card.rules.usage || card.rules.bulk) && (
              <div>
                {hasItemLevel && (
                  <>
                    <span className={styles.spellMetaLabel}>Item</span> {card.rules.level}
                  </>
                )}
                {card.rules.usage && (
                  <>
                    {hasItemLevel && '; '}
                    <span className={styles.spellMetaLabel}>Usage</span> {card.rules.usage}
                  </>
                )}
                {card.rules.bulk && (
                  <>
                    {(hasItemLevel || card.rules.usage) && '; '}
                    <span className={styles.spellMetaLabel}>Bulk</span> {card.rules.bulk}
                  </>
                )}
              </div>
            )}
            {/* Row 2: Activate; Price */}
            {((card.rules.activateTag && card.rules.actionCost) || card.rules.price) && (
              <div>
                {card.rules.activateTag && card.rules.actionCost && (
                  <>
                    <span className={styles.spellMetaLabel}>Activate</span>{' '}
                    <ActionCostDisplay cost={card.rules.actionCost} /> {card.rules.activateTag}
                  </>
                )}
                {card.rules.price && (
                  <>
                    {card.rules.activateTag && card.rules.actionCost && '; '}
                    <span className={styles.spellMetaLabel}>Price</span> {card.rules.price}
                  </>
                )}
              </div>
            )}
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
          card.rules.duration) &&
          !card.continuationOf && (
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
                  <span className={styles.spellMetaLabel}>Defense</span>{' '}
                  {defenseIsSave ? (
                    <>
                      DC <span className={styles.inlineDcBlank} /> {card.rules.defense}
                    </>
                  ) : (
                    card.rules.defense
                  )}
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

        {card.rules.summary && (
          <div className={styles.summary}>{renderBold(card.rules.summary)}</div>
        )}

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

        {card.rules.extraSections?.map((sec, i) => {
          const isHeightened = sec.heading?.toLowerCase() === 'heightened';
          // On continuation cards suppress the top border on the first section
          // — without preceding content the border looks like a stray line.
          const suppressBorder = !!card.continuationOf && i === 0;
          const sectionClass = [
            isHeightened ? styles.heightened : styles.extraSection,
            suppressBorder ? styles.noBorderTop : '',
          ]
            .filter(Boolean)
            .join(' ');

          if (isHeightened && sec.body) {
            // Split body into individual "Heightened (Nth) …" entries and
            // render each on its own line with the label styled inline.
            // The heading is intentionally omitted — each entry carries its
            // own "Heightened (Nth)" prefix so there is no duplication.
            const entries = sec.body
              .split(/(?=\bHeightened\s*\()/)
              .map((e) => e.trim())
              .filter(Boolean);
            return (
              <div key={i} className={sectionClass}>
                {entries.map((entry, j) => {
                  const m = /^(Heightened\s*\([^)]+\))\s*([\s\S]*)$/.exec(entry);
                  if (m) {
                    return (
                      <div key={j}>
                        <span className={styles.outcomeLabel}>{m[1]}</span> {renderBold(m[2])}
                      </div>
                    );
                  }
                  return <div key={j}>{renderBold(entry)}</div>;
                })}
              </div>
            );
          }

          return (
            <div key={i} className={sectionClass}>
              {sec.heading && <span className={styles.outcomeLabel}>{sec.heading}</span>}
              {sec.body ? (
                renderBold(sec.body)
              ) : (
                <span className={styles.runeBodyPlaceholder}>See AoN ↗</span>
              )}
            </div>
          );
        })}

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
                {child.summary && (
                  <span className={styles.mergedChildSummary}>{child.summary}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {card.mergedInto && !forPrint && (
          <div className={styles.mergedIntoBadge}>↗ Merged into: {card.mergedInto}</div>
        )}

        {(() => {
          // ── Two-column layout ────────────────────────────────────────────
          if (card.layout === 'quadrant') {
            const qf = (n: 1 | 2 | 3 | 4) =>
              effectiveWritableFields.filter((f) => f.quadrant === n);

            // Minor fields get smaller label + shorter blank
            const MINOR_LABELS = new Set(['Temp HP', 'Shield HP']);

            const renderHpField = (f: (typeof effectiveWritableFields)[number]) => {
              const isMinor = MINOR_LABELS.has(f.label);
              return (
                <div key={f.id} className={isMinor ? styles.hpFieldMinor : styles.hpField}>
                  <span className={styles.hpLabel}>{f.label}</span>
                  <span className={isMinor ? styles.blankSm : styles.blankFull} />
                </div>
              );
            };

            const circles = (rank: string | undefined) => {
              const idx = TEML_RANKS.indexOf(rank as (typeof TEML_RANKS)[number]);
              return TEML_RANKS.map((_, i) => (i <= idx ? '●' : '○')).join('');
            };

            return (
              <div className={styles.twoColBody}>
                {/* ── Left column: HP → saves ── */}
                <div className={styles.twoColLeft}>
                  {qf(1).map(renderHpField)}
                  <div className={styles.saveTable}>
                    {qf(3).map((f) => (
                      <Fragment key={f.id}>
                        {f.label === 'Perception' && <div className={styles.saveTableSep} />}
                        <span className={styles.saveLabel}>{f.label}</span>
                        <span className={styles.saveTeml}>
                          {f.type === 'skill-row' ? circles(f.rank) : ''}
                        </span>
                        <span className={styles.saveBlank} />
                      </Fragment>
                    ))}
                  </div>
                </div>

                {/* ── Right column: defence → speed/senses ── */}
                <div className={styles.twoColRight}>
                  {qf(2).map(renderHpField)}
                  {(() => {
                    const blanks = qf(4).filter((f) => f.type !== 'display');
                    const notes = qf(4).filter((f) => f.type === 'display');
                    return (
                      <>
                        {blanks.map(renderHpField)}
                        {notes.length > 0 && (
                          <div className={styles.notesBlock}>
                            {notes.map((f) => (
                              <div key={f.id} className={styles.sensesNote}>
                                {f.value}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          }

          // ── Standard layout ──────────────────────────────────────────────
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
                    if (f.type === 'display') {
                      return (
                        <div key={f.id} className={styles.displayField}>
                          <span className={styles.displayLabel}>{f.label}:</span>
                          <span className={styles.displayValue}>{f.value}</span>
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
      {/* end cardBody */}
    </div>
  );
}
