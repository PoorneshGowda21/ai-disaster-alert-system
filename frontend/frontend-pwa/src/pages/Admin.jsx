export default function Admin({ reports = [] }) {
  return (
    <div style={{ padding: "20px", minHeight: "100vh", background: "#f4f4f4" }}>
      <h1>Admin Dashboard</h1>
      <p>Total Reports: {reports.length}</p>

      <div style={{ marginTop: "20px" }}>
        {reports.length === 0 && <p>No reports available</p>}

        {reports.map((r) => (
          <div
            key={r.id}
            style={{
              background: "white",
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "5px",
            }}
          >
            <b>{r.type}</b> | {r.severity}
            <br />
            {r.description}
          </div>
        ))}
      </div>
    </div>
  );
}
