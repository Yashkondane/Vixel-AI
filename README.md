# Vixel Ai

**Vixel Ai** is a professional-grade image editing suite. This version features a **Golang Backend** for enhanced security and performance, and is curently under devlopment. 

---

## Local Setup

### 1. Start the Backend (Golang)
1.  Open a terminal in the project root.
2.  Set your API Key:
    ```bash
    export API_KEY=your_gemini_api_key  # Linux/Mac
    set API_KEY=your_gemini_api_key     # Windows
    ```
3.  Run the server:
    ```bash
    go run main.go
    ```
    The server will start at `http://localhost:8080`.

### 2. Start the Frontend (Vite)
1.  Open a second terminal.
2.  Install dependencies: `npm install`
3.  Run the frontend: `npm run dev`
4.  Open `http://localhost:5173`.

---

## 🛠️ Architecture
- **Frontend**: React + Vite (Handles UI and Image Logic).
- **Backend**: Golang (Handles AI API communication and file encoding).
- **AI**: Gemini 2.5 Flash Image.

---

## 🛡️ Budget Safety
Usage is tracked in `localStorage` with a ₹200 monthly cap to ensure cost predictability.

---
