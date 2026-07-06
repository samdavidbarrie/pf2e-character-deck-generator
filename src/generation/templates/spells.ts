import type { CharacterModel, CharacterSpell } from "../../model/character";
import type { CardModel } from "../../model/cards";
import { buildStableKey } from "../../rules/nameNormalization";
import { blankField, notesField, defaultCard } from "./_helpers";
import { aonSearchUrl } from "../../rules/aonUrlResolver";

function buildSpellCard(spell: CharacterSpell, isFocus: boolean): CardModel {
  const category = isFocus ? "focus-spell" : "spell";
  const stableKey = isFocus
    ? buildStableKey("focus-spell", spell.name)
    : buildStableKey("spell", spell.tradition ?? "unknown", `rank-${spell.rank}`, spell.name);

  const subtitle = isFocus
    ? `Focus Spell · ${spell.tradition ?? ""}`
    : `Rank ${spell.rank} · ${spell.tradition ?? ""}`;

  return defaultCard({
    title: spell.name,
    subtitle: subtitle.trim().replace(/^·\s*|·\s*$/g, "").trim(),
    category,
    stableKey,
    source: {
      system: "generated",
      originalName: spell.name,
      aonUrl: aonSearchUrl(spell.name),
    },
    rules: {
      actionCost: undefined,
      traits: spell.traits,
      rank: spell.rank,
      summary: spell.summary ?? "Rules summary not imported. Add a short table-facing summary or use the source link.",
    },
    print: { include: true, priority: isFocus ? 42 : 40, size: "standard" },
    writableFields: [
      blankField("Spell DC", "sm"),
      blankField("Spell Attack", "sm"),
      ...(isFocus ? [blankField("Focus Points", "sm")] : []),
      notesField("Heightened"),
    ],
  });
}

export function generateSpellCards(char: CharacterModel): CardModel[] {
  return char.spells.map((s) => buildSpellCard(s, false));
}

export function generateFocusSpellCards(char: CharacterModel): CardModel[] {
  const cards = char.focusSpells.map((s) => buildSpellCard(s, true));

  if (char.focusSpells.length > 0) {
    // Refocus reminder card
    cards.push(
      defaultCard({
        title: "Refocus",
        subtitle: "Restore Focus Points",
        category: "reminder",
        stableKey: buildStableKey("reminder", "refocus"),
        rules: {
          actionCost: "variable",
          traits: ["concentrate"],
          summary: "Spend 10 minutes performing activities intrinsic to your magical tradition to regain 1 Focus Point (up to your max).",
        },
        print: { include: true, priority: 43, size: "standard" },
        writableFields: [blankField(`Focus Pool (max ${char.focusPoints ?? 1})`, "sm")],
      })
    );
  }

  return cards;
}
