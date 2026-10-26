import React from "react";

export default function DataTable({ data = [], maxRows = 50 }) {
  if (!data || data.length === 0) return <div className="small">No rows to show</div>;

  const cols = Object.keys(data[0] || {});

  return (
    <div className="preview card" style={{ padding: 8, marginTop: 8 }}>
      <div style={{ overflow: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, maxRows).map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c}>{String(r[c] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
