import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateChatReply(
  message: string,
  history: { role: string; content: string }[]
): Promise<string> {
  try {
    const conversationHistory = history.slice(-10).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system:
        "You are a friendly, knowledgeable travel assistant for TripCraft, an AI-powered trip planning platform. Help users with destination ideas, itinerary suggestions, budget tips, packing advice, and general travel questions. Keep responses concise, warm, and conversational — usually 2-4 sentences unless more detail is genuinely needed.",
      messages: [...conversationHistory, { role: "user", content: message }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock && "text" in textBlock
      ? textBlock.text
      : "Sorry, I couldn't generate a response right now.";
  } catch (err) {
    console.error("AI chat error:", err);
    return "Sorry, I'm having trouble responding right now. Please try again in a moment.";
  }
}