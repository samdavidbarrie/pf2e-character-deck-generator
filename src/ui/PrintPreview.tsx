import { useAppStore } from '../app/store';
import { splitOverflowCards } from '../generation/generateDeck';
import { exportProjectJson } from '../storage/exportProject';
import { CardPreview } from './CardPreview';
import styles from './PrintPreview.module.css';

const CARDS_PER_SHEET = 9;

export function PrintPreview() {
  const { project, goTo, updatePrintSettings } = useAppStore();

  if (!project) return null;

  const settings = project.printSettings;
  const printCards = splitOverflowCards(
    settings.includeHidden ? project.cards : project.cards.filter((c) => c.print.include),
  );

  // Paginate into sheets of 9
  const sheets: (typeof printCards)[] = [];
  for (let i = 0; i < printCards.length; i += CARDS_PER_SHEET) {
    sheets.push(printCards.slice(i, i + CARDS_PER_SHEET));
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className={styles.wrapper}>
      {/* Controls — hidden on print */}
      <div className={styles.controls}>
        <button className={styles.backBtn} onClick={() => goTo('deck-builder')}>
          ← Back to editor
        </button>

        <div className={styles.controlGroup}>
          <label>
            <input
              type="checkbox"
              checked={settings.showCutGuides}
              onChange={(e) => updatePrintSettings({ showCutGuides: e.target.checked })}
            />{' '}
            Cut guides
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.includeHidden}
              onChange={(e) => updatePrintSettings({ includeHidden: e.target.checked })}
            />{' '}
            Include hidden cards
          </label>
        </div>

        <div className={styles.cardCount}>
          {printCards.length} cards · {sheets.length} sheet
          {sheets.length !== 1 ? 's' : ''}
        </div>

        <div className={styles.actions}>
          <button className={styles.secondaryBtn} onClick={() => exportProjectJson(project)}>
            Export deck project
          </button>
          <button className={styles.printBtn} onClick={handlePrint}>
            Print all included cards
          </button>
        </div>
      </div>

      {/* Print area */}
      <div className={styles.printArea}>
        {sheets.map((sheet, si) => (
          <div
            key={si}
            className={`${styles.sheet} ${settings.showCutGuides ? styles.withGuides : ''}`}
          >
            {sheet.map((card) => (
              <div key={card.id} className={styles.cardSlot}>
                <CardPreview card={card} forPrint />
              </div>
            ))}
            {/* Fill empty slots */}
            {Array.from({ length: CARDS_PER_SHEET - sheet.length }).map((_, i) => (
              <div key={`empty-${i}`} className={`${styles.cardSlot} ${styles.emptySlot}`} />
            ))}
          </div>
        ))}
        {printCards.length === 0 && (
          <p className={styles.noCards}>
            No cards selected for printing. Go back and include some cards.
          </p>
        )}
      </div>
    </div>
  );
}
