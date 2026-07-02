/**
 * server/services/weatherService.js
 * ----------------------------------
 * Fetches current precipitation data from the OpenWeatherMap API for a
 * given coordinate pair and returns a normalised score between 0 and 1.
 *
 * Normalisation: rain_1h (mm) / 50 mm capped at 1.0
 *   - 0 mm rain → 0.0
 *   - 25 mm/h (heavy rain) → 0.5
 *   - ≥ 50 mm/h (extreme) → 1.0
 *
 * Fails gracefully when no API key is configured or the request times out.
 */

const axios = require("axios");
require("dotenv").config();

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const MAX_RAIN_MM = 50; // mm/h considered "extreme"

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<number>} Precipitation score 0.0 – 1.0
 */
async function getPrecipitation(lat, lng) {
  if (!OPENWEATHER_KEY) {
    console.warn("[WEATHER] No API key configured, defaulting precip score to 0");
    return 0;
  }

  try {
    const { data } = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat,
          lon: lng,
          appid: OPENWEATHER_KEY,
          units: "metric",
        },
        timeout: 10_000,
      }
    );

    // `rain['1h']` is mm of rain in the last hour; may be absent in dry weather
    const rainMm = data?.rain?.["1h"] ?? 0;
    const score = Math.min(rainMm / MAX_RAIN_MM, 1.0);

    console.log(
      `[WEATHER] lat=${lat} lng=${lng} rain=${rainMm}mm score=${score.toFixed(4)}`
    );
    return parseFloat(score.toFixed(4));
  } catch (err) {
    console.warn("[WEATHER] API error, defaulting to 0:", err.message);
    return 0;
  }
}

module.exports = { getPrecipitation };
