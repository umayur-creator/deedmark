import { useState } from 'react';
import { analyzeDocument, generateMatterAssessment } from '../lib/api';

export default function DocumentUpload({ matterId, onResult, onOverallResult, onOverallStatus }) {
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function handleFilesSelected(e) {
    const newFiles = Array.from(e.target.files || []);
    setItems((prev) => {
      const existingKeys = new Set(prev.map((it) => `${it.file.name}_${it.file.size}`));
      const deduped = newFiles.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...deduped.map((file) => ({ file, status: 'queued', error: null }))];
    });
    e.target.value = '';
  }

  function updateItem(index, patch) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (items.length === 0 || submitting) return;
    setSubmitting(true);

    for (let i = 0; i < items.length; i++) {
      if (items[i].status === 'done') continue;
      try {
        updateItem(i, { status: 'uploading', error: null });
        updateItem(i, { status: 'analyzing' });
        const result = await analyzeDocument(items[i].file, matterId);
        updateItem(i, { status: 'done' });
        onResult(result, items[i].file);
      } catch (err) {
        console.error('analyzeDocument failed', items[i].file.name, err);
        updateItem(i, { status: 'error', error: err.message || 'Something went wrong analyzing this document.' });
      }
    }

    const anySucceeded = items.some((it) => it.status === 'done');
    if (anySucceeded && onOverallResult) {
      try {
        onOverallStatus?.('generating');
        const assessment = await generateMatterAssessment(matterId);
        onOverallResult(assessment);
        onOverallStatus?.('done');
      } catch (err) {
        console.error('generateMatterAssessment failed', err);
        onOverallStatus?.('error');
      }
    }

    setSubmitting(false);
  }

  const allDone = items.length > 0 && items.every((it) => it.status === 'done');
  const anyError = items.some((it) => it.status === 'error');

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept="application/pdf,image/*"
        multiple
        disabled={submitting}
        onChange={handleFilesSelected}
      />

      {items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.75rem' }}>
          {items.map((it, i) => (
            <li
              key={`${it.file.name}-${i}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.25rem 0' }}
            >
              <span>{it.file.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: it.status === 'error' ? '#9C3A32' : it.status === 'done' ? '#2F7D4F' : '#666' }}>
                  {it.status === 'queued' && 'Queued'}
                  {it.status === 'uploading' && 'Uploading…'}
                  {it.status === 'analyzing' && 'Reading document…'}
                  {it.status === 'done' && 'Done'}
                  {it.status === 'error' && (it.error || 'Failed')}
                </span>
                {(it.status === 'queued' || it.status === 'error') && !submitting && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    aria-label={`Remove ${it.file.name}`}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#666', fontSize: '1rem', lineHeight: 1, padding: '0 0.25rem' }}
                  >
                    ✕
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button type="submit" disabled={items.length === 0 || submitting || allDone}>
        {submitting
          ? 'Processing…'
          : allDone
          ? 'All documents analyzed'
          : anyError
          ? 'Retry failed documents'
          : `Analyze ${items.length || ''} document${items.length === 1 ? '' : 's'}`.trim()}
      </button>
    </form>
  );
}