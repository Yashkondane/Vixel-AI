# Vixel Ai 🎨✨

**Vixel Ai** is a professional-grade, browser-native generative image editing suite. Built with **React 19**, **TypeScript**, and powered by **Google Gemini 2.5 Flash**, it enables complex AI-driven transformations—from localized "Point-and-Edit" retouching to high-volume batch processing—all without a server-side backend.

---

## 🌟 Key Features

### 1. Point-and-Edit (Localized Retouching)
Navigate your image and click any specific coordinate to anchor an edit. Vixel uses coordinate-aware prompting to tell the AI exactly where to apply changes (e.g., "change the color of this flower to blue"), ensuring high precision without manual masking.

### 2. History Brush (Masking Engine)
A custom-engineered **HTML5 Canvas** engine that allows users to selectively composite pixels from previous history states onto the live canvas.
- **Adjustable Parameters:** Brush size, hardness, and opacity.
- **Smart Composition:** AI seamlessly blends masked areas for photorealistic results.
- **Undo/Redo:** Full stroke-based history management.

### 3. Artistic Style Transfer
Upload a "Style Image" to imprint its aesthetic, color palette, and texture onto your target photo. Guiding prompts can be used to refine how the AI interprets the artistic crossover.

### 4. Resilient Batch Processing
Process dozens of images at once with AI filters or global adjustments.
- **JSZip Integration:** Client-side bundling of processed images for instant download.
- **Retry Logic:** Implements recursive exponential backoff to handle API rate limits gracefully.
- **Adaptive AI:** Optionally enables the AI to analyze each image individually to maintain look-consistency across a diverse batch.

### 5. Professional Workspace
- **Image Comparator:** Real-time "Before/After" slider and "Press-and-Hold" comparison modes.
- **Infinite Viewport:** High-performance pan and zoom (up to 500%) with hardware-accelerated transforms.
- **Manual Controls:** Standard sliders for Brightness, Contrast, Saturation, and Hue that can be "baked in" using AI for enhanced quality.

---

## 🛡️ Production & Budget Safety

Vixel Ai includes a built-in **Budget Protection Service** to ensure API costs remain predictable during production testing:
- **₹200 Monthly Cap:** Automatically blocks API calls if the estimated monthly spend hits the threshold.
- **Estimated Cost Tracking:** Uses a conservative cost table (e.g., ~$0.003 per localized edit) to track usage in `localStorage`.
- **Automatic Reset:** Resets counters at the start of every calendar month.

---

## 🛠️ Technical Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **AI Engine:** Google Gemini 2.5 Flash (via `@google/genai`)
- **Graphics:** HTML5 Canvas (Custom Masking & Compositing)
- **Utilities:** `jszip` (Batch bundling), `react-image-crop` (Precise cropping)
- **Deployment:** Fully client-side; API keys handled via environment variables.

---

## 🚀 Getting Started

1. **Environment Variable:** Ensure `process.env.API_KEY` is set to your Google Gemini API key.
2. **Installation:** Use the provided `importmap` in `index.html` to load dependencies via ESM.
3. **Usage:**
   - Upload an image to enter **Single Mode**.
   - Upload multiple images to enter **Batch Mode**.
   - Use **Spacebar** to toggle pan mode while zoomed in.

---

## 📜 License
Apache-2.0 - Developed for high-performance generative AI experimentation.