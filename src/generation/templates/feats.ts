import type { CharacterModel, CharacterFeat } from "../../model/character";
import type { CardModel, CardCategory } from "../../model/cards";
import { buildStableKey } from "../../rules/nameNormalization";
import { notesField, defaultCard } from "./_helpers";
import { parseActionCost } from "../../import/pathbuilderAdapter";
import { aonSearchUrl } from "../../rules/aonUrlResolver";

function featCategory(feat: CharacterFeat): CardCategory {
  if (feat.actionCost) {
    const cost = parseActionCost(feat.actionCost);
    if (cost === "reaction") return "reaction";
    if (cost === "free") return "free-action";
    return "feat-action";
  }
  return "feat-passive";
}

function defaultInclude(feat: CharacterFeat): boolean {
  // Include if it has an action cost, trigger, frequency, or is class/ancestry
  return !!(
    feat.actionCost ||
    feat.trigger ||
    feat.frequency ||
    feat.type === "class" ||
    feat.type === "ancestry"
  );
}

export function generateFeatCards(char: CharacterModel): CardModel[] {
  return char.feats.map((feat) => {
    const cost = parseActionCost(feat.actionCost);
    const category = featCategory(feat);
    const stableKey = buildStableKey(`feat:${feat.type}`, feat.name);

    return defaultCard({
      title: feat.name,
      subtitle: `${feat.type.charAt(0).toUpperCase() + feat.type.slice(1)} Feat ${feat.level > 0 ? `· Level ${feat.level}` : ""}`,
      category,
      stableKey,
      source: {
        system: "generated",
        originalName: feat.name,
        aonUrl: feat.sourceUrl ?? aonSearchUrl(feat.name),
        pathbuilderPath: `build.feats`,
      },
      rules: {
        actionCost: cost,
        traits: feat.traits,
        level: feat.level,
        trigger: feat.trigger,
        requirements: feat.requirements,
        frequency: feat.frequency,
        summary: feat.summary ?? "Rules summary not imported. Add a short table-facing summary or use the source link.",
      },
      print: { include: defaultInclude(feat), priority: 30, size: "standard" },
      writableFields: feat.actionCost ? [notesField()] : [],
    });
  });
}
