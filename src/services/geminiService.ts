import {GoogleGenAI, Type} from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined") {
      throw new Error("GEMINI_API_KEY is missing or invalid. Please set it in your environment variables.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateListingDetails(shortDescription: string) {
  try {
    const model = getAI();
    const response = await model.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a product listing based on this short description: "${shortDescription}". 
      The goal is to help a student sell this on a campus marketplace.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Catcy product title" },
            description: { type: Type.STRING, description: "Detailed product description" },
            suggestedPrice: { type: Type.NUMBER, description: "Suggested price based on market value" },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Relevant tags/categories"
            },
            category: { type: Type.STRING, description: "Primary category" }
          },
          required: ["title", "description", "suggestedPrice", "tags", "category"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate listing details");
  }
}
