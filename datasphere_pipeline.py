# datasphere_pipeline.py
"""
Robust datasphere pipeline helpers:
- summarize_dataframe(df, sample_rows=20)
- clean_dataframe(df)
- train_and_evaluate(df, target_col, output_prefix="models/datasphere")
- to_serializable(obj) -> json-safe helper (not used directly by Flask)
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.exceptions import NotFittedError
import joblib
import warnings
warnings.filterwarnings("ignore")

def to_serializable(o):
    """Convert numpy / pandas types to python native for JSON serialization."""
    if o is None: return None
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        v = float(o)
        if np.isnan(v) or np.isinf(v):
            return None
        return v
    if isinstance(o, (np.ndarray, list, tuple)):
        return [to_serializable(x) for x in list(o)]
    if isinstance(o, dict):
        return {k: to_serializable(v) for k, v in o.items()}
    return o

# ---------- Summarize
def summarize_dataframe(df: pd.DataFrame, sample_rows: int = 20):
    """Return a dictionary summary of df for the frontend."""
    out = {}
    out["file"] = "uploaded"
    out["rows"], out["columns"] = df.shape
    out["dtypes"] = {c: str(df[c].dtype) for c in df.columns}
    out["missing_values"] = {c: int(df[c].isna().sum()) for c in df.columns}
    numeric_stats = {}
    for c in df.select_dtypes(include=[np.number]).columns:
        s = df[c].describe()
        numeric_stats[c] = {
            "count": to_serializable(s.get("count")),
            "mean": to_serializable(s.get("mean")),
            "std": to_serializable(s.get("std")),
            "min": to_serializable(s.get("min")),
            "25%": to_serializable(df[c].quantile(0.25)) if not df[c].dropna().empty else None,
            "50%": to_serializable(df[c].median()) if not df[c].dropna().empty else None,
            "75%": to_serializable(df[c].quantile(0.75)) if not df[c].dropna().empty else None,
            "max": to_serializable(s.get("max"))
        }
    out["numeric_stats"] = numeric_stats
    # sample rows as list of dicts (convert NaN to None)
    out["sample_rows"] = df.head(sample_rows).replace({np.nan: None}).to_dict(orient="records")
    return out

# ---------- Cleaning
def clean_dataframe(df: pd.DataFrame):
    """
    Basic cleaning:
      - convert numeric-like columns to numeric
      - replace inf with NaN
      - fill numeric NaN with mean
      - fill categorical NaN with mode (if exists)
    Returns: {"cleaned_dataframe": df_clean, "log": {...}}
    """
    dfc = df.copy()
    dfc.replace([np.inf, -np.inf], np.nan, inplace=True)
    log = {"columns_converted_numeric": [], "filled_na_count": {}, "rows_dropped": 0}

    # try to convert columns that look numeric
    for col in dfc.columns:
        if dfc[col].dtype == object:
            # check if values can be converted to numeric
            sample = dfc[col].dropna().head(50).astype(str)
            numeric_like = True
            if sample.empty:
                numeric_like = False
            else:
                for val in sample:
                    try:
                        float(str(val).strip().replace(",", ""))
                    except:
                        numeric_like = False
                        break
            if numeric_like:
                try:
                    dfc[col] = pd.to_numeric(dfc[col].astype(str).str.replace(",", ""), errors="coerce")
                    log["columns_converted_numeric"].append(col)
                except Exception:
                    pass

    # fill missing values
    for col in dfc.columns:
        na_before = int(dfc[col].isna().sum())
        if na_before == 0:
            log["filled_na_count"][col] = 0
            continue
        if pd.api.types.is_numeric_dtype(dfc[col]):
            mean_val = dfc[col].mean()
            if np.isnan(mean_val):
                # leave as-is
                log["filled_na_count"][col] = 0
            else:
                dfc[col].fillna(mean_val, inplace=True)
                log["filled_na_count"][col] = int(na_before)
        else:
            # categorical: fill with mode if exists
            try:
                mode_val = dfc[col].mode(dropna=True)
                if not mode_val.empty:
                    dfc[col].fillna(mode_val.iloc[0], inplace=True)
                    log["filled_na_count"][col] = int(na_before)
                else:
                    log["filled_na_count"][col] = 0
            except Exception:
                log["filled_na_count"][col] = 0

    # no row dropping in basic cleaning; keep rows_dropped as 0
    log["rows_dropped"] = 0

    return {"cleaned_dataframe": dfc, "log": log}

# ---------- Helper: safe OneHotEncoder constructor (support older/newer sklearn)
def make_onehot_encoder(handle_unknown="ignore"):
    """
    Return OneHotEncoder that works across sklearn versions:
    - older versions accept `sparse=False`
    - newer versions accept `sparse_output=False`
    We'll try both.
    """
    try:
        # try new signature
        enc = OneHotEncoder(handle_unknown=handle_unknown, sparse_output=False)
        return enc
    except TypeError:
        # fallback to older name
        enc = OneHotEncoder(handle_unknown=handle_unknown, sparse=False)
        return enc

# ---------- Training & evaluation
def train_and_evaluate(df: pd.DataFrame, target_col: str, output_prefix: str = "models/datasphere_model"):
    """
    Train a simple AutoML: compares LogisticRegression and RandomForest (quick).
    Returns a dictionary of results ready to be JSON-serialized:
    {
      "best_model": "RandomForest",
      "metrics": {...},
      "predictions_sample": [ {<cols>..., "predicted":0, "prediction_probability":0.12}, ... ],
      "insights": { "feature_importance": {...} or "coefficients": {...} },
      "model_path": "<saved model file>"
    }
    """
    results = {}
    dfc = df.copy()
    # ensure no infinite
    dfc.replace([np.inf, -np.inf], np.nan, inplace=True)

    if target_col not in dfc.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataframe.")

    # simple strategy: drop rows where target is NaN
    dfc = dfc.loc[~dfc[target_col].isna()].copy()
    y = dfc[target_col]
    X = dfc.drop(columns=[target_col])

    # identify numeric and categorical
    numeric_cols = list(X.select_dtypes(include=[np.number]).columns)
    categorical_cols = list(X.select_dtypes(include=["object", "category"]).columns)

    # For small datasets, ensure we have at least one numeric / categorical
    # Build transformers
    numeric_transformer = Pipeline(steps=[("scaler", StandardScaler())])
    cat_enc = make_onehot_encoder(handle_unknown="ignore")
    categorical_transformer = Pipeline(steps=[("onehot", cat_enc)])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols)
        ],
        remainder="drop",  # drop anything else
        sparse_threshold=0.3
    )

    # define models to try
    models_to_try = [
        ("logistic", LogisticRegression(max_iter=200, solver="liblinear")),
        ("rf", RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1))
    ]

    # train/test split (stratify if classification binary)
    stratify = y if (pd.api.types.is_integer_dtype(y) or pd.api.types.is_bool_dtype(y)) and y.nunique() <= 10 else None
    try:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=stratify)
    except Exception:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    best_score = -1.0
    best_name = None
    best_pipeline = None
    metrics_summary = {}

    for name, model in models_to_try:
        pipe = Pipeline(steps=[("pre", preprocessor), ("model", model)])
        try:
            pipe.fit(X_train, y_train)
        except Exception as e:
            # try with simple fillna fallback: fill numeric with mean, categorical with mode (defensive)
            X_train_f = X_train.copy()
            for c in X_train_f.columns:
                if pd.api.types.is_numeric_dtype(X_train_f[c]):
                    X_train_f[c] = X_train_f[c].fillna(X_train_f[c].mean())
                else:
                    X_train_f[c] = X_train_f[c].fillna(X_train_f[c].mode().iloc[0] if not X_train_f[c].mode().empty else "")
            pipe.fit(X_train_f, y_train)

        # predictions and scoring
        try:
            y_pred = pipe.predict(X_test)
        except Exception as e:
            # if predict fails, skip this model
            continue

        # try probability
        y_prob = None
        try:
            # for binary classification we try to get positive class probability (class 1)
            probs = pipe.predict_proba(X_test)
            if probs.shape[1] == 2:
                y_prob = probs[:, 1]
            else:
                # for multiclass take max
                y_prob = probs.max(axis=1)
        except Exception:
            y_prob = None

        # compute metrics robustly
        try:
            acc = accuracy_score(y_test, y_pred)
            prec = precision_score(y_test, y_pred, zero_division=0, average="binary")
            rec = recall_score(y_test, y_pred, zero_division=0, average="binary")
            f1 = f1_score(y_test, y_pred, zero_division=0, average="binary")
        except Exception:
            # fallback to macro average if binary fails
            acc = accuracy_score(y_test, y_pred)
            prec = precision_score(y_test, y_pred, zero_division=0, average="macro")
            rec = recall_score(y_test, y_pred, zero_division=0, average="macro")
            f1 = f1_score(y_test, y_pred, zero_division=0, average="macro")

        roc = None
        if y_prob is not None:
            try:
                roc = roc_auc_score(y_test, y_prob)
            except Exception:
                roc = None

        score_for_compare = f1  # use f1 as selection metric
        metrics_summary[name] = {
            "accuracy": to_serializable(acc),
            "precision": to_serializable(prec),
            "recall": to_serializable(rec),
            "f1": to_serializable(f1),
            "roc_auc": to_serializable(roc)
        }

        if score_for_compare > best_score:
            best_score = score_for_compare
            best_name = name
            best_pipeline = pipe
            best_preds = (y_pred, y_prob)

    if best_pipeline is None:
        raise RuntimeError("No model could be trained successfully.")

    # Save model pipeline
    model_path = f"{output_prefix}_best.pkl"
    os.makedirs(os.path.dirname(model_path) or ".", exist_ok=True)
    joblib.dump(best_pipeline, model_path)

    # create predictions sample: attach first 20 rows with predicted & probability
    sample_rows = X_test.head(20).copy().reset_index(drop=True)
    y_pred_sample = best_preds[0][:len(sample_rows)] if best_preds[0] is not None else [None]*len(sample_rows)
    y_prob_sample = best_preds[1][:len(sample_rows)] if (best_preds[1] is not None) else [None]*len(sample_rows)

    preds_list = []
    for i in range(len(sample_rows)):
        row = sample_rows.iloc[i].to_dict()
        row["predicted"] = to_serializable(y_pred_sample[i])
        row["prediction_probability"] = to_serializable(float(y_prob_sample[i]) if y_prob_sample[i] is not None else None)
        preds_list.append(row)

    # insights: coefficients (if logistic) or feature importance (if RF)
    insights = {}
    try:
        model_obj = best_pipeline.named_steps["model"]
        if hasattr(model_obj, "feature_importances_"):
            # build feature importance names: need to recover names after one-hot
            # attempt to get feature names from ColumnTransformer
            try:
                pre = best_pipeline.named_steps["pre"]
                # get feature names for numeric
                num_cols = numeric_cols
                cat_cols = categorical_cols
                # get onehot categories
                oh = pre.named_transformers_["cat"].named_steps["onehot"]
                # categories_ attribute exists
                cat_names = []
                if hasattr(oh, "get_feature_names_out"):
                    cat_names = list(oh.get_feature_names_out(cat_cols))
                else:
                    # fallback: create names using categories_ (older sklearn)
                    if hasattr(oh, "categories_"):
                        for col, cats in zip(cat_cols, oh.categories_):
                            cat_names.extend([f"{col}__{c}" for c in cats])
                feature_names = num_cols + cat_names
                importances = model_obj.feature_importances_
                fi = {name: to_serializable(float(val)) for name, val in zip(feature_names[:len(importances)], importances)}
                insights["feature_importance"] = dict(sorted(fi.items(), key=lambda x: -x[1])[:15])
            except Exception:
                insights["note"] = "Feature importances available but feature names could not be reconstructed."
        elif hasattr(model_obj, "coef_"):
            coefs = model_obj.coef_
            try:
                coef_vals = coefs.ravel().tolist()
            except Exception:
                coef_vals = [float(x) for x in coefs]
            # try to name coefficients similar to above
            try:
                pre = best_pipeline.named_steps["pre"]
                num_cols = numeric_cols
                cat_cols = categorical_cols
                oh = pre.named_transformers_["cat"].named_steps["onehot"]
                cat_names = []
                if hasattr(oh, "get_feature_names_out"):
                    cat_names = list(oh.get_feature_names_out(cat_cols))
                else:
                    if hasattr(oh, "categories_"):
                        for col, cats in zip(cat_cols, oh.categories_):
                            cat_names.extend([f"{col}__{c}" for c in cats])
                feature_names = num_cols + cat_names
                co_map = {name: to_serializable(float(val)) for name, val in zip(feature_names[:len(coef_vals)], coef_vals)}
                insights["coefficients"] = co_map
            except Exception:
                insights["coefficients"] = {"_raw_coef_length": len(coef_vals)}
        else:
            insights["note"] = "Model does not expose feature importances or coefficients."
    except Exception:
        insights["note"] = "Could not extract model insights."

    results = {
        "best_model": best_name,
        "model_path": model_path,
        "metrics": to_serializable(metrics_summary.get(best_name, {})),
        "all_metrics": to_serializable(metrics_summary),
        "predictions_sample": preds_list,
        "insights": insights
    }
    return results
