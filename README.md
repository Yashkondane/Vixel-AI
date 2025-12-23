# Vixel Ai 🎨✨

**Vixel Ai** is a professional-grade, browser-native generative image editing suite powered by **Google Gemini 2.5 Flash**.

---

## 🚀 Local Setup (Run it on your machine)

To run this project locally, follow these steps:

### 1. Prerequisites
- **Node.js**: Install the latest LTS version from [nodejs.org](https://nodejs.org/).
- **Gemini API Key**: Get a free API key from [Google AI Studio](https://aistudio.google.com/).

### 2. Installation
1.  **Download** the project files to a folder.
2.  **Open a Terminal** in that folder.
3.  **Install Vite** and dependencies:
    ```bash
    npm install
    ```

### 3. Configuration (API Key)
Vixel Ai uses Vite's `define` plugin to inject your API key into the app securely.
1.  Create a file named `.env` in the root directory.
2.  Add your key to the file like this:
    ```env
    VITE_GEMINI_API_KEY=your_actual_key_here
    ```

### 4. Start Development
Run the following command:
```bash
npm run dev
```
Open your browser to `http://localhost:5173`. **You must use this URL for the API key to be detected correctly.**

---

## ❓ Troubleshooting

### "An API Key must be set when running in a browser"
If you see this error after setting your `.env` file:
1.  **Restart the dev server**: Stop the terminal (Ctrl+C) and run `npm run dev` again.
2.  **Check Variable Name**: Ensure it is exactly `VITE_GEMINI_API_KEY`.
3.  **Browser Refresh**: Force refresh your browser (Ctrl+F5).
4.  **Use the correct URL**: Ensure you are visiting `http://localhost:5173`, not just opening the `index.html` file directly from your folder.

---

## 🛡️ Production & Budget Safety

Vixel Ai includes a built-in **Budget Protection Service** (₹200 Monthly Cap). Usage is tracked in your browser's `localStorage` and resets automatically every month.

---

## 📜 License
Apache-2.0