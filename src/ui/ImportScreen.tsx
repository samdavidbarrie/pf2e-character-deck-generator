import { useCallback, useState } from 'react';
import { useAppStore } from '../app/store';
import { isPathbuilderId } from '../import/detectPathbuilderId';
import { validateImport } from '../import/validateImport';
import { importProjectJson } from '../storage/exportProject';
import styles from './ImportScreen.module.css';

import alaseJson from '../fixtures/alase.json';
import dolthionJson from '../fixtures/dolthion.json';
import hanaeJson from '../fixtures/hanae.json';
import hikariJson from '../fixtures/hikari.json';
import nerriJson from '../fixtures/nerri.json';
import vassoraJson from '../fixtures/vassora.json';

const DEV_FIXTURES = [
  { label: 'Hikari — Monk lv11 (no spellcaster)', json: hikariJson },
  { label: 'Hanae — Sorcerer lv11 (arcane + focus)', json: hanaeJson },
  { label: 'Alase — Summoner lv20 (Beast Eidolon)', json: alaseJson },
  { label: 'Nerri — Wizard lv7 (familiar)', json: nerriJson },
  { label: 'Vassora — Druid lv7 (two animal companions)', json: vassoraJson },
  { label: 'Dolthion — Fighter lv20 (armored)', json: dolthionJson },
];

export function ImportScreen() {
  const { importJson, loadProject, setImportValidation } = useAppStore();
  const importValidation = useAppStore((s) => s.importValidation);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [debugText, setDebugText] = useState<string | null>(null);

  const handleJson = useCallback(
    (json: unknown) => {
      const validation = validateImport(json);
      setImportValidation(validation);

      if (!validation.valid) {
        setErrors(validation.errors);
        setDebugText(JSON.stringify(json, null, 2).slice(0, 2000));
        return;
      }

      const result = importJson(json);
      if (!result.success) {
        setErrors(result.errors);
      }
    },
    [importJson, setImportValidation],
  );

  const handleImport = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setErrors([]);
    setDebugText(null);

    // Numeric-only input → Pathbuilder JSON ID
    if (isPathbuilderId(trimmed)) {
      setLoading(true);
      try {
        const res = await fetch(
          `https://pathbuilder2e.com/json.php?id=${encodeURIComponent(trimmed)}`,
        );
        if (!res.ok) throw new Error(`Pathbuilder returned ${res.status}`);
        handleJson(await res.json());
      } catch (err) {
        setErrors([
          err instanceof Error ? err.message : 'Failed to fetch character from Pathbuilder.',
        ]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Otherwise try to parse as JSON
    try {
      handleJson(JSON.parse(trimmed));
    } catch {
      setErrors(['Could not parse as JSON. Check the text and try again.']);
    }
  }, [inputText, handleJson]);

  const handleFileUpload = useCallback(
    (file: File) => {
      if (file.name.endsWith('.json')) {
        // Could be a deck project or a character export
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target?.result as string);
            // Detect deck project vs character export
            if (json.character && json.cards) {
              importProjectJson(file)
                .then((project) => loadProject(project))
                .catch((err) => setErrors([err.message]));
            } else {
              handleJson(json);
            }
          } catch {
            setErrors(['Could not parse file as JSON.']);
          }
        };
        reader.readAsText(file);
      } else {
        setErrors(['Please upload a .json file.']);
      }
    },
    [handleJson, loadProject],
  );

  const handleFilePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.appTitle}>PF2e Card Deck Generator</h1>
        <p className={styles.privacy}>
          Your character file is processed in this browser. Nothing is uploaded.
        </p>
      </header>

      <main className={styles.main}>
        <section className={styles.importSection}>
          <h2>Import Character</h2>
          <p>Paste your Pathbuilder 2e JSON export or enter your JSON ID number.</p>

          <textarea
            className={styles.pasteArea}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleImport();
            }}
            placeholder={'Paste JSON here, or just type your Pathbuilder ID (e.g. 422538)'}
            rows={6}
            aria-label="Paste character JSON or enter Pathbuilder ID"
            spellCheck={false}
          />
          <button
            className={styles.button}
            onClick={() => void handleImport()}
            disabled={!inputText.trim() || loading}
          >
            {loading ? 'Fetching…' : 'Import'}
          </button>

          <details className={styles.uploadSection}>
            <summary>Upload a file instead</summary>
            <div
              className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <p>Drag &amp; drop a JSON file here</p>
              <label className={styles.uploadButton}>
                Choose file
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFilePicker}
                  className={styles.hiddenInput}
                  aria-label="Upload character JSON file"
                />
              </label>
            </div>
          </details>

          {errors.length > 0 && (
            <div className={styles.errorPanel} role="alert">
              <strong>Import failed</strong>
              <ul>
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
              {debugText && (
                <details>
                  <summary>Copy debug details</summary>
                  <pre className={styles.debugPre}>{debugText}</pre>
                  <button onClick={() => navigator.clipboard.writeText(debugText)}>
                    Copy to clipboard
                  </button>
                </details>
              )}
            </div>
          )}

          {importValidation && importValidation.warnings.length > 0 && (
            <div className={styles.warningPanel} role="status">
              <strong>Import warnings</strong>
              <ul>
                {importValidation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* {(import.meta.env.DEV || true) && ( */}
        {true && (
          <section className={styles.devFixtures}>
            <strong>Dev: load test character</strong>
            <div className={styles.devFixtureButtons}>
              {DEV_FIXTURES.map((f) => (
                <button
                  key={f.label}
                  className={styles.secondaryButton}
                  onClick={() => handleJson(f.json)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className={styles.helpSection}>
          <h2>How to export from Pathbuilder 2e</h2>
          <ol>
            <li>Open your character in Pathbuilder 2e (web or app).</li>
            <li>
              Select <strong>Export</strong> → <strong>Export JSON</strong>.
            </li>
            <li>Copy the JSON ID number shown and enter it above.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
