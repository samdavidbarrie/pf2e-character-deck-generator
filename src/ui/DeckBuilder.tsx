import { useAppStore } from '../app/store';
import { splitOverflowCards } from '../generation/generateDeck';
import { CardEditor } from './CardEditor';
import { CardPreview } from './CardPreview';
import styles from './DeckBuilder.module.css';

const CATEGORY_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'summary', label: 'Summaries' },
  { value: 'basic-action', label: 'Basic' },
  { value: 'skill-action', label: 'Skill' },
  { value: 'reaction', label: 'Reactions' },
  { value: 'free-action', label: 'Free' },
  { value: 'feat-action', label: 'Feats' },
  { value: 'feat-passive', label: 'Passives' },
  { value: 'spell', label: 'Spells' },
  { value: 'focus-spell', label: 'Focus Spells' },
  { value: 'weapon', label: 'Weapons' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'reminder', label: 'Reminders' },
  { value: 'manual', label: 'Custom' },
  { value: 'hidden', label: 'Hidden' },
];

export function DeckBuilder() {
  const {
    project,
    selectedCardId,
    searchQuery,
    categoryFilter,
    generationWarnings,
    enriching,
    enrichError,
    selectCard,
    toggleCardInclude,
    addManualCard,
    setSearchQuery,
    setCategoryFilter,
    enrichCardsFromAon,
    goTo,
  } = useAppStore();

  if (!project) return null;

  const cards = project.cards;
  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  const filtered = cards.filter((card) => {
    if (categoryFilter === 'hidden') return !card.print.include;
    if (categoryFilter && categoryFilter !== 'all' && card.category !== categoryFilter)
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!card.title.toLowerCase().includes(q) && !card.rules.summary.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const includedCards = cards.filter((c) => c.print.include);
  const includedCount = includedCards.length;
  const printCount = splitOverflowCards(includedCards).length;

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <h2 className={styles.charName}>{project.character.name}</h2>
        <div className={styles.charMeta}>
          Level {project.character.level} · {project.character.className ?? ''}
        </div>
        <div className={styles.cardCount}>
          {printCount !== includedCount
            ? `${includedCount} cards (${printCount} to print)`
            : `${includedCount} cards`}
        </div>

        <nav className={styles.filters} aria-label="Card category filter">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`${styles.filterBtn} ${(categoryFilter ?? 'all') === f.value ? styles.active : ''}`}
              onClick={() => setCategoryFilter(f.value === 'all' ? null : f.value)}
            >
              {f.label}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarActions}>
          <button className={styles.secondaryBtn} onClick={addManualCard}>
            + Add custom card
          </button>
          <button
            className={styles.enrichBtn}
            onClick={() => void enrichCardsFromAon()}
            disabled={enriching}
            title="Fetch rules text, traits, and action costs from Archives of Nethys"
          >
            {enriching ? 'Enriching…' : '⬇ Enrich from AoN'}
          </button>
          {enrichError && <div className={styles.enrichError}>{enrichError}</div>}
          <button className={styles.primaryBtn} onClick={() => goTo('print-preview')}>
            Print preview →
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <main className={styles.main}>
        {generationWarnings.length > 0 && (
          <div className={styles.warnings}>
            {generationWarnings.map((w, i) => (
              <div key={i} className={`${styles.warning} ${styles[w.type]}`}>
                {w.message}
              </div>
            ))}
          </div>
        )}

        <div className={styles.toolbar}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search cards…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search cards"
          />
          <span className={styles.resultCount}>{filtered.length} cards</span>
        </div>

        <div className={styles.grid}>
          {filtered.map((card) => (
            <div key={card.id} className={styles.cardWrapper}>
              <CardPreview
                card={card}
                selected={card.id === selectedCardId}
                onClick={() => selectCard(card.id === selectedCardId ? null : card.id)}
                onToggleInclude={() => toggleCardInclude(card.id)}
              />
            </div>
          ))}
          {filtered.length === 0 && <p className={styles.empty}>No cards match this filter.</p>}
        </div>
      </main>

      {/* Editor panel */}
      {selectedCard && (
        <aside className={styles.editor}>
          <CardEditor card={selectedCard} />
        </aside>
      )}
    </div>
  );
}
