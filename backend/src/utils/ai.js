import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ================================
   DEFINE FUNCTIONS (TOOLS)
================================ */

const tools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search products based on filters",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string" },
          color: { type: "string" },
          fabric: { type: "string" },
          max_price: { type: "number" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description: "Create order using product code and quantity",
      parameters: {
        type: "object",
        properties: {
          product_code: { type: "string" },
          quantity: { type: "number" }
        },
        required: ["product_code", "quantity"]
      }
    }
  }
];

/* ================================
   MAIN AI ANALYZER
================================ */

export async function analyzeMessage(message) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are an assistant for a wholesale clothing business.

Understand user intent and call appropriate function.

Rules:
- If user asks for products → call search_products
- If user gives product code + quantity → call create_order
- If unclear → do not call any function
        `
      },
      {
        role: "user",
        content: message
      }
    ],
    tools,
    tool_choice: "auto"
  });

  const toolCall = response.choices[0].message.tool_calls;

  if (!toolCall) {
    return { intent: "unknown" };
  }

  const call = toolCall[0];

  return {
    intent: call.function.name,
    data: JSON.parse(call.function.arguments)
  };
}