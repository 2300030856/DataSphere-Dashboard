
# DataSphere — Automated Data Analytics and Machine Learning Dashboard

DataSphere is a full-stack web application designed to simplify data preprocessing, machine learning analysis, prediction exploration, and data visualization. It provides a user-friendly dashboard where users can upload CSV datasets, clean data, analyze patterns, view model performance and insights, explore predictions, and create custom charts.
The application combines a React.js frontend with a Python Flask backend to provide an integrated data analytics workflow.

---


## Project Overview

Working with raw datasets often requires data cleaning, preprocessing, model evaluation, and visualization. Performing these tasks separately can be time-consuming, especially for users who want to explore a dataset without manually carrying out every step.

DataSphere brings these tasks together in one web application. Users can upload a CSV file, preview raw data, clean and preprocess the dataset, perform machine learning analysis, view prediction results and model insights, and visualize information through charts.

The frontend provides an interactive interface, while the backend handles file processing, data preparation, and the configured machine learning pipeline.

## Objectives

- Simplify CSV dataset uploading and previewing.
- Provide a workflow for cleaning and preprocessing data.
- Automate supported machine learning analysis tasks.
- Display model performance metrics and available insights.
- Present prediction results in a structured table.
- Support interactive data visualization through charts.
- Provide a convenient interface for exploring data analytics results.

## Features

### 1. Landing Screen
A landing screen introduces the application and allows users to enter the dashboard.

### 2. Dataset Upload
Users can select and upload CSV files. The dashboard displays a preview of the uploaded raw data.

### 3. Data Cleaning
The backend preprocesses the uploaded dataset and returns cleaned sample rows and available cleaning information.

### 4. Model Performance
The application displays available evaluation metrics, such as accuracy, precision, recall, and F1 score.

### 5. Model Insights
The dashboard displays available model insights, such as feature importance or model coefficients, depending on the model used.

### 6. Predictions
Prediction results are displayed in a dedicated table so users can examine the available output.

### 7. Charts and Visualization
The application provides charts for exploring prediction results and a custom chart builder where users can select a data source, X-axis field, Y-axis field, and chart type.

### 8. Download Cleaned Data
Users can download the cleaned sample data available in the frontend as a CSV file.

### 9. Collapsible Sidebar
The dashboard uses a collapsible sidebar to navigate between the available sections.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, JavaScript, CSS |
| Frontend Tooling | Vite |
| Backend | Python, Flask |
| Data Processing | Pandas and NumPy, where used |
| Machine Learning | Scikit-learn |
| Classification Models | Logistic Regression and Random Forest, as configured in the pipeline |
| Data Visualization | Chart.js, react-chartjs-2 |
| API Communication | HTTP requests through the frontend API module |
| Version Control | Git and GitHub |
| Development Environment | Visual Studio Code |

The exact libraries and algorithms depend on the current backend implementation and its installed dependencies.

---

## System Architecture

DataSphere follows a frontend-backend architecture.

```text
                    USER
                      |
                      v
              React.js Frontend
                (Vite Dashboard)
                      |
                      | HTTP Requests
                      v
                 Flask Backend
                      |
                      v
             Data Processing Pipeline
                      |
             +--------+---------+
             |                  |
             v                  v
       Data Cleaning      ML Analysis
                                |
                                v
                    Predictions and Insights
                                |
                                v
                     Results Returned as JSON
                                |
                                v
                     React Dashboard Display
                                |
                 +--------------+--------------+
                 |              |              |
                 v              v              v
              Tables         Metrics          Charts
```

The frontend sends requests to the backend through API endpoints. The backend processes the data and returns results that the frontend uses to update the dashboard.

---

## Application Workflow

### Step 1: Upload

The user selects a CSV dataset and clicks the Upload button. The frontend sends the file to the Flask backend, which processes the upload and returns raw data preview information.

### Step 2: Clean

The user selects the Clean section and clicks Clean Now. The backend cleaning pipeline preprocesses the dataset and returns cleaned sample rows and available cleaning-change information.

### Step 3: Find Patterns

The user runs the analysis functionality. The backend executes its configured machine learning pipeline and returns model performance metrics and available insights.

### Step 4: Predictions

The user navigates to the Predictions section to view the prediction results in a dedicated table.

### Step 5: Charts

The user opens the Charts section to explore visualizations and use the custom chart builder to select fields and chart types.

### Step 6: Download

The user can download the cleaned sample currently available in the frontend as a CSV file.

---

## Project Structure

The project contains a React frontend and a Python backend.

```text
Final_Year_Try/
|
|-- app.py
|-- datasphere_pipeline.py
|-- requirements.txt
|-- README.md
|-- .gitignore
|
|-- datasphere_frontend_autodetect_vite/
|   |-- src/
|   |   |-- components/
|   |   |-- App.jsx
|   |   |-- index.css
|   |   |-- api.js
|   |
|   |-- index.html
|   |-- package.json
|   |-- package-lock.json
|   |-- vite.config.js
|
|-- screenshots/
|   |-- landing-screen.png
|   |-- upload-dashboard.png
|   |-- cleaned-data.png
|   |-- model-performance.png
|   |-- predictions.png
|   |-- charts.png
|
|-- uploads/
|-- cleaned/
|-- output/
|-- models/
```

This is a representative structure. Actual folders and filenames may differ. Generated data and model artifacts should not be committed unless they are necessary and safe to share.

---

## API Endpoints

The frontend communicates with the Flask backend using API requests.

| Endpoint | Method | Purpose |
|---|---|---|
| `/upload` | POST | Upload a CSV file and return raw data preview information |
| `/clean` | POST | Clean and preprocess the dataset |
| `/analyze` | POST | Execute the configured analysis pipeline |
| `/get_output_json` | GET | Retrieve output JSON, if used by the current frontend |

These endpoint names and methods should match the actual Flask route definitions in `app.py`.

---

## Installation and Setup

### Prerequisites

Install the following tools before running the application:

- Python 3
- Node.js and npm
- Git
- Visual Studio Code or another code editor
- A modern web browser

### 1. Clone the Repository

Replace `YOUR-USERNAME` with your GitHub username.

```bash
git clone https://github.com/YOUR-USERNAME/DataSphere-AutoML-Dashboard.git
cd DataSphere-AutoML-Dashboard
```

If your repository has a different name, use its actual URL and folder name.

### 2. Set Up the Backend

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
python app.py
```

Keep this terminal open while using the application.

### 3. Set Up the Frontend

Open a second terminal in the repository root:

```bash
cd datasphere_frontend_autodetect_vite
npm install
npm run dev
```

Open the local URL printed by Vite. It is commonly:

```text
http://localhost:5173/
```

### 4. Configure Backend Communication

Ensure the frontend API base URL matches the Flask backend address and port. Configure CORS if required by the application's development setup.

The actual backend port and API configuration depend on the current project settings.

---

## How to Use

1. Start the Flask backend.
2. Start the Vite frontend.
3. Open the dashboard in a web browser.
4. Enter the dashboard from the landing screen.
5. Upload a supported CSV dataset.
6. Preview the raw data.
7. Clean and preprocess the dataset.
8. Review the cleaned data and cleaning changes.
9. Run the configured analysis.
10. Explore model performance and insights.
11. View prediction results.
12. Generate charts and explore the dataset visually.
13. Download the available cleaned sample if required.

The results depend on the dataset structure and the backend's supported preprocessing and analysis logic.

---

## Applications

DataSphere can be useful for:

- Educational demonstrations of data analytics workflows.
- Exploring and preprocessing CSV datasets.
- Demonstrating a frontend-backend integration.
- Learning how machine learning outputs can be presented in a dashboard.
- Visualizing dataset characteristics and prediction results.
- Academic projects involving data processing and machine learning.

## Future Enhancements

Possible improvements include:

- Support for additional dataset formats.
- More configurable preprocessing options.
- Additional machine learning algorithms.
- Expanded model evaluation metrics.
- More visualization types and customization options.
- Downloadable analysis reports.
- Improved support for larger datasets.
- Enhanced error handling and user feedback.

These are potential future improvements, not claims about currently implemented features.

---

## Author

**Project:** DataSphere — Automated Data Analytics and Machine Learning Dashboard

**Developed as:** An academic full-stack data analytics project.

---
