import { Fragment } from 'react';
import { splitOverflowCards } from '../generation/generateDeck';
import type { ActionCost, CardCategory, CardModel } from '../model/cards';
import { ACTION_COST_LABEL, TEML_RANKS } from '../model/cards';
import styles from './CardPreview.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// PF2e card visual helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Derive tradition from a spell card's traits. */
function traditionFromTraits(traits: string[]): string {
  const known = new Set(['arcane', 'divine', 'occult', 'primal']);
  return traits.find((t) => known.has(t.toLowerCase()))?.toLowerCase() ?? '';
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
    const tradition = traditionFromTraits(card.rules.traits);
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
    'creature-summary': { tabLabel: 'Creature', themeClass: styles.themeCreature },
    'creature-skill': { tabLabel: 'Creature', themeClass: styles.themeCreature },
    'creature-attack': { tabLabel: 'Creature', themeClass: styles.themeCreature },
    'creature-action': { tabLabel: 'Creature', themeClass: styles.themeCreature },
    armor: { tabLabel: 'Armor', themeClass: styles.themeArmor },
    shield: { tabLabel: 'Shield', themeClass: styles.themeShield },
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
    // Focus spells have no fixed rank — they scale with the character's level.
    return 'Focus';
  }
  if (card.category === 'equipment' && card.rules.level !== undefined) {
    return `Item ${card.rules.level}`;
  }
  // Weapons, armor, and shields show item level the same way equipment cards do.
  if (
    (card.category === 'weapon' || card.category === 'armor' || card.category === 'shield') &&
    card.rules.level !== undefined
  ) {
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
    'creature-summary': 'Creature',
    'creature-skill': 'Skills',
    'creature-attack': 'Attack',
    // Creature-action cards may be passive (familiar abilities, passive companion
    // features) — show 'Passive' when there is no action cost.
    'creature-action': card.rules.actionCost ? 'Action' : 'Passive',
  };
  return labelMap[card.category] ?? '';
}

interface Props {
  card: CardModel;
  selected?: boolean;
  onClick?: () => void;
  /** Called instead of onClick when the user Ctrl/Cmd+clicks the card. */
  onModifierClick?: () => void;
  forPrint?: boolean;
}

const BASE = import.meta.env.BASE_URL;

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
  `(\\*\\*\\*[^*]+\\*\\*\\*|\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|_{3,}|${INLINE_ACTION_ICONS.map(([s]) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'g',
);

/** Render text with ***field-label***, **bold**, *italic* markers and action icons. ___ becomes an inline blank. */
function renderBold(text: string): React.ReactNode {
  const parts = text.split(INLINE_ACTION_SPLIT_RE);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith('***') && part.endsWith('***')) {
      return (
        <span key={i} className={styles.fieldLabelInline}>
          {part.slice(3, -3)}
        </span>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (/^_{3,}$/.test(part)) {
      return <span key={i} className={styles.inlineBlank} />;
    }
    const icon = INLINE_ACTION_ICONS.find(([s]) => s === part);
    if (icon) {
      return <img key={i} src={icon[1]} className={styles.actionIconInline} alt={part} />;
    }
    return part || null;
  });
}

/**
 * Render multi-line markdown text for the summary field.
 * Lines containing only `---` become `<hr>` separators.
 * Each newline becomes a `<br>`. Inline **bold**, *italic*, and action icons
 * are handled by `renderBold`.
 */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const prevWasBlock =
          i > 0 && (lines[i - 1].trim() === '---' || lines[i - 1].trim() === '[newcard]');
        if (line.trim() === '---') return <hr key={i} className={styles.cardHr} />;
        if (line.trim() === '[newcard]') return <hr key={i} className={styles.cardSplitMark} />;
        if (line.startsWith('>'))
          return (() => {
            let p = 0;
            while (p < line.length && line[p] === '>') p++;
            return (
              <span key={i}>
                {i > 0 && !prevWasBlock && <br />}
                {Array.from({ length: p }, (_, j) => (
                  <span key={j} className={styles.padUnit} />
                ))}
                {renderBold(line.slice(p))}
              </span>
            );
          })();
        return (
          <Fragment key={i}>
            {i > 0 && !prevWasBlock && <br />}
            {renderBold(line)}
          </Fragment>
        );
      })}
    </>
  );
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
  // "2+" actions: show the 2-action image followed by a "+" indicator.
  if (cost === '2+') {
    const twoIcon = ACTION_ICON['2'];
    return (
      <span className={styles.actionRange}>
        {twoIcon && <img src={twoIcon} className={styles.actionIcon} alt="2 actions" />}
        <span className={styles.actionRangeDash}>+</span>
      </span>
    );
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

export function CardPreview({ card, selected, onClick, onModifierClick, forPrint }: Props) {
  const splitCount = !forPrint && !card.continuationOf ? splitOverflowCards([card]).length : 1;

  // Title font size defaults to 10pt (CSS). Override stored in card.userEdits.titleFontSize.

  // For spell cards, only show Spell DC when defense is a save, Spell Attack when it's a
  // spell-attack roll. If neither applies (e.g. auto-hit spells like Force Barrage) hide both.
  const isSpellCard = card.category === 'spell' || card.category === 'focus-spell';
  const defenseIsSave =
    isSpellCard &&
    !!card.rules.defense &&
    /\b(fortitude|reflex|will|fort)\b/i.test(card.rules.defense);

  // Item level always shows in the top-right corner via getRankLabel; never
  // duplicate it in the metadata row.

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

  /** Sort traits: rarity → size → others (stable within each group). */
  function traitSortKey(t: string): number {
    const lower = t.toLowerCase();
    if (rarityTraits.has(lower)) return 0;
    if (sizeTraits.has(lower)) return 1;
    return 2;
  }

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
      onClick={(e) => {
        if ((e.metaKey || e.ctrlKey) && onModifierClick) {
          e.stopPropagation();
          onModifierClick();
        } else {
          onClick?.();
        }
      }}
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
          <div className={styles.titleGroup}>
            <span
              className={styles.title}
              style={
                card.userEdits.titleFontSize
                  ? ({ fontSize: `${card.userEdits.titleFontSize}pt` } as React.CSSProperties)
                  : undefined
              }
            >
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

        {(() => {
          const hasTraits = card.rules.traits.length > 0;
          const hasWeaponMeta = !!(
            card.rules.hands ||
            card.rules.weaponType ||
            card.rules.weaponCategory ||
            card.rules.weaponGroup
          );
          const hasArmorMeta =
            card.rules.armorAC !== undefined ||
            card.rules.dexCap !== undefined ||
            card.rules.checkPenalty !== undefined ||
            card.rules.speedPenalty !== undefined ||
            card.rules.strengthReq !== undefined ||
            card.rules.hardness !== undefined ||
            card.rules.shieldHP !== undefined;
          const hasItemMeta = !!(card.rules.usage || card.rules.bulk || card.rules.price);
          const firstMeta = hasWeaponMeta || hasArmorMeta;
          return (
            <>
              {hasTraits && (
                <div className={styles.traits}>
                  {[...card.rules.traits]
                    .sort((a, b) => traitSortKey(a) - traitSortKey(b))
                    .map((t) => {
                      const lower = t.toLowerCase();
                      const traitClass = rarityTraits.has(lower)
                        ? styles[lower]
                        : sizeTraits.has(lower)
                          ? styles.size
                          : '';
                      return (
                        <span
                          key={t}
                          className={[styles.trait, traitClass].filter(Boolean).join(' ')}
                        >
                          {t}
                        </span>
                      );
                    })}
                </div>
              )}

              {/* Separator after traits if there's any meta below */}
              {hasTraits && (firstMeta || hasItemMeta) && <hr className={styles.cardHr} />}

              {hasWeaponMeta && (
                <div className={styles.inlineMeta}>
                  {card.rules.hands && (
                    <span>
                      <span className={styles.fieldLabelInline}>Hands</span> {card.rules.hands}
                    </span>
                  )}
                  {card.rules.weaponType && (
                    <span>
                      <span className={styles.fieldLabelInline}>Type</span> {card.rules.weaponType}
                    </span>
                  )}
                  {card.rules.weaponCategory && (
                    <span>
                      <span className={styles.fieldLabelInline}>Category</span>{' '}
                      {card.rules.weaponCategory}
                    </span>
                  )}
                  {card.rules.weaponGroup && (
                    <span>
                      <span className={styles.fieldLabelInline}>Group</span>{' '}
                      {card.rules.weaponGroup}
                    </span>
                  )}
                </div>
              )}

              {hasArmorMeta && (
                <div className={styles.inlineMeta}>
                  {card.rules.armorAC !== undefined && (
                    <span>
                      <span className={styles.fieldLabelInline}>AC</span> +{card.rules.armorAC}
                    </span>
                  )}
                  {card.rules.dexCap !== undefined && (
                    <span>
                      <span className={styles.fieldLabelInline}>Max Dex</span> +{card.rules.dexCap}
                    </span>
                  )}
                  {card.rules.checkPenalty !== undefined && card.rules.checkPenalty !== 0 && (
                    <span>
                      <span className={styles.fieldLabelInline}>Check</span>{' '}
                      {card.rules.checkPenalty}
                    </span>
                  )}
                  {card.rules.speedPenalty && (
                    <span>
                      <span className={styles.fieldLabelInline}>Speed</span>{' '}
                      {card.rules.speedPenalty}
                    </span>
                  )}
                  {card.rules.strengthReq !== undefined && (
                    <span>
                      <span className={styles.fieldLabelInline}>Str</span> {card.rules.strengthReq}+
                    </span>
                  )}
                  {card.rules.hardness !== undefined && (
                    <span>
                      <span className={styles.fieldLabelInline}>Hardness</span>{' '}
                      {card.rules.hardness}
                    </span>
                  )}
                </div>
              )}

              {/* Separator between first meta group and bulk/price */}
              {firstMeta && hasItemMeta && <hr className={styles.cardHr} />}

              {hasItemMeta && (
                <div className={styles.inlineMeta}>
                  {card.rules.usage && (
                    <span>
                      <span className={styles.fieldLabelInline}>Usage</span> {card.rules.usage}
                    </span>
                  )}
                  {card.rules.bulk && (
                    <span>
                      <span className={styles.fieldLabelInline}>Bulk</span> {card.rules.bulk}
                    </span>
                  )}
                  {card.rules.price && (
                    <span>
                      <span className={styles.fieldLabelInline}>Price</span> {card.rules.price}
                    </span>
                  )}
                </div>
              )}

              {/* Separator after ALL meta before content */}
              {(firstMeta || hasItemMeta) && <hr className={styles.cardHr} />}
            </>
          );
        })()}
        {card.rules.activateTag && card.rules.actionCost && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Activate</span>{' '}
            <ActionCostDisplay cost={card.rules.actionCost} /> {card.rules.activateTag}
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
        {card.rules.bonus && (
          <div className={styles.bonusField}>{renderBold(card.rules.bonus)}</div>
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

        {card.rules.summary && (
          <div
            className={styles.summary}
            style={
              card.userEdits.bodyFontSize
                ? ({ fontSize: `${card.userEdits.bodyFontSize}pt` } as React.CSSProperties)
                : undefined
            }
          >
            {renderMarkdown(card.rules.summary)}
          </div>
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

        {card.mergedInto && !forPrint && (
          <div className={styles.mergedIntoBadge}>↗ Merged into: {card.mergedInto}</div>
        )}

        {(() => {
          // ── Currency layout (Wealth card) ─────────────────────────────
          if (card.layout === 'currency') {
            return (
              <div className={styles.currencyBody}>
                {effectiveWritableFields.map((f, i, arr) => (
                  <div
                    key={f.id}
                    className={f.size === 'lg' ? styles.currencyRowNotes : styles.currencyRow}
                  >
                    <span className={styles.hpLabel}>{f.label}</span>
                    {i < arr.length - 1 && <span className={styles.blankFull} />}
                  </div>
                ))}
              </div>
            );
          }

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

            return (
              <div className={styles.twoColBody}>
                {/* ── Left column: HP → saves ── */}
                <div className={styles.twoColLeft}>
                  {qf(1).map(renderHpField)}
                  <div className={styles.saveTable}>
                    {qf(3).map((f) => {
                      const rankIndex = TEML_RANKS.indexOf(f.rank as (typeof TEML_RANKS)[number]);
                      const circleArr = TEML_RANKS.map((_, i) => (i <= rankIndex ? '●' : '○'));
                      return (
                        <Fragment key={f.id}>
                          {f.label === 'Perception' && <div className={styles.saveTableSep} />}
                          <div className={styles.skillRow}>
                            <span className={styles.skillName}>{f.label}</span>
                            {f.type === 'skill-row'
                              ? circleArr.map((c, i) => (
                                  <span key={i} className={styles.skillCircle}>
                                    {c}
                                  </span>
                                ))
                              : TEML_RANKS.map((_, i) => (
                                  <span key={i} className={styles.skillCircle} />
                                ))}
                            <span className={styles.skillTotal} />
                          </div>
                        </Fragment>
                      );
                    })}
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
          // Notes-type fields are rendered via the dedicated userNotes section below.
          const otherFields = effectiveWritableFields.filter(
            (f) => f.type !== 'skill-row' && f.type !== 'notes',
          );
          return (
            <>
              {skillRows.length > 0 && (
                <div className={styles.skillTable}>
                  <div className={styles.skillColumnHeader}>
                    <span className={styles.skillName} />
                    <span className={styles.skillCircleHeader}>T</span>
                    <span className={styles.skillCircleHeader}>E</span>
                    <span className={styles.skillCircleHeader}>M</span>
                    <span className={styles.skillCircleHeader}>L</span>
                    <span className={styles.skillTotalHeader}>Bonus</span>
                  </div>
                  {skillRows.map((f) => {
                    const rankIndex = TEML_RANKS.indexOf(f.rank as (typeof TEML_RANKS)[number]);
                    const circles = TEML_RANKS.map((_, i) => (i <= rankIndex ? '●' : '○'));
                    return (
                      <div key={f.id} className={styles.skillRow}>
                        <span className={styles.skillName}>
                          {f.label
                            .split(/\s+/)
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(' ')}
                        </span>
                        {circles.map((c, i) => (
                          <span key={i} className={styles.skillCircle}>
                            {c}
                          </span>
                        ))}
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
                    if (f.type === 'hp') {
                      return (
                        <div key={f.id} className={styles.hpField}>
                          <span className={styles.hpLabel}>{f.label}</span>
                          <span className={f.size === 'lg' ? styles.blankTall : styles.blankFull} />
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
                        ) : f.type === 'notes' ? null : ( // Should not be reached — notes are filtered out of otherFields.
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
