import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie, Scatter } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function CustomCharts({ cleaned = [], predictions = [] }) {
  const [source, setSource] = useState("cleaned");

  const activeData = source === "cleaned" ? cleaned : predictions;

  if (!activeData || activeData.length === 0) return null;

  const columns = Object.keys(activeData[0] || {});

  const [xField, setXField] = useState(columns[0]);
  const [yField, setYField] = useState(columns[1]);
  const [chartType, setChartType] = useState("bar");

  const xValues = activeData.map((row) => row[xField]);
  const yValues = activeData.map((row) => row[yField]);

  const chartData = {
    labels: xValues,
    datasets: [
      {
        label: `${yField} vs ${xField}`,
        data: yValues,
        backgroundColor: "rgba(79,157,255,0.6)",
        borderColor: "#4F9DFF",
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Custom Chart Builder</div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div className="small">Select Data Source</div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            style={{ padding: 8, borderRadius: 8 }}
          >
            <option value="cleaned">Cleaned Data</option>
            <option value="predictions">Predictions Sample</option>
          </select>
        </div>

        <div>
          <div className="small">X-Axis</div>
          <select
            value={xField}
            onChange={(e) => setXField(e.target.value)}
            style={{ padding: 8, borderRadius: 8 }}
          >
            {columns.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="small">Y-Axis</div>
          <select
            value={yField}
            onChange={(e) => setYField(e.target.value)}
            style={{ padding: 8, borderRadius: 8 }}
          >
            {columns.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="small">Chart Type</div>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{ padding: 8, borderRadius: 8 }}
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
            <option value="pie">Pie (X must be category)</option>
          </select>
        </div>
      </div>

      <div style={{ width: "100%", height: "360px" }}>
        {chartType === "bar" && <Bar data={chartData} />}
        {chartType === "line" && <Line data={chartData} />}
        {chartType === "scatter" && (
          <Scatter
            data={{
              datasets: [
                {
                  label: `${yField} vs ${xField}`,
                  data: activeData.map((r) => ({ x: r[xField], y: r[yField] })),
                  backgroundColor: "#4F9DFF",
                },
              ],
            }}
          />
        )}
        {chartType === "pie" && (
          <Pie
            data={{
              labels: xValues,
              datasets: [
                {
                  label: xField,
                  data: yValues,
                  backgroundColor: ["#4F9DFF", "#ff6b6b", "#ffd166", "#00d68f"],
                },
              ],
            }}
          />
        )}
      </div>
    </div>
  );
}
