import { create } from 'zustand';
import { generateDeck, type GenerationWarning } from '../generation/generateDeck';
import { generateCreatureCards } from '../generation/templates/creatures';
import { detectSource } from '../import/detectSource';
import { parsePathbuilder } from '../import/pathbuilderAdapter';
import { validateImport, type ValidationResult } from '../import/validateImport';
import type { CardModel } from '../model/cards';
import type { DeckProject, PrintSettings } from '../model/deckProject';
import { DEFAULT_PRINT_SETTINGS } from '../model/deckProject';
import {
  applyAonDataToCard,
  applyRuneDescriptions,
  detectFeatMerges,
  enrichLinkedCreaturesFromAon,
  fetchAonData,
  fetchRuneDescriptions,
} from '../rules/aonEnrichment';
import { aonSearchUrl } from '../rules/aonUrlResolver';

export type AppScreen = 'import' | 'deck-builder' | 'print-preview';

interface AppState {
  screen: AppScreen;
  project: DeckProject | null;
  selectedCardId: string | null;
  searchQuery: string;
  categoryFilter: string | null;
  importValidation: ValidationResult | null;
  generationWarnings: GenerationWarning[];
  enriching: boolean;
  enrichError: string | null;

  // Navigation
  goTo: (screen: AppScreen) => void;

  // Import
  setImportValidation: (v: ValidationResult | null) => void;
  importJson: (json: unknown) => { success: boolean; errors: string[] };

  // Deck editing
  selectCard: (id: string | null) => void;
  updateCard: (id: string, patch: Partial<CardModel>) => void;
  toggleCardInclude: (id: string) => void;
  duplicateCard: (id: string) => void;
  addManualCard: () => void;
  reorderCards: (fromIndex: number, toIndex: number) => void;
  resetCardToGenerated: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (c: string | null) => void;

  // AoN enrichment
  enrichCardsFromAon: () => Promise<void>;

  // Print settings
  updatePrintSettings: (patch: Partial<PrintSettings>) => void;

  // Project persistence
  loadProject: (project: DeckProject) => void;
  clearProject: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  screen: 'import',
  project: null,
  selectedCardId: null,
  searchQuery: '',
  categoryFilter: null,
  importValidation: null,
  generationWarnings: [],
  enriching: false,
  enrichError: null,

  goTo: (screen) => set({ screen }),

  setImportValidation: (v) => set({ importValidation: v }),

  importJson: (json) => {
    const validation = validateImport(json);
    set({ importValidation: validation });

    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const source = detectSource(json);
      if (source !== 'pathbuilder') {
        return { success: false, errors: ['Unsupported source format.'] };
      }

      const character = parsePathbuilder(json);
      const { cards, warnings } = generateDeck(character);

      const now = new Date().toISOString();
      const project: DeckProject = {
        appVersion: '0.1.0',
        createdAt: now,
        updatedAt: now,
        character,
        cards,
        printSettings: DEFAULT_PRINT_SETTINGS,
        importHistory: [],
      };

      set({ project, generationWarnings: warnings, screen: 'deck-builder', selectedCardId: null });
      return { success: true, errors: [] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error during import.';
      return { success: false, errors: [msg] };
    }
  },

  selectCard: (id) => set({ selectedCardId: id }),

  updateCard: (id, patch) =>
    set((state) => {
      if (!state.project) return {};
      const cards = state.project.cards.map((c) =>
        c.id === id
          ? {
              ...c,
              ...patch,
              userEdits: { ...c.userEdits, ...(patch.userEdits ?? {}), edited: true },
            }
          : c,
      );
      return { project: { ...state.project, cards, updatedAt: new Date().toISOString() } };
    }),

  toggleCardInclude: (id) =>
    set((state) => {
      if (!state.project) return {};
      const cards = state.project.cards.map((c) =>
        c.id === id ? { ...c, print: { ...c.print, include: !c.print.include } } : c,
      );
      return { project: { ...state.project, cards, updatedAt: new Date().toISOString() } };
    }),

  duplicateCard: (id) =>
    set((state) => {
      if (!state.project) return {};
      const idx = state.project.cards.findIndex((c) => c.id === id);
      if (idx === -1) return {};
      const original = state.project.cards[idx];
      const copy: CardModel = {
        ...original,
        id: `copy-${crypto.randomUUID()}`,
        stableKey: `manual:copy-of-${original.stableKey}`,
        source: { ...original.source, system: 'manual' },
        userEdits: { edited: false },
      };
      const cards = [
        ...state.project.cards.slice(0, idx + 1),
        copy,
        ...state.project.cards.slice(idx + 1),
      ];
      return { project: { ...state.project, cards, updatedAt: new Date().toISOString() } };
    }),

  addManualCard: () =>
    set((state) => {
      if (!state.project) return {};
      const id = `manual-${crypto.randomUUID()}`;
      const card: CardModel = {
        id,
        stableKey: `manual:${id}`,
        title: 'New Card',
        category: 'manual',
        source: { system: 'manual' },
        rules: { traits: [], summary: '' },
        writableFields: [],
        print: { include: true, priority: 50, size: 'standard' },
        userEdits: { edited: false },
      };
      return {
        project: {
          ...state.project,
          cards: [...state.project.cards, card],
          updatedAt: new Date().toISOString(),
        },
        selectedCardId: id,
      };
    }),

  reorderCards: (fromIndex, toIndex) =>
    set((state) => {
      if (!state.project) return {};
      const cards = [...state.project.cards];
      const [moved] = cards.splice(fromIndex, 1);
      cards.splice(toIndex, 0, moved);
      return { project: { ...state.project, cards, updatedAt: new Date().toISOString() } };
    }),

  resetCardToGenerated: (id) =>
    set((state) => {
      if (!state.project) return {};
      // Re-generate from the stored character and find matching stableKey
      const existing = state.project.cards.find((c) => c.id === id);
      if (!existing) return {};
      const { cards: fresh } = generateDeck(state.project.character);
      const freshCard = fresh.find((c) => c.stableKey === existing.stableKey);
      if (!freshCard) return {};
      const cards = state.project.cards.map((c) => (c.id === id ? { ...freshCard, id: c.id } : c));
      return { project: { ...state.project, cards, updatedAt: new Date().toISOString() } };
    }),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),

  enrichCardsFromAon: async () => {
    const { project } = get();
    if (!project) return;

    set({ enriching: true, enrichError: null });

    try {
      const cardStubs = project.cards.map((c) => ({ title: c.title, category: c.category }));
      const aonDataMap = await fetchAonData(cardStubs);

      // Apply AoN data to each card
      let cards = project.cards.map((card) => {
        if (card.continuationOf) return card; // back cards are not independently enriched
        const data = aonDataMap.get(`${card.category}:${card.title}`);
        return data ? applyAonDataToCard(card, data) : card;
      });

      // Detect passive feat merges
      const merges = detectFeatMerges(cards, aonDataMap);

      if (merges.length > 0) {
        const cardById = new Map(cards.map((c) => [c.id, c]));

        for (const { parentId, childId } of merges) {
          const parent = cardById.get(parentId);
          const child = cardById.get(childId);
          if (!parent || !child) continue;

          // Add child info to parent (guard against duplicates on re-enrichment)
          const alreadyMerged = (parent.mergedChildren ?? []).some((c) => c.name === child.title);
          if (!alreadyMerged) {
            cardById.set(parentId, {
              ...parent,
              mergedChildren: [
                ...(parent.mergedChildren ?? []),
                { name: child.title, level: child.rules.level, summary: child.rules.summary },
              ],
            });
          }

          // Hide child and mark it as merged
          cardById.set(childId, {
            ...child,
            print: { ...child.print, include: false },
            mergedInto: parent.title,
          });
        }

        cards = [...cardById.values()];
      }

      // For polymorph / incarnate spell cards, insert a blank form-stats
      // companion card immediately after each one so the player can fill in
      // their chosen form's statistics during preparation.
      const FORM_TRAITS = new Set(['polymorph', 'incarnate']);
      const withCompanions: CardModel[] = [];
      for (const card of cards) {
        withCompanions.push(card);
        const needsCompanion =
          (card.category === 'spell' || card.category === 'focus-spell') &&
          !card.continuationOf &&
          card.rules.traits.some((t) => FORM_TRAITS.has(t.toLowerCase()));
        if (needsCompanion) {
          // Guard against duplicates on re-enrichment
          const companionKey = `${card.stableKey}-form-stats`;
          const alreadyExists = project.cards.some((c) => c.stableKey === companionKey);
          if (!alreadyExists) {
            withCompanions.push({
              id: `${card.id}-form-stats`,
              stableKey: companionKey,
              title: `${card.title} — Form Stats`,
              subtitle: 'Fill in during preparation',
              category: 'manual',
              source: { system: 'manual', originalName: card.title },
              rules: {
                traits: [],
                summary: 'Record your chosen form’s statistics here during daily preparation.',
              },
              writableFields: [
                { id: crypto.randomUUID(), label: 'AC', type: 'blank', size: 'sm' },
                { id: crypto.randomUUID(), label: 'Temp HP', type: 'blank', size: 'sm' },
                { id: crypto.randomUUID(), label: 'Speed', type: 'blank', size: 'sm' },
                { id: crypto.randomUUID(), label: 'Athletics', type: 'blank', size: 'sm' },
                { id: crypto.randomUUID(), label: 'Attack bonus', type: 'blank', size: 'sm' },
                { id: crypto.randomUUID(), label: 'Damage', type: 'blank', size: 'md' },
                { id: crypto.randomUUID(), label: 'Notes', type: 'notes', size: 'lg' },
              ],
              print: { include: true, priority: card.print.priority, size: 'standard' },
              userEdits: { edited: false },
            });
          }
        }
      }
      cards = withCompanions;

      // Enrich animal companions (and familiars) from AoN — fetch attacks,
      // stats, special abilities, support benefit and advanced maneuver.
      const linkedCreatures = project.character.linkedCreatures ?? [];
      let enrichedCharacter = project.character;
      if (linkedCreatures.length > 0) {
        const { creatures: enrichedCreatures, changed } =
          await enrichLinkedCreaturesFromAon(linkedCreatures);
        if (changed) {
          // Preserve any user edits keyed by stableKey before regeneration.
          const userEditsByKey = new Map<string, CardModel['userEdits']>();
          for (const card of cards) {
            if (card.category.startsWith('creature-') && card.userEdits.edited) {
              userEditsByKey.set(card.stableKey, card.userEdits);
            }
          }

          // Regenerate creature cards from the enriched creature data.
          const newCreatureCards: CardModel[] = [];
          enrichedCreatures.forEach((creature, i) => {
            const generated = generateCreatureCards(creature, i);
            newCreatureCards.push(
              ...generated.map((card) => {
                const saved = userEditsByKey.get(card.stableKey);
                return saved ? { ...card, userEdits: saved } : card;
              }),
            );
          });

          // Splice new creature cards in place of old ones, before reminder cards.
          const nonCreature = cards.filter((c) => !c.category.startsWith('creature-'));
          const firstReminderIdx = nonCreature.findIndex(
            (c) => c.category === 'reminder' || c.category === 'manual',
          );
          cards =
            firstReminderIdx === -1
              ? [...nonCreature, ...newCreatureCards]
              : [
                  ...nonCreature.slice(0, firstReminderIdx),
                  ...newCreatureCards,
                  ...nonCreature.slice(firstReminderIdx),
                ];

          enrichedCharacter = { ...project.character, linkedCreatures: enrichedCreatures };
        }
      }

      // Enrich weapon property rune descriptions from AoN
      const runeMap = await fetchRuneDescriptions(cards);
      if (runeMap.size > 0) {
        cards = cards.map((card) => applyRuneDescriptions(card, runeMap));
      }

      // Apply AoN search link fallback for any card still missing a URL
      const NO_SEARCH_CATEGORIES = new Set(['summary', 'reminder', 'manual']);
      cards = cards.map((card) => {
        if (card.continuationOf || card.source.aonUrl || NO_SEARCH_CATEGORIES.has(card.category))
          return card;
        return { ...card, source: { ...card.source, aonUrl: aonSearchUrl(card.title) } };
      });

      set({
        project: {
          ...project,
          character: enrichedCharacter,
          cards,
          updatedAt: new Date().toISOString(),
        },
        enriching: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AoN enrichment failed.';
      set({ enriching: false, enrichError: msg });
    }
  },

  updatePrintSettings: (patch) =>
    set((state) => {
      if (!state.project) return {};
      return {
        project: {
          ...state.project,
          printSettings: { ...state.project.printSettings, ...patch },
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  loadProject: (project) =>
    set({ project, screen: 'deck-builder', selectedCardId: null, generationWarnings: [] }),

  clearProject: () => set({ project: null, screen: 'import', selectedCardId: null }),
}));
