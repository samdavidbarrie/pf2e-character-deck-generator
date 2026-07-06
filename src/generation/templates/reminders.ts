import type { CardModel } from "../../model/cards";
import { buildStableKey } from "../../rules/nameNormalization";
import { checkboxField, notesField, blankField, defaultCard } from "./_helpers";

interface ReminderDef {
  title: string;
  subtitle?: string;
  stableKeySuffix: string;
  summary: string;
  fields?: CardModel["writableFields"];
}

const REMINDERS: ReminderDef[] = [
  {
    title: "Multiple Attack Penalty",
    subtitle: "MAP",
    stableKeySuffix: "map",
    summary: "1st attack: no penalty. 2nd attack: –5 (–4 agile). 3rd+ attack: –10 (–8 agile).",
  },
  {
    title: "Hero Points",
    stableKeySuffix: "hero-points",
    summary: "Spend 1: reroll a d20 and take the better result. Spend all 3: avoid dying when you would be reduced to 0 HP.",
    fields: [checkboxField("Hero Points", 3)],
  },
  {
    title: "Dying & Wounded",
    stableKeySuffix: "dying-wounded",
    summary: "At 0 HP: gain Dying 1 (or higher if Wounded). Each turn: Recovery Check (DC 10 + Dying value). Dying 4 = dead. On recovery: remove Dying, gain Wounded +1.",
    fields: [blankField("Dying", "sm"), blankField("Wounded", "sm"), blankField("Doomed", "sm")],
  },
  {
    title: "Persistent Damage",
    stableKeySuffix: "persistent-damage",
    summary: "At end of your turn: take damage, then attempt a DC 15 flat check. On success: remove condition. Others can Aid (reduce DC to 10).",
    fields: [notesField("Persistent effects")],
  },
  {
    title: "Cover & Concealment",
    stableKeySuffix: "cover-concealment",
    summary: "Lesser cover: +1 AC. Standard cover: +2 AC and Reflex, can Hide. Greater cover: +4 AC and Reflex, can Hide. Concealed: –2 attack vs. you. Hidden: –4 attack vs. you and must Seek.",
  },
  {
    title: "Common Conditions",
    stableKeySuffix: "common-conditions",
    summary: "Frightened: –X to checks and DCs (reduces by 1/round). Flat-footed: –2 AC. Prone: –2 attack, +2 AC vs. ranged. Grabbed: flat-footed + can't move.",
    fields: [notesField("Active conditions")],
  },
  {
    title: "Rest & Daily Prep",
    stableKeySuffix: "rest-daily-prep",
    summary: "8 hours of sleep: refocus, regain HP (level × con mod, min 1). Daily prep: prepare spells, re-invest items, activate daily consumables.",
  },
];

export function generateReminderCards(): CardModel[] {
  return REMINDERS.map((r) =>
    defaultCard({
      title: r.title,
      subtitle: r.subtitle,
      category: "reminder",
      stableKey: buildStableKey("reminder", r.stableKeySuffix),
      rules: { traits: [], summary: r.summary },
      print: { include: false, priority: 90, size: "standard" },
      writableFields: r.fields ?? [],
    })
  );
}
