import { useCallback, useState } from 'react';
import { useAppStore } from '../app/store';
import { validateImport } from '../import/validateImport';
import { importProjectJson } from '../storage/exportProject';
import styles from './ImportScreen.module.css';

import hanaeJson from '../fixtures/hanae.json';
import hikariJson from '../fixtures/hikari.json';

const DEV_FIXTURES = [
  { label: 'Hikari — Monk lv11 (no spellcaster)', json: hikariJson },
  { label: 'Hanae — Sorcerer lv11 (arcane + focus)', json: hanaeJson },
];

export function ImportScreen() {
  const { importJson, loadProject, setImportValidation } = useAppStore();
  const importValidation = useAppStore((s) => s.importValidation);

  const [pasteText, setPasteText] = useState('');
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

  const handlePaste = () => {
    try {
      const json = JSON.parse(pasteText);
      handleJson(json);
    } catch {
      setErrors(['Could not parse pasted text as JSON.']);
    }
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
          <p>Upload a Pathbuilder 2e JSON export, or paste the JSON below.</p>

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

          <details className={styles.pasteSection}>
            <summary>Paste JSON</summary>
            <textarea
              className={styles.pasteArea}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste Pathbuilder JSON here…"
              rows={10}
              aria-label="Paste character JSON"
            />
            <button className={styles.button} onClick={handlePaste} disabled={!pasteText.trim()}>
              Import from paste
            </button>
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

        {import.meta.env.DEV && (
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
            <li>Save the file and upload it here.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
