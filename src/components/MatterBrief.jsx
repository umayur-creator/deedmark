export default function MatterBrief({ result, fileName }) {
  if (!result) return null;
  const { docType, brief, chainOfTitle = [], missingDocs = [], flags = [] } = result;

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
          <ul>
            {missingDocs.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </>
      )}

      {flags.length > 0 && (
        <>
          <h3 style={{ color: '#9C3A32' }}>Flags</h3>
          <ul>
            {flags.map((item, i) => <li key={i} style={{ color: '#9C3A32' }}>{item}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}