export default function Home() {
  return (
    <div className="centered">
      <div className="card" style={{ minWidth: 320, maxWidth: 360, textAlign: 'center' }}>
        <h1 style={{ fontWeight: 700, marginBottom: 12 }}>Agenda Gestionale</h1>
        <p style={{ color: '#888', marginBottom: 32 }}>
          Benvenuto nel gestionale Agenda.<br />
          <a href="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            Accedi
          </a>
        </p>
      </div>
    </div>
  );
}
