import React from "react";

/*
 Props:
  - collapsed: bool
  - onToggle: fn
  - step: number
  - setStep: fn
  - unlocked: { upload, clean, patterns, predictions, charts }
*/

export default function Sidebar({
  collapsed,
  onToggle,
  step,
  setStep,
  unlocked = {},
}) {
  const items = [
    { key: "upload", label: "Upload", stepIndex: 0, icon: "⬆" },
    { key: "clean", label: "Clean", stepIndex: 1, icon: "🧹" },
    { key: "patterns", label: "Find Patterns", stepIndex: 2, icon: "🔍" },
    { key: "predictions", label: "Predictions", stepIndex: 3, icon: "📋" },
    { key: "charts", label: "Charts", stepIndex: 4, icon: "📊" },
  ];

  function onClickItem(it) {
    if (!unlocked[it.key]) return;
    setStep(it.stepIndex);
  }

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">DS</div>
        {!collapsed && <div className="sidebar-title">DataSphere</div>}
      </div>

      <div style={{ marginTop: 10 }}>
        {items.map((it) => (
          <div
            key={it.key}
            className={`sidebar-item ${unlocked[it.key] ? "" : "disabled"}`}
            onClick={() => onClickItem(it)}
            data-active={step === it.stepIndex}
            title={!unlocked[it.key] ? "Locked until previous step completed" : it.label}
          >
            <div style={{ width: 28, textAlign: "center", fontSize: 18 }}>
              {/* show icon even when collapsed */}
              <span>{it.icon}</span>
            </div>
            {!collapsed && <div className="label">{it.label}</div>}
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div className="sidebar-toggle">
        <button className="btn" onClick={onToggle}>
          {collapsed ? "▶" : "◀"}
        </button>
      </div>
    </div>
  );
}
