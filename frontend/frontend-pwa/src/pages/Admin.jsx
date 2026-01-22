export default function Admin({ reports }) {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Admin Dashboard</h2>
      <h3>Total Reports: {reports.length}</h3>

      <ul>
        {reports.map((r) => (
          <li key={r.id}>
            <strong>{r.type}</strong> — Severity: {r.severity}
          </li>
        ))}
      </ul>
    </div>
  );
}
