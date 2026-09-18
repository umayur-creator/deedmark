export default function OverallAssessment({ assessment, status, resolveSource, onViewLocation }) {
  if (status === 'generating') {
    return <p style={{ marginTop: '1.5rem', color: '#666' }}>Synthesizing overall title assessment…</p>;
  }
  if (status === 'error') {
    return <p style={{ marginTop: '1.5rem', color: '#9C3A32' }}>Could not generate the overall assessment. You can retry after documents finish analyzing.</p>;
  }
  if (!assessment) return null;

  const { overallBrief, chainOfTitle = [], missingDocs = [], flags = [] } = assessment;

  function renderItem(item, i, color) {
    const text = typeof item === 'string' ? item : item.text;
    const source = typeof item === 'object' ? item.source : undefined;
    const page = typeof item === 'object' ? item.page : undefined;
    const quote = typeof item === 'object' ? item.quote : undefined;
    const target = source ? resolveSource?.(source) : null;

    return (
      <li key={i} style={color ? { color } : undefined}>
        {text}
        {source && <span style={{ color: '#888' }}> ({source})</span>}
        {target && page && (
          <button
            type="button"
            onClick={() => onViewLocation({ ...target, page, quote })}
            style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}
          >
            View in document (p.{page})
          </button>
        )}
      </li>
    );
  }

  return (
    <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#F7F5F0', border: '1px solid #ddd' }}>
      <h2 style={{ marginTop: 0 }}>Overall Title Assessment</h2>
      <p>{overallBrief}</p>

      {chainOfTitle.length > 0 && (
        <>
          <h3>Chain of title</h3>
          <ul>
            {chainOfTitle.map((entry, i) => (
              <li key={i}>
                <strong>{entry.date}</strong> — {entry.instrument}: {entry.effect}
                {entry.source && <span style={{ color: '#888' }}> ({entry.source})</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {missingDocs.length > 0 && (
        <>
          <h3>Missing / to verify</h3>
          <ul>{missingDocs.map((item, i) => renderItem(item, i))}</ul>
        </>
      )}

      {flags.length > 0 && (
        <>
          <h3 style={{ color: '#9C3A32' }}>Flags</h3>
          <ul>{flags.map((item, i) => renderItem(item, i, '#9C3A32'))}</ul>
        </>
      )}
    </div>
  );
}