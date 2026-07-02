/**
 * server/services/aiService.js
 * ----------------------------
 * Sends an uploaded image file to the Python FastAPI microservice and
 * returns the CNN disaster confidence score (0–1) and predicted label.
 *
 * Fails gracefully: if the AI service is unreachable (e.g. during local dev
 * without TensorFlow), it logs a warning and returns default values so the rest of the
 * scoring pipeline continues without crashing.
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
require("dotenv").config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * @param {string} imagePath - Absolute path to the saved upload on disk
 * @returns {Promise<{cnnScore: number, aiLabel: string}>} Object containing the AI score and classification label
 */
async function analyzeImage(imagePath) {
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(imagePath));

    const response = await axios.post(`${AI_SERVICE_URL}/analyze`, form, {
      headers: form.getHeaders(),
      timeout: 30_000, // 30 s — TF inference can be slow on CPU
    });

    const score = parseFloat(response.data?.cnn_score ?? 0);
    const label = response.data?.top_label || "unknown";

    console.log(`[AI] CNN score=${score} label="${label}"`);
    
    // Return both pieces of data so the controller can apply the dynamic rubric
    return {
      cnnScore: isNaN(score) ? 0 : Math.min(1, Math.max(0, score)),
      aiLabel: label
    };
    
  } catch (err) {
    console.warn("[AI] Service unavailable, defaulting CNN score to 0:", err.message);
    
    // Fail gracefully with the same object structure
    return {
      cnnScore: 0,
      aiLabel: "unknown"
    };
  }
}

module.exports = { analyzeImage };