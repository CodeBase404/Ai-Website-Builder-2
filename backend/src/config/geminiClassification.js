import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API });

async function geminiClassification(prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text;
}

export default geminiClassification;