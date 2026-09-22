import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase';
import { subscribeHighlights, addHighlight, deleteHighlight, subscribeComments, addComment } from '../lib/annotations';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_DRAG_PX = 8; // ignore drags smaller than this -- treat as a click/scroll jiggle, not a highlight

export default function DocumentViewer({ matterId, documentId, storagePath, fileName, initialPage, searchQuote, onClose, embedded, orgId }) {  const [fileUrl, setFileUrl] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [highlights, setHighlights] = useState([]);
  const [selectedHighlightId, setSelectedHighlightId] = useState(null);
  const [dragState, setDragState] = useState(null); // { page, startX, startY, x, y, width, height } in px, while dragging
  const pageRefs = useRef({});

  useEffect(() => {
    let cancelled = false;
    getDownloadURL(ref(storage, storagePath))
      .then((url) => {
        if (!cancelled) setFileUrl(url);
      })
      .catch((err) => {
        console.error('getDownloadURL failed', err);
        if (!cancelled) setLoadError(err.message || 'Could not load this document.');
      });
    return () => { cancelled = true; };
  }, [storagePath]);

  useEffect(() => {
    return subscribeHighlights(matterId, documentId, setHighlights);
  }, [matterId, documentId]);

  useEffect(() => {
    if (!numPages || !initialPage) return;
    const t = setTimeout(() => {
      const el = pageRefs.current[initialPage];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (searchQuote && window.find) {
        try { window.find(searchQuote); } catch (e) { /* not supported, ignore */ }
      }
    }, 400);
    return () => clearTimeout(t);
  }, [numPages, initialPage, searchQuote]);

  function handleMouseDown(pageNum, e) {
    // Only left-click drags start a highlight; ignore right/middle click.
    if (e.button !== 0) return;
    const container = pageRefs.current[pageNum];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setDragState({ page: pageNum, startX, startY, x: startX, y: startY, width: 0, height: 0 });
  }

  function handleMouseMove(pageNum, e) {
    if (!dragState || dragState.page !== pageNum) return;
    const container = pageRefs.current[pageNum];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    setDragState((prev) => ({
      ...prev,
      x: Math.min(prev.startX, curX),
      y: Math.min(prev.startY, curY),
      width: Math.abs(curX - prev.startX),
      height: Math.abs(curY - prev.startY),
    }));
  }

  function handleMouseUp(pageNum) {
    if (!dragState || dragState.page !== pageNum) return;
    const container = pageRefs.current[pageNum];
    const { x, y, width, height } = dragState;
    setDragState(null);

    if (!container || width < MIN_DRAG_PX || height < MIN_DRAG_PX) return; // too small -- ignore, treat as click/scroll

    const rect = container.getBoundingClientRect();
    addHighlight(matterId, documentId, {
      page: pageNum,
      rect: {
        x: x / rect.width,
        y: y / rect.height,
        width: width / rect.width,
        height: height / rect.height,
      },
      color: 'yellow',
    });
  }

  async function handleDeleteHighlight(highlightId) {
    setSelectedHighlightId(null);
    await deleteHighlight(matterId, documentId, highlightId);
  }

  const highlightsByPage = {};
  for (const h of highlights) {
    (highlightsByPage[h.page] = highlightsByPage[h.page] || []).push(h);
  }

    return (
    <div style={embedded ? { fontFamily: 'sans-serif' } : { maxWidth: 900, margin: '20px auto', fontFamily: 'sans-serif' }}>
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>{fileName}</h2>
          <button type="button" onClick={onClose}>← Back</button>
        </div>
      )}
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Click and drag over any part of the page to highlight it and start a comment thread. Highlights and comments are shared with your whole team in real time.
      </p>

      {loadError && <p style={{ color: '#9C3A32' }}>Failed to load document: {loadError}</p>}
      {!fileUrl && !loadError && <p>Loading document…</p>}

      {fileUrl && (
        <Document file={fileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} onLoadError={(err) => setLoadError(err.message)}>
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              ref={(el) => { pageRefs.current[pageNum] = el; }}
              style={{ position: 'relative', marginBottom: '1.5rem', border: '1px solid #ddd', cursor: 'crosshair', userSelect: 'none' }}
              onMouseDown={(e) => handleMouseDown(pageNum, e)}
              onMouseMove={(e) => handleMouseMove(pageNum, e)}
              onMouseUp={() => handleMouseUp(pageNum)}
              onMouseLeave={() => { if (dragState?.page === pageNum) setDragState(null); }}
            >
              <Page pageNumber={pageNum} renderAnnotationLayer={false} renderTextLayer={false} />

              {(highlightsByPage[pageNum] || []).map((h) => (
                <div
                  key={h.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedHighlightId(h.id); }}
                  style={{
                    position: 'absolute',
                    left: `${h.rect.x * 100}%`,
                    top: `${h.rect.y * 100}%`,
                    width: `${h.rect.width * 100}%`,
                    height: `${h.rect.height * 100}%`,
                    background: selectedHighlightId === h.id ? 'rgba(255,180,0,0.55)' : 'rgba(255,230,0,0.4)',
                    border: '1px solid rgba(200,150,0,0.6)',
                    cursor: 'pointer',
                  }}
                />
              ))}

              {dragState && dragState.page === pageNum && (
                <div
                  style={{
                    position: 'absolute',
                    left: dragState.x,
                    top: dragState.y,
                    width: dragState.width,
                    height: dragState.height,
                    background: 'rgba(255,230,0,0.3)',
                    border: '2px dashed rgba(200,150,0,0.8)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
          ))}
        </Document>
      )}

            {selectedHighlightId && (
        <CommentThread
          matterId={matterId}
          documentId={documentId}
          highlightId={selectedHighlightId}
          orgId={orgId}
          onClose={() => setSelectedHighlightId(null)}
          onDelete={() => handleDeleteHighlight(selectedHighlightId)}
        />
      )}
    </div>
  );
}

function CommentThread({ matterId, documentId, highlightId, orgId, onClose, onDelete }) {
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState('');
  const [memberNames, setMemberNames] = useState({});

  useEffect(() => {
    return subscribeComments(matterId, documentId, highlightId, setComments);
  }, [matterId, documentId, highlightId]);

  useEffect(() => {
    if (!orgId) return;
    import('firebase/firestore').then(({ collection, getDocs }) => {
      import('../firebase').then(({ db }) => {
        getDocs(collection(db, `organizations/${orgId}/members`)).then((snap) => {
          const names = {};
          snap.docs.forEach((d) => { names[d.id] = d.data().name || d.data().email; });
          setMemberNames(names);
        });
      });
    });
  }, [orgId]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    await addComment(matterId, documentId, highlightId, draft.trim());
    setDraft('');
  }

  return (
    <div style={{
      position: 'fixed', right: 20, top: 20, bottom: 20, width: 320,
      background: '#fff', border: '1px solid #ccc', boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <strong>Comments</strong>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={onDelete} style={{ fontSize: '0.8rem', color: '#9C3A32' }}>Delete highlight</button>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '0.5rem' }}>
        {comments.length === 0 && <p style={{ color: '#999', fontSize: '0.85rem' }}>No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                       <div style={{ color: '#888', fontSize: '0.75rem' }}>
              {c.authorId === auth.currentUser?.uid ? 'You' : (memberNames[c.authorId] || 'Team member')}
            </div>
            <div>{c.text}</div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          style={{ flex: 1 }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}