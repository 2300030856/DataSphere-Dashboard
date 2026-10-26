DataSphere Frontend (Vite + React)

How to run:
1. Extract this folder
2. Make sure your backend (Flask) is running at http://127.0.0.1:5000
3. In the frontend folder run:
   npm install
   npm run dev
4. Open http://localhost:5173

Endpoints expected:
- POST /upload   (multipart/form-data file field named 'file')
- POST /clean    (JSON { path: "<uploads/...csv>" })
- POST /analyze  (JSON { path: "<cleaned/...csv>" })
- GET  /get_output_json?path=...

The frontend provides:
- Upload + progress
- Clean button (calls backend)
- Find Patterns (train & analyze)
- Tables for raw/cleaned/predictions
- Insights card and charts
