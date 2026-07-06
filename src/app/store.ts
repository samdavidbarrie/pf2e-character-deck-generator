import { create } from "zustand";
import type { DeckProject, PrintSettings } from "../model/deckProject";
import type { CardModel } from "../model/cards";
import { DEFAULT_PRINT_SETTINGS } from "../model/deckProject";
import { generateDeck, type GenerationWarning } from "../generation/generateDeck";
import { validateImport, type ValidationResult } from "../import/validateImport";
import { parsePathbuilder } from "../import/pathbuilderAdapter";
import { detectSource } from "../import/detectSource";
import {
  fetchAonData,
  applyAonDataToCard,
  detectFeatMerges,
} from "../rules/aonEnrichment";

export type AppScreen = "import" | "deck-builder" | "print-preview";

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
  screen: "import",
  project: null,
  selectedCardId: null,
  searchQuery: "",
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
      if (source !== "pathbuilder") {
        return { success: false, errors: ["Unsupported source format."] };
      }

      const character = parsePathbuilder(json);
      const { cards, warnings } = generateDeck(character);

      const now = new Date().toISOString();
      const project: DeckProject = {
        appVersion: "0.1.0",
        createdAt: now,
        updatedAt: now,
        character,
        cards,
        printSettings: DEFAULT_PRINT_SETTINGS,
        importHistory: [],
      };

      set({ project, generationWarnings: warnings, screen: "deck-builder", selectedCardId: null });
      return { success: true, errors: [] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error during import.";
      return { success: false, errors: [msg] };
    }
  },

  selectCard: (id) => set({ selectedCardId: id }),

  updateCard: (id, patch) =>
    set((state) => {
      if (!state.project) return {};
      const cards = state.project.cards.map((c) =>
        c.id === id ? { ...c, ...patch, userEdits: { ...c.userEdits, edited: true } } : c
      );
      return { project: { ...state.project, cards, updatedAt: new Date().toISOString() } };
    }),

  toggleCardInclude: (id) =>
    set((state) => {
      if (!state.project) return {};
      const cards = state.project.cards.map((c) =>
        c.id === id ? { ...c, print: { ...c.print, include: !c.print.include } } : c
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
        source: { ...original.source, system: "manual" },
        userEdits: { edited: false },
      };
      const cards = [...state.project.cards.slice(0, idx + 1), copy, ...state.project.cards.slice(idx + 1)];
      return { project: { ...state.project, cards, updatedAt: new Date().toISOString() } };
    }),

  addManualCard: () =>
    set((state) => {
      if (!state.project) return {};
      const id = `manual-${crypto.randomUUID()}`;
      const card: CardModel = {
        id,
        stableKey: `manual:${id}`,
        title: "New Card",
        category: "manual",
        source: { system: "manual" },
        rules: { traits: [], summary: "" },
        writableFields: [],
        print: { include: true, priority: 50, size: "standard" },
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
      const cards = state.project.cards.map((c) =>
        c.id === id ? { ...freshCard, id: c.id } : c
      );
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
        const data = aonDataMap.get(card.title);
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

          // Add child info to parent
          cardById.set(parentId, {
            ...parent,
            mergedChildren: [
              ...(parent.mergedChildren ?? []),
              { name: child.title, level: child.rules.level, summary: child.rules.summary },
            ],
          });

          // Hide child and mark it as merged
          cardById.set(childId, {
            ...child,
            print: { ...child.print, include: false },
            mergedInto: parent.title,
          });
        }

        cards = [...cardById.values()];
      }

      set({
        project: { ...project, cards, updatedAt: new Date().toISOString() },
        enriching: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AoN enrichment failed.";
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
    set({ project, screen: "deck-builder", selectedCardId: null, generationWarnings: [] }),

  clearProject: () => set({ project: null, screen: "import", selectedCardId: null }),
}));
