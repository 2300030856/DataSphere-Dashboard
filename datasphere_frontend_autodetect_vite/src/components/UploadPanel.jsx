import React from "react";
import DataTable from "./DataTable";

export default function UploadPanel({
  file,
  setFile,
  handleUpload,
  rawSample,
  status,
  uploadProgress,
}) {
  return (
    <div className="card">
      <div className="small">Choose CSV file</div>

      <div className="controls" style={{ marginTop: 8 }}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button className="btn" onClick={handleUpload}>
          {status === "uploading" ? `Uploading... ${uploadProgress}%` : "Upload"}
        </button>
      </div>

      <div className="small" style={{ marginTop: 8 }}>
        Status: {status} {uploadProgress > 0 && `(${uploadProgress}%)`}
      </div>

      <div style={{ marginTop: 16, fontWeight: 700 }}>
        Imported (Raw) Data — first rows
      </div>

      {rawSample && rawSample.length > 0 ? (
        <DataTable data={rawSample} />
      ) : (
        <div className="small">No rows to show</div>
      )}
    </div>
  );
}
