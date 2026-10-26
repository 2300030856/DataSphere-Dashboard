# app.py
import os
import uuid
import json
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datasphere_pipeline import summarize_dataframe, clean_dataframe, train_and_evaluate, to_serializable

# --- configuration
UPLOAD_FOLDER = "uploads"
CLEANED_FOLDER = "cleaned"
MODELS_FOLDER = "models"
OUTPUT_FOLDER = "output"
ALLOWED_EXT = {"csv"}

for d in [UPLOAD_FOLDER, CLEANED_FOLDER, MODELS_FOLDER, OUTPUT_FOLDER]:
    os.makedirs(d, exist_ok=True)

app = Flask(__name__)
# Allow frontend (Vite) to call this API from localhost:5173 (or any origin)
CORS(app, resources={r"/*": {"origins": "*"}})

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT

# helper to convert values to json-safe
def safe_convert(obj):
    if obj is None:
        return None
    if isinstance(obj, (np.integer, int)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        v = float(obj)
        if np.isnan(v) or np.isinf(v):
            return None
        return v
    if isinstance(obj, dict):
        return {k: safe_convert(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [safe_convert(v) for v in obj]
    return obj

def make_response(data):
    return jsonify(safe_convert(data))

@app.route("/health", methods=["GET"])
def health():
    return make_response({"status": "ok", "message": "DataSphere Flask backend running!"})

@app.route("/upload", methods=["POST"])
def upload_file():
    try:
        if "file" not in request.files:
            return make_response({"error": "no file part in request"}), 400
        f = request.files["file"]
        if f.filename == "":
            return make_response({"error": "no selected file"}), 400
        if not allowed_file(f.filename):
            return make_response({"error": "file type not allowed, only CSV"}), 400

        filename = secure_filename(f.filename)
        uid = str(uuid.uuid4())
        saved_name = f"{uid}_{filename}"
        path = os.path.join(UPLOAD_FOLDER, saved_name)
        f.save(path)

        print(f"[upload] saved file: {path}, size={os.path.getsize(path)} bytes")

        # read CSV robustly
        try:
            df = pd.read_csv(path)
        except Exception as e:
            print("[upload] pandas read_csv failed, trying engine=python:", str(e))
            df = pd.read_csv(path, engine="python")

        # replace inf with NaN
        df = df.replace([np.inf, -np.inf], np.nan)

        summary = summarize_dataframe(df, sample_rows=20)
        resp = {
            "input_file": path,
            "job_id": uid,
            "raw_rows": summary.get("sample_rows", []),
            "summary": {
                "rows": summary.get("rows"),
                "columns": summary.get("columns"),
                "dtypes": summary.get("dtypes"),
                "missing_values": summary.get("missing_values"),
                "numeric_stats": summary.get("numeric_stats")
            }
        }
        return make_response(resp)
    except Exception as e:
        print("[upload] unexpected error:", str(e))
        return make_response({"error": "upload failed", "details": str(e)}), 500

@app.route("/clean", methods=["POST"])
def clean_endpoint():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        path = payload.get("path")
        if not path:
            # choose latest uploaded file
            files = sorted(os.listdir(UPLOAD_FOLDER), key=lambda x: os.path.getmtime(os.path.join(UPLOAD_FOLDER, x)), reverse=True)
            if not files:
                return make_response({"error": "no uploaded files found"}), 400
            path = os.path.join(UPLOAD_FOLDER, files[0])

        if not os.path.exists(path):
            return make_response({"error": "path not found", "path": path}), 400

        print(f"[clean] reading file: {path}")
        try:
            df = pd.read_csv(path)
        except Exception as e:
            print("[clean] read_csv fallback:", str(e))
            df = pd.read_csv(path, engine="python")
        df = df.replace([np.inf, -np.inf], np.nan)

        cleaned_result = clean_dataframe(df)
        cleaned_df = cleaned_result["cleaned_dataframe"]
        log = cleaned_result.get("log", {})

        cleaned_name = os.path.basename(path)
        cleaned_path = os.path.join(CLEANED_FOLDER, f"cleaned_{cleaned_name}")
        cleaned_df.to_csv(cleaned_path, index=False)

        print(f"[clean] saved cleaned file: {cleaned_path}")

        resp = {
            "input_file": path,
            "cleaned_file": cleaned_path,
            "cleaned_sample": cleaned_df.head(20).to_dict(orient="records"),
            "changes": log
        }
        return make_response(resp)
    except Exception as e:
        print("[clean] unexpected error:", str(e))
        return make_response({"error": "clean failed", "details": str(e)}), 500

@app.route("/analyze", methods=["POST"])
def analyze_endpoint():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        path = payload.get("path")
        if not path:
            # prefer latest cleaned file, else latest upload
            cleaned_files = sorted(os.listdir(CLEANED_FOLDER), key=lambda x: os.path.getmtime(os.path.join(CLEANED_FOLDER, x)), reverse=True)
            if cleaned_files:
                path = os.path.join(CLEANED_FOLDER, cleaned_files[0])
            else:
                uploaded_files = sorted(os.listdir(UPLOAD_FOLDER), key=lambda x: os.path.getmtime(os.path.join(UPLOAD_FOLDER, x)), reverse=True)
                if not uploaded_files:
                    return make_response({"error": "no file available to analyze"}), 400
                path = os.path.join(UPLOAD_FOLDER, uploaded_files[0])

        if not os.path.exists(path):
            return make_response({"error": "path not found", "path": path}), 400

        print(f"[analyze] using file: {path}")
        try:
            df = pd.read_csv(path)
        except Exception as e:
            print("[analyze] read_csv fallback:", str(e))
            df = pd.read_csv(path, engine="python")
        df = df.replace([np.inf, -np.inf], np.nan)

        # auto-detect target: common names first
        target = None
        for cand in ["is_fraud","fraud","target","label","y","outcome","class"]:
            for col in df.columns:
                if col.lower() == cand:
                    target = col
                    break
            if target:
                break
        if not target:
            # fallback: numeric column with 2 unique values or small unique count
            for col in df.columns:
                if pd.api.types.is_numeric_dtype(df[col]):
                    unique = df[col].dropna().unique()
                    if len(unique) <= 2:
                        target = col
                        break

        if not target:
            # no target: return EDA summary only
            summary = summarize_dataframe(df, sample_rows=20)
            return make_response({
                "input_file": path,
                "summary": summary,
                "message": "No target column detected — cannot train model automatically."
            })

        print(f"[analyze] detected target: {target}. Starting training...")

        results = train_and_evaluate(df, target_col=target, output_prefix=os.path.join(MODELS_FOLDER, "datasphere_model"))

        job_id = str(uuid.uuid4())
        out_path = os.path.join(OUTPUT_FOLDER, f"datasphere_{job_id}.json")
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(results, fh, default=str)

        print(f"[analyze] training finished. best_model={results.get('best_model')}, saved output={out_path}")

        resp = {
            "input_file": path,
            "target": target,
            "info": results,
            "output_file": out_path
        }
        return make_response(resp)
    except Exception as e:
        print("[analyze] unexpected error:", str(e))
        return make_response({"error": "analyze failed", "details": str(e)}), 500

@app.route("/get_output_json", methods=["GET"])
def get_output_json():
    p = request.args.get("path")
    if not p:
        return make_response({"error": "path param required"}), 400
    if not os.path.exists(p):
        return make_response({"error": "path not found", "path": p}), 404
    try:
        with open(p, "r", encoding="utf-8") as fh:
            obj = json.load(fh)
        return make_response(obj)
    except Exception as e:
        print("[get_output_json] failed:", str(e))
        return make_response({"error": "failed to read json", "details": str(e)}), 500

if __name__ == "__main__":
    print("Starting DataSphere Flask backend...")
    app.run(host="127.0.0.1", port=5000, debug=True)
