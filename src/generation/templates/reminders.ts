import type { CardModel } from '../../model/cards';
import { buildStableKey } from '../../rules/nameNormalization';
import { defaultCard } from './_helpers';

interface ReminderDef {
  title: string;
  subtitle?: string;
  stableKeySuffix: string;
  summary: string;
  fields?: CardModel['writableFields'];
}

const REMINDERS: ReminderDef[] = [];

export function generateReminderCards(): CardModel[] {
  return REMINDERS.map((r) =>
    defaultCard({
      title: r.title,
      subtitle: r.subtitle,
      category: 'reminder',
      stableKey: buildStableKey('reminder', r.stableKeySuffix),
      rules: { traits: [], summary: r.summary },
      print: { include: false, priority: 90, size: 'standard' },
      writableFields: r.fields ?? [],
    }),
  );
}
