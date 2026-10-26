import React from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function ChartsPanel({ predictions = [] }) {
  if (!predictions || predictions.length === 0) return null;

  const probs = predictions.map((p) =>
    p.prediction_probability
      ? Array.isArray(p.prediction_probability)
        ? p.prediction_probability[0]
        : p.prediction_probability
      : p.probability || 0
  );

  const buckets = [0, 0, 0, 0, 0];
  probs.forEach((v) => {
    const idx = Math.min(4, Math.floor((v || 0) * 5));
    buckets[idx] += 1;
  });

  const barData = {
    labels: ["0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"],
    datasets: [{ label: "Count", data: buckets, backgroundColor: "rgba(0,170,255,0.6)" }],
  };

  const counts = predictions.reduce((acc, p) => {
    const k = String(p.predicted ?? p.predicted_class ?? "unknown");
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const pieData = {
    labels: Object.keys(counts),
    datasets: [{ data: Object.values(counts), backgroundColor: ["#00aaff", "#ff6b6b", "#ffd166"] }],
  };

  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Charts</div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "350px",
            height: "250px",
            padding: "10px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "10px",
          }}
        >
          <Bar data={barData} options={{ maintainAspectRatio: false }} />
        </div>

        <div
          style={{
            width: "260px",
            height: "260px",
            padding: "10px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "10px",
          }}
        >
          <Pie data={pieData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
}
