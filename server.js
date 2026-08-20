import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;
const apiKey = process.env.OPENWEATHER_API_KEY;

// Allow CORS from GitHub Pages
app.use(cors({
  origin: ['https://rimsha-devlab.github.io', 'http://localhost:3000'],
  methods: ['GET'],
}));

app.use(express.static(__dirname));

app.get('/api/weather', async (req, res) => {
  const { city, lat, lon } = req.query;

  if (!city && !(lat && lon)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a city name or coordinates.'
    });
  }

  try {
    if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_api_key_here') {
      const params = new URLSearchParams({
        appid: apiKey,
        units: 'metric'
      });

      if (city) params.set('q', city);
      if (lat) params.set('lat', lat);
      if (lon) params.set('lon', lon);

      try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params.toString()}`);

        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            const errorPayload = await response.json().catch(() => ({}));
            let errorMessage = errorPayload.message || 'Weather request failed.';
            
            if (response.status === 401) {
              errorMessage = 'Weather API key is invalid or not activated yet.';
            } else if (response.status === 404) {
              errorMessage = 'City not found. Please try another city.';
            }
            
            return res.status(response.status).json({
              success: false,
              message: errorMessage
            });
          }
          // For other errors (like 500, 503), throw to trigger fallback
          throw new Error(`OpenWeatherMap returned ${response.status}`);
        }

        const data = await response.json();
        const weatherData = {
          city: data.name,
          country: data.sys?.country || '',
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          tempMin: Math.round(data.main.temp_min),
          tempMax: Math.round(data.main.temp_max),
          humidity: data.main.humidity,
          windSpeed: (data.wind.speed * 3.6).toFixed(1),
          pressure: data.main.pressure,
          condition: data.weather[0]?.description || 'Clear',
          conditionMain: data.weather[0]?.main || 'Clear',
          iconCode: data.weather[0]?.icon || '01d',
          dt: data.dt,
          sunrise: data.sys?.sunrise || null,
          sunset: data.sys?.sunset || null,
          iconUrl: `https://openweathermap.org/img/wn/${data.weather[0]?.icon || '01d'}@4x.png`
        };

        return res.json({ success: true, weatherData });
      } catch (owmError) {
        console.warn('OpenWeatherMap fetch failed, falling back to Open-Meteo:', owmError.message);
        // Do not return here, let it fall through to Open-Meteo
      }
    }

    let geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json';
    if (city) {
      geocodingUrl += `&name=${encodeURIComponent(city)}`;
    } else {
      geocodingUrl += `&latitude=${lat}&longitude=${lon}`;
    }

    const geocodingResponse = await fetch(geocodingUrl);
    if (!geocodingResponse.ok) {
      throw new Error('Could not resolve location.');
    }

    const geocodingData = await geocodingResponse.json();
    const location = geocodingData.results?.[0];

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'City not found. Please try another name.'
      });
    }

    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,windspeed_10m,weather_code&timezone=auto`);
    if (!weatherResponse.ok) {
      throw new Error('Weather service is unavailable.');
    }

    const weatherDataResponse = await weatherResponse.json();
    const current = weatherDataResponse.current;
    const weatherCode = current.weather_code;
    const conditionMap = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Light rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Light snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Rain showers',
      81: 'Heavy rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with hail'
    };

    const weatherData = {
      city: location.name,
      country: location.country || '',
      temp: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.temperature_2m),
      tempMin: Math.round(current.temperature_2m),
      tempMax: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      windSpeed: Number(current.windspeed_10m).toFixed(1),
      pressure: 0,
      condition: conditionMap[weatherCode] || 'Clear sky',
      conditionMain: conditionMap[weatherCode] || 'Clear sky',
      iconCode: weatherCode < 3 ? '01d' : '04d',
      dt: Math.floor(Date.now() / 1000),
      sunrise: null,
      sunset: null,
      iconUrl: 'https://openweathermap.org/img/wn/01d@4x.png'
    };

    return res.json({ success: true, weatherData });
  } catch (error) {
    console.error('Weather proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch weather data at the moment.'
    });
  }
});

app.listen(port, () => {
  console.log(`Weather proxy running on http://localhost:${port}`);
});
