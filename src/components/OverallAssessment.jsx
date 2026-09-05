export default function OverallAssessment({ assessment, status }) {
  if (status === 'generating') {
    return <p style={{ marginTop: '1.5rem', color: '#666' }}>Synthesizing overall title assessment…</p>;
  }
  if (status === 'error') {
    return <p style={{ marginTop: '1.5rem', color: '#9C3A32' }}>Could not generate the overall assessment. You can retry after documents finish analyzing.</p>;
  }
  if (!assessment) return null;

  const { overallBrief, chainOfTitle = [], missingDocs = [], flags = [] } = assessment;

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