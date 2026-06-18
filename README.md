# 🌙 Al-Layl Night Calculator

A beautiful, modern web application that calculates critical divisions of the night (thirds, midpoint/Islamic Midnight) to help determine optimal prayer windows, particularly for the Isha prayer.

---

## ✨ Features

- **📊 Bento Box Dashboard:** A clean, responsive dashboard summarizing key results (2nd Third, Midpoint, Isha Preferred Window).
- **🎚️ Dual-Handle Interactive Timeline:** Drag-and-adjust Sunset (Start) and Dawn (End) boundaries directly.
- **🗺️ Geolocation & City Timings Integration:** Integrated with the **Aladhan Prayer Times API** to auto-fetch times using browser location or via city/country search.
- **📈 Divisions Visualizer:** Displays color-partitioned segments of the night (1st, 2nd, and 3rd divisions) with a live vertical line indicator representing the current time ("Now").
- **⏱️ Stepper Controls:** Fine-tune boundary values in `+1h`, `-1h`, `+5m`, or `-5m` increments.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Vanilla CSS (with responsive grid and glassmorphism styling).
- **Backend:** Python, Flask, Flask-CORS (for handling calculation requests).
- **External Integration:** Aladhan API (for fetching Maghrib and Fajr times globally).

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── app.py             # Flask backend controller & calculator logic
│   ├── requirements.txt   # Backend dependencies
│   └── test_app.py        # Backend unit tests
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component, slider state, & event handlers
│   │   ├── index.css      # Styling declarations & responsive classes
│   │   └── main.jsx       # React entry point
│   ├── index.html         # Base HTML document
│   ├── vite.config.js     # Proxy server settings mapping /api to backend
│   └── package.json       # Node dependency manifest
└── README.md              # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+ and npm

---

### Setup Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask development server:
   ```bash
   python app.py
   ```
   *The backend will start running on [http://localhost:5000](http://localhost:5000).*

---

### Setup Frontend

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install client dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on [http://localhost:5173](http://localhost:5173).*

---

## 🧮 Calculations Logic

The server handles logic for computing night divisions (defined in [app.py](file:///home/ren/agy2-projects/Al-Layl%20Calculator/backend/app.py)).

### 1. Handling Crossing Midnight
If Dawn time is chronologically less than Sunset time, the calculation treats Dawn as occurring on the following day:
$$\text{Duration} = (\text{Dawn} + 24\text{h}) - \text{Sunset}$$

### 2. Time Division Equations
* **2nd Third Start:** $\text{Sunset} + \frac{1}{3} \times \text{Duration}$
* **Islamic Midnight (Midpoint):** $\text{Sunset} + \frac{1}{2} \times \text{Duration}$
* **3rd Third Start:** $\text{Sunset} + \frac{2}{3} \times \text{Duration}$
* **Isha Preferred Window:** Duration from 2nd Third Start to Midpoint ($\frac{1}{6} \times \text{Duration}$).

---

## 📡 API Endpoints

### `POST /api/calculate`
Calculates night divisions based on sunset and dawn boundaries.

#### Request Body
```json
{
  "start_time": "18:00",
  "end_time": "05:00"
}
```

#### Response Body
```json
{
  "start_time": "18:00",
  "end_time": "05:00",
  "night_duration_minutes": 660,
  "night_duration_formatted": "11h 0m",
  "second_third_start": "21:40",
  "third_third_start": "01:20",
  "midpoint_start": "23:30",
  "to_calendar_midnight": {
    "exists": true,
    "start": "21:40",
    "end": "00:00",
    "duration_minutes": 140,
    "duration_formatted": "2h 20m"
  },
  "to_islamic_midnight": {
    "exists": true,
    "start": "21:40",
    "end": "23:30",
    "duration_minutes": 110,
    "duration_formatted": "1h 50m"
  }
}
```
