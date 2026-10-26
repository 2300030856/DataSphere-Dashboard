import React, { useState, useMemo } from "react";
import UploadPanel from "./components/UploadPanel";
import DataTable from "./components/DataTable";
import InsightsCard from "./components/InsightsCard";
import ChartsPanel from "./components/ChartsPanel";
import CustomCharts from "./components/CustomCharts";
import LandingScreen from "./components/LandingScreen";
import Sidebar from "./components/Sidebar";
import { uploadCSV, cleanPath, analyzePath } from "./api";

export default function App() {
  const [showLanding, setShowLanding] = useState(true);

  // Steps updated to include PREDICTIONS and CHARTS
  const STEPS = {
    UPLOAD: 0,
    CLEAN: 1,
    PATTERNS: 2,
    PREDICTIONS: 3,
    CHARTS: 4,
  };
  const [step, setStep] = useState(STEPS.UPLOAD);

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [inputPath, setInputPath] = useState(null);
  const [rawSample, setRawSample] = useState(null);

  const [cleanedSample, setCleanedSample] = useState(null);
  const [changes, setChanges] = useState(null);

  const [analysis, setAnalysis] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /* ---------------- UPLOAD ---------------- */
  async function handleUpload() {
    if (!file) return alert("Choose a CSV file first");

    setStatus("uploading");
    setUploadProgress(0);

    try {
      const res = await uploadCSV(file, (ev) => {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setUploadProgress(pct);
      });

      setInputPath(res.input_file || res.input_path || null);
      setRawSample(res.raw_rows || res.summary?.sample_rows || []);

      setStatus("uploaded");
      setUploadProgress(0);
    } catch (err) {
      alert("Upload failed: " + (err?.response?.data?.error || err?.message));
      setStatus("error");
    }
  }

  /* ---------------- CLEAN ---------------- */
  async function handleClean() {
    if (!inputPath) return alert("Upload a file first");

    setStatus("cleaning");

    try {
      const res = await cleanPath(inputPath);

      setCleanedSample(res.cleaned_sample || []);
      setChanges(res.changes || {});

      if (res.cleaned_file) setInputPath(res.cleaned_file);

      setStatus("cleaned");
    } catch (err) {
      alert("Clean failed: " + (err?.response?.data?.error || err?.message));
      setStatus("error");
    }
  }

  /* ---------------- ANALYZE ---------------- */
  async function handleAnalyze() {
    if (!inputPath) return alert("No cleaned file available");

    setStatus("analyzing");

    try {
      const res = await analyzePath(inputPath);
      const info = res.info || {};

      setAnalysis({
        best_model: info.best_model,
        metrics: info.metrics,
        predictions_sample: info.predictions_sample,
        insights: info.insights,
        target: res.target || "target",
      });

      setStatus("done");
      setStep(STEPS.PATTERNS);
    } catch (err) {
      alert("Analyze failed: " + (err?.response?.data?.error || err?.message));
      setStatus("error");
    }
  }

  /* navigation arrows (simpler) */
  function goBack() {
    if (step === STEPS.CHARTS) setStep(STEPS.PREDICTIONS);
    else if (step === STEPS.PREDICTIONS) setStep(STEPS.PATTERNS);
    else if (step === STEPS.PATTERNS) setStep(STEPS.CLEAN);
    else if (step === STEPS.CLEAN) setStep(STEPS.UPLOAD);
  }

  function goNext() {
    if (step === STEPS.UPLOAD && rawSample) setStep(STEPS.CLEAN);
    else if (step === STEPS.CLEAN && cleanedSample) setStep(STEPS.PATTERNS);
    else if (step === STEPS.PATTERNS && analysis) setStep(STEPS.PREDICTIONS);
    else if (step === STEPS.PREDICTIONS && analysis) setStep(STEPS.CHARTS);
  }

  /* unlocking logic for sidebar (sequential) */
  const unlocked = useMemo(
    () => ({
      upload: true,
      clean: !!rawSample,
      patterns: !!cleanedSample,
      predictions: !!analysis?.predictions_sample,
      charts: !!analysis,
    }),
    [rawSample, cleanedSample, analysis]
  );

  /* download cleaned sample (client-side CSV) */
  function downloadCleanedCSV() {
    if (!cleanedSample || cleanedSample.length === 0)
      return alert("No cleaned data to download");
    const cols = Object.keys(cleanedSample[0] || {});
    const rows = cleanedSample.map((r) =>
      cols
        .map((c) => {
          const v = r[c] ?? "";
          return `"${String(v).replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleaned_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* landing screen unchanged */
  if (showLanding) {
    return <LandingScreen onEnter={() => setShowLanding(false)} />;
  }

  const appClass = sidebarCollapsed ? "app sidebar-collapsed" : "app";

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((s) => !s)}
        step={step}
        setStep={setStep}
        unlocked={unlocked}
      />

      <div className={appClass}>
        {/* HEADER */}
        <div className="header">
          <div className="logo">DS</div>
          <div style={{ flex: 1 }}>
            <div className="title">DataSphere</div>
            <div className="small">AutoML Dashboard — Vite + React</div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="circle-arrow" onClick={goBack}>
              ←
            </button>
            <button
              className="circle-arrow"
              onClick={goNext}
              disabled={
                (step === STEPS.UPLOAD && !rawSample) ||
                (step === STEPS.CLEAN && !cleanedSample)
              }
            >
              →
            </button>
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="content-area" style={{ paddingRight: 12 }}>
          {/* UPLOAD */}
          {step === STEPS.UPLOAD && (
            <UploadPanel
              file={file}
              setFile={setFile}
              handleUpload={handleUpload}
              rawSample={rawSample}
              status={status}
              uploadProgress={uploadProgress}
            />
          )}

          {/* CLEAN */}
          {step === STEPS.CLEAN && (
            <div>
              <div
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>
                    Clean the Data
                  </div>
                  <div className="small" style={{ marginTop: 10 }}>
                    Click Clean to preprocess your dataset.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    className="btn"
                    disabled={status === "cleaning"}
                    onClick={handleClean}
                  >
                    {status === "cleaning" ? "Cleaning..." : "Clean Now"}
                  </button>

                  <button
                    className="btn"
                    onClick={downloadCleanedCSV}
                    disabled={!cleanedSample || cleanedSample.length === 0}
                    title="Download cleaned CSV"
                    style={{
                      background: "#00C853",
                      boxShadow: "0 4px 10px rgba(0,200,120,0.18)",
                    }}
                  >
                    ⤓ Download Cleaned
                  </button>
                </div>
              </div>

              {cleanedSample && (
                <div className="card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>Cleaned Data</div>
                      <div className="small" style={{ marginBottom: 8 }}>
                        First rows after cleaning
                      </div>
                    </div>
                    <div className="small">Rows: {cleanedSample.length}</div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <DataTable data={cleanedSample} />
                  </div>
                </div>
              )}

              {changes && (
                <div className="card">
                  <div style={{ fontWeight: 700 }}>Cleaning Changes</div>
                  <div className="small" style={{ marginTop: 8 }}>
                    {changes.columns_converted_numeric && (
                      <div>
                        - Converted to numeric:{" "}
                        {JSON.stringify(changes.columns_converted_numeric)}
                      </div>
                    )}

                    {changes.filled_na_count && (
                      <div style={{ marginTop: 6 }}>
                        - Filled NA: {JSON.stringify(changes.filled_na_count)}
                      </div>
                    )}

                    {changes.rows_dropped !== undefined && (
                      <div style={{ marginTop: 6 }}>
                        - Rows dropped: {changes.rows_dropped}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PATTERNS -> only model performance + insights */}
          {step === STEPS.PATTERNS && (
            <div>
              <div className="card">
                <button
                  className="btn"
                  disabled={status === "analyzing"}
                  onClick={handleAnalyze}
                >
                  {status === "analyzing" ? "Analyzing..." : "Find Patterns"}
                </button>
              </div>

              {analysis?.metrics && (
                <div className="card">
                  <div style={{ fontWeight: 700 }}>Model Performance</div>
                  <div className="small" style={{ marginTop: 10 }}>
                    <div>
                      Model: <b>{analysis.best_model}</b>
                    </div>
                    <div>
                      Accuracy: <b>{analysis.metrics.accuracy}</b>
                    </div>
                    <div>
                      Precision: <b>{analysis.metrics.precision}</b>
                    </div>
                    <div>
                      Recall: <b>{analysis.metrics.recall}</b>
                    </div>
                    <div>
                      F1 Score: <b>{analysis.metrics.f1}</b>
                    </div>
                  </div>
                </div>
              )}

              {analysis?.insights && <InsightsCard insights={analysis.insights} />}
            </div>
          )}

          {/* PREDICTIONS -> dedicated page for predictions table */}
          {step === STEPS.PREDICTIONS && (
            <div>
              <div className="card">
                <div style={{ fontWeight: 700 }}>Predictions Table</div>
                <div className="small" style={{ marginTop: 10 }}>
                  Showing first rows of predictions
                </div>
              </div>

              {analysis?.predictions_sample ? (
                <div className="card">
                  <DataTable data={analysis.predictions_sample} />
                </div>
              ) : (
                <div className="card">
                  <div className="small">No predictions to show (run Analyze)</div>
                </div>
              )}
            </div>
          )}

          {/* CHARTS -> custom charts page */}
          {step === STEPS.CHARTS && (
            <div>
              <CustomCharts
                cleaned={cleanedSample}
                predictions={analysis?.predictions_sample}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
