import React from "react";

export default function InsightsCard({ insights }) {
  if (!insights) return null;

  return (
    <div className="card">
      <div style={{ fontWeight: 700 }}>Model Insights</div>

      <div className="small" style={{ marginTop: 8 }}>
        {insights.note && <div>- {insights.note}</div>}

        {insights.feature_importance && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700 }}>Top Features</div>
            {Object.entries(insights.feature_importance).map(([k, v]) => (
              <div key={k}>
                - {k}: {v}
              </div>
            ))}
          </div>
        )}

        {insights.coefficients && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700 }}>Coefficients</div>
            {Object.entries(insights.coefficients).map(([k, v]) => (
              <div key={k}>
                - {k}: {v}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
