import type { CardModel } from './cards';
import type { CharacterModel } from './character';

export interface PrintSettings {
  paper: 'A4';
  cardSize: 'poker';
  layout: '3x3';
  showCutGuides: boolean;
  includeHidden: boolean;
}

export interface ImportSnapshot {
  id: string;
  importedAt: string;
  characterName: string;
  level: number;
  sourceHash: string;
  normalizedHash: string;
  cardHashes: Record<string, string>;
}

export interface DeckProject {
  appVersion: string;
  createdAt: string;
  updatedAt: string;

  character: CharacterModel;
  cards: CardModel[];

  printSettings: PrintSettings;

  importHistory: ImportSnapshot[];
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paper: 'A4',
  cardSize: 'poker',
  layout: '3x3',
  showCutGuides: true,
  includeHidden: false,
};
