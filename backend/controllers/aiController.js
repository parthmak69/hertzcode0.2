export const generateSql = async (req, res) => {
  try {
    const { prompt, schemaContext, dbName } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Error: GEMINI_API_KEY is missing in environment variables.");
      return res.status(500).json({ error: "Gemini API key is not configured in .env" });
    }

    const isMongo = dbName && dbName.startsWith("mongodb:");

    let promptText = `You are an expert SQL assistant. Generate clean, valid MySQL queries based on the user's prompt. 
You MUST adhere strictly to standard MySQL syntax rules:
1. Use \`AUTO_INCREMENT\` (with underscore, NOT \`AUTOINCREMENT\`) for auto-incrementing primary keys.
2. Ensure every column data type is standard MySQL (e.g. \`INT\`, \`VARCHAR(length)\internal\`, \`TEXT\`, \`DECIMAL(10,2)\`, \`DATETIME\`).
3. Wrap column names in backticks.
Only return the raw SQL code block. Do NOT wrap it in markdown code blocks (like \`\`\`sql) or write any extra conversational text.

Current Database Context/Tables (if any):
${schemaContext || "No existing tables."}

User Prompt: "${prompt}"`;

    if (isMongo) {
      promptText = `You are an expert MongoDB schema assistant. Based on the user's prompt, generate a sample JSON document structure for a collection.
You MUST output ONLY a valid raw JSON object. Do NOT wrap the JSON in markdown code blocks (like \`\`\`json) or write any extra conversational text.

The JSON object structure must have exactly two fields:
1. "collectionName": string (lowercase, using underscores for spaces, e.g. "order_details").
2. "document": object (a sample document containing relevant fields with mock values, e.g. {"product_id": 101, "quantity": 5}).

User Prompt: "${prompt}"`;
    }

    // Call dynamic generative language model endpoints
    const modelName = "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: promptText,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error status:", response.status, errorText);
      return res.status(response.status).json({ error: `Gemini API error: ${response.statusText}` });
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean markdown code blocks from output
    let cleanSql = generatedText.trim();
    if (cleanSql.startsWith("```sql")) {
      cleanSql = cleanSql.substring(6);
    } else if (cleanSql.startsWith("```json")) {
      cleanSql = cleanSql.substring(7);
    } else if (cleanSql.startsWith("```")) {
      cleanSql = cleanSql.substring(3);
    }
    if (cleanSql.endsWith("```")) {
      cleanSql = cleanSql.substring(0, cleanSql.length - 3);
    }
    cleanSql = cleanSql.trim();

    // Syntax correction fallback
    cleanSql = cleanSql.replace(/\bAUTOINCREMENT\b/gi, "AUTO_INCREMENT");

    return res.json({ sql: cleanSql });
  } catch (error) {
    console.error("AI Route Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate SQL" });
  }
};
