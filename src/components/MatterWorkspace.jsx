import { useState } from 'react';
import DocumentViewer from './DocumentViewer';
import MatterBrief from './MatterBrief';
import OverallAssessment from './OverallAssessment';
import DocChecklist from './DocChecklist';

export default function MatterWorkspace({
  matterData,
  results,
  overallAssessment,
  overallStatus,
  resolveSource,
  matterId,
  orgId,
  onChecklistChange,
  role,
}) {
  const [selected, setSelected] = useState({ type: 'summary' });

  const landDetails = [matterData?.village, matterData?.surveyNo ? `Sy. No. ${matterData.surveyNo}` : null]
    .filter(Boolean)
    .join(', ') || 'Land details';

  function handleViewLocation({ documentId, storagePath, fileName, page, quote }) {
    setSelected({
      type: 'document',
      documentId,
      storagePath,
      fileName,
      initialPage: page,
      searchQuote: quote,
    });
  }

  const selectedResult = selected.type === 'document'
    ? results.find((r) => r.result.documentId === selected.documentId)
    : null;

  return (
    <div style={{ fontFamily: 'sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar: land details + owner name */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.75rem 1.5rem', borderBottom: '1px solid #ddd', flexShrink: 0,
      }}>
        <strong>{landDetails}</strong>
        <span style={{ color: '#666' }}>{matterData?.clientName || 'Owner'}</span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar: doc list + title summary */}
        <div style={{
          width: 220, borderRight: '1px solid #ddd', padding: '1rem',
          overflowY: 'auto', flexShrink: 0,
        }}>
          <div
            onClick={() => setSelected({ type: 'summary' })}
            style={{
              cursor: 'pointer', padding: '0.4rem 0.5rem', marginBottom: '1rem',
              fontWeight: selected.type === 'summary' ? 700 : 400,
              background: selected.type === 'summary' ? '#f0f0f0' : 'transparent',
              borderRadius: 4,
            }}
          >
            Title Summary
          </div>

          <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            List of Docs
          </div>
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => setSelected({
                type: 'document',
                documentId: r.result.documentId,
                storagePath: r.result.storagePath,
                fileName: r.fileName,
                initialPage: undefined,
                searchQuote: undefined,
              })}
              style={{
                cursor: 'pointer', padding: '0.4rem 0.5rem', fontSize: '0.9rem',
                fontWeight: selected.type === 'document' && selected.documentId === r.result.documentId ? 700 : 400,
                background: selected.type === 'document' && selected.documentId === r.result.documentId ? '#f0f0f0' : 'transparent',
                borderRadius: 4,
              }}
            >
              {r.result.docType || r.fileName}
            </div>
          ))}
        </div>

        {/* Right pane: main content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                   {selected.type === 'summary' && (
            <>
              <OverallAssessment
                assessment={overallAssessment}
                status={overallStatus}
                resolveSource={resolveSource}
                onViewLocation={handleViewLocation}
              />
               <DocChecklist
                matterId={matterId}
                checklist={matterData?.docChecklist || []}
                onChange={onChecklistChange}
                canRemove={role === 'admin' || role === 'partner'}
                matterTitle={landDetails}
              />
            </>
          )}

          {selected.type === 'document' && selectedResult && (
            <>
              <MatterBrief
                result={selectedResult.result}
                fileName={selectedResult.fileName}
                documentId={selectedResult.result.documentId}
                storagePath={selectedResult.result.storagePath}
                onViewLocation={handleViewLocation}
              />
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid #ddd', paddingTop: '1.5rem' }}>
                                               <DocumentViewer
                  matterId={matterId}
                  documentId={selected.documentId}
                  storagePath={selected.storagePath}
                  fileName={selected.fileName}
                  initialPage={selected.initialPage}
                  searchQuote={selected.searchQuote}
                  onClose={() => {}}
                  embedded
                  orgId={orgId}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}