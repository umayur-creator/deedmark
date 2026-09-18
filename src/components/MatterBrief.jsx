export default function MatterBrief({ result, fileName, documentId, storagePath, onViewLocation }) {
  if (!result) return null;
  const { docType, brief, chainOfTitle = [], missingDocs = [], flags = [] } = result;

  function renderItem(item, i, color) {
    const text = typeof item === 'string' ? item : item.text;
    const page = typeof item === 'object' ? item.page : undefined;
    const quote = typeof item === 'object' ? item.quote : undefined;
    return (
      <li key={i} style={color ? { color } : undefined}>
        {text}
        {page && (
          <button
            type="button"
            onClick={() => onViewLocation({ documentId, storagePath, fileName, page, quote })}
            style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}
          >
            View in document (p.{page})
          </button>
        )}
      </li>
    );
  }

  return (
    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #ddd' }}>
      {fileName && <h2 style={{ marginBottom: '0.25rem' }}>{fileName}</h2>}
      <p><strong>Detected document type:</strong> {docType}</p>

      <h3>Brief</h3>
      <p>{brief}</p>

      {chainOfTitle.length > 0 && (
        <>
          <h3>Chain of title</h3>
          <ul>
            {chainOfTitle.map((entry, i) => (
              <li key={i}>
                <strong>{entry.date}</strong> — {entry.instrument}: {entry.effect}
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