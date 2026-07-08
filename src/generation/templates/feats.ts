import { parseActionCost } from '../../import/pathbuilderAdapter';
import type { CardCategory, CardModel } from '../../model/cards';
import type { CharacterFeat, CharacterModel } from '../../model/character';
import { aonSearchUrl } from '../../rules/aonUrlResolver';
import { buildStableKey } from '../../rules/nameNormalization';
import { defaultCard, notesField } from './_helpers';

function featCategory(feat: CharacterFeat): CardCategory {
  // All feats stay in feat categories regardless of action cost so the rank
  // label always shows "Feat N" rather than the generic "Reaction" / "Free".
  if (feat.actionCost) {
    return 'feat-action';
  }
  return 'feat-passive';
}

function defaultInclude(feat: CharacterFeat): boolean {
  // Include if it has an action cost, trigger, frequency, or is class/ancestry
  return !!(
    feat.actionCost ||
    feat.trigger ||
    feat.frequency ||
    feat.type === 'class' ||
    feat.type === 'ancestry'
  );
}

export function generateFeatCards(char: CharacterModel): CardModel[] {
  return char.feats.map((feat) => {
    const cost = parseActionCost(feat.actionCost);
    const category = featCategory(feat);
    const stableKey = buildStableKey(`feat:${feat.type}`, feat.name);

    return defaultCard({
      title: feat.name,
      // No subtitle — feat type is conveyed by the card theme and rank label.
      // Level is intentionally omitted here: feat.level is the *character* level
      // at which the feat slot was filled, not the feat's own minimum level.
      // AoN enrichment fills in the correct feat level via rules.level.
      category,
      stableKey,
      source: {
        system: 'generated',
        originalName: feat.name,
        aonUrl: feat.sourceUrl ?? aonSearchUrl(feat.name),
        pathbuilderPath: `build.feats`,
      },
      rules: {
        actionCost: cost,
        traits: feat.traits,
        // Store the character level as a display fallback; AoN enrichment
        // overwrites this with the feat's correct minimum level when it runs.
        level: feat.level > 0 ? feat.level : undefined,
        trigger: feat.trigger,
        requirements: feat.requirements,
        frequency: feat.frequency,
        summary:
          feat.summary ??
          'Rules summary not imported. Add a short table-facing summary or use the source link.',
      },
      print: { include: defaultInclude(feat), priority: 30, size: 'standard' },
      writableFields: feat.actionCost ? [notesField()] : [],
    });
  });
}
