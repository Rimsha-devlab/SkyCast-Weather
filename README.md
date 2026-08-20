# 🌤️ SkyCast - Live Weather Dashboard

SkyCast is a modern, responsive, and clean Live Weather Dashboard web application built using HTML5, CSS3, and JavaScript (ES6+). Designed for an internship assignment, it features glassmorphism aesthetics, soft ambient lighting, live weather API integration, unit toggles, and robust error handling.

---

## 📌 Features

- 🔍 **City Search & Enter Key Support**: Search weather for any city worldwide with instant form validation and Enter key submission.
- ⚡ **Real-Time Weather Metrics**:
  - Temperature (°C / °F switcher)
  - Weather Condition & Animated Icon
  - Feels Like Temperature
  - Humidity Percentage
  - Wind Speed (km/h)
  - Atmospheric Pressure (hPa)
- 🎯 **Popular City Pills**: One-click quick search for popular global destinations (London, New York, Tokyo, Paris).
- ⏳ **Interactive UI States**: Smooth animated loading spinner and error notifications ("City not found").
- 📱 **Mobile-First & Responsive**: Adapts seamlessly to all screen sizes from mobile devices to desktop monitors.
- 🛠️ **Dual-Engine Weather API**: Primary integration with **OpenWeatherMap API**, with automatic seamless fallback to **Open-Meteo API** so the demo works out-of-the-box even without configuring an API key.

---

## 📁 Project Structure

```
SkyCast Weather/
│
├── index.html   # Main HTML structure and layout
├── style.css    # Modern CSS styles, design tokens & animations
├── script.js    # Async/await logic, API calls & DOM manipulation
└── README.md    # Documentation & setup instructions
```

---

## 🚀 How to Run the Project

1. **Option 1: Direct File Launch**
   - Simply double-click `index.html` or open it in any web browser (Chrome, Firefox, Edge, Safari).

2. **Option 2: Using VS Code Live Server / Local Server**
   - Open the directory in VS Code.
   - Right-click `index.html` and select **Open with Live Server**, or run `npx serve .` in terminal.

---

## 🔑 How to Add Your OpenWeatherMap API Key Safely

1. Sign up for a free account at [OpenWeatherMap](https://home.openweathermap.org/users/sign_up).
2. Go to **API Keys** in your account dashboard and copy your API Key.
3. In the `server` folder, create a file named `.env` using the example file:
   ```bash
   copy server/.env.example server/.env
   ```
4. Put your key in the `.env` file:
   ```env
   OPENWEATHER_API_KEY=your_actual_api_key_here
   PORT=3000
   ```
5. Install dependencies:
   ```bash
   cd server
   npm install
   ```
6. Start the local server:
   ```bash
   npm start
   ```
7. Open the app in your browser and refresh. The frontend will call the local proxy at `/api/weather`.

### Keep your API key safe on GitHub
- Never commit your real `.env` file.
- Add `server/.env` to `.gitignore`.
- Share only `.env.example` with placeholder values.
- If you deploy later, store the key in your hosting platform's environment settings instead of hardcoding it.

---

## 🎓 Code Highlights (For Evaluators & Interns)

- **Async / Await Pattern**: Clean non-blocking code using standard `fetch()` API.
- **Try / Catch Error Handling**: Robust error states for invalid inputs, missing cities, and network issues.
- **Dynamic DOM Manipulation**: Clean separation between data layer and UI update handlers.
