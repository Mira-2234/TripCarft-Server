/**
 * Mock AI Engine
 * ----------------
 * AI_MODE=mock (default) generates deterministic, realistic-looking AI content
 * without calling any external LLM provider, so the app runs with zero API keys.
 *
 * To switch to a real provider later, set AI_MODE=live and GEMINI_API_KEY in .env,
 * then implement callGemini() below using @google/generative-ai.
 */

interface TripPlannerInput {
  destination: string;
  budget: number;
  travelDays: number;
  interests: string[];
  travelStyle: string;
}

interface ItineraryDay {
  day: number;
  title: string;
  places: string[];
  restaurants: string[];
  activities: string[];
}

const ACTIVITY_BANK = [
  "Guided walking tour of the old town",
  "Sunset viewpoint hike",
  "Local food tasting crawl",
  "Museum & heritage site visit",
  "Boat ride along the coastline",
  "Cultural dance performance",
  "Street market shopping",
  "Photography walk in the historic quarter",
  "Beach relaxation & water sports",
  "Mountain trail trekking",
];

const RESTAURANT_BANK = [
  "The Local Spoon",
  "Sunset Terrace Bistro",
  "Old Town Kitchen",
  "Harbor View Cafe",
  "Spice Route Diner",
  "Heritage Food House",
];

const HOTEL_BANK = [
  "Comfort Inn & Suites",
  "The Grand Horizon Hotel",
  "Boutique Riverside Stay",
  "Skyline Business Hotel",
  "Cozy Traveler's Lodge",
];

const PACKING_TIPS_BANK = [
  "Pack light, breathable clothing suited to the local climate",
  "Bring a universal power adapter and portable charger",
  "Carry a reusable water bottle and basic first-aid kit",
  "Keep digital + physical copies of ID and travel documents",
  "Pack comfortable walking shoes for daily exploring",
  "Check the weather forecast a day before departure and adjust luggage",
];

function pickN<T>(bank: T[], n: number, seedOffset = 0): T[] {
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    result.push(bank[(i + seedOffset) % bank.length]);
  }
  return result;
}

export function generateItinerary(input: TripPlannerInput) {
  const { destination, budget, travelDays, interests, travelStyle } = input;
  const days: ItineraryDay[] = [];

  for (let d = 1; d <= travelDays; d++) {
    days.push({
      day: d,
      title: `Day ${d}: Exploring ${destination}`,
      places: pickN(
        [`${destination} City Center`, `${destination} National Park`, `${destination} Old Quarter`, `${destination} Waterfront`, `${destination} Hilltop Viewpoint`],
        2,
        d
      ),
      restaurants: pickN(RESTAURANT_BANK, 2, d),
      activities: pickN(ACTIVITY_BANK, 2, d + interests.length),
    });
  }

  const estimatedCost = {
    accommodation: Math.round(budget * 0.35),
    food: Math.round(budget * 0.25),
    activities: Math.round(budget * 0.2),
    transport: Math.round(budget * 0.15),
    misc: Math.round(budget * 0.05),
    total: budget,
  };

  return {
    destination,
    travelStyle,
    interests,
    duration: travelDays,
    summary: `A ${travelDays}-day ${travelStyle.toLowerCase()} trip to ${destination} tailored around ${
      interests.length ? interests.join(", ") : "general sightseeing"
    }, designed to fit an estimated budget of $${budget}.`,
    itinerary: days,
    recommendedHotels: pickN(HOTEL_BANK, 3),
    packingTips: pickN(PACKING_TIPS_BANK, 4),
    estimatedCost,
    generatedAt: new Date().toISOString(),
  };
}

export function generateRecommendationReason(interests: string[], budgetRange: string, season: string) {
  const interestText = interests.length ? interests.join(", ") : "general travel";
  return `Based on your interest in ${interestText}, your ${budgetRange || "flexible"} budget preference, and the upcoming ${
    season || "season"
  }, these destinations closely match your travel profile and past favorites.`;
}

const SUGGESTED_PROMPTS = [
  "Suggest a 5-day budget trip to Southeast Asia",
  "What's the best time to visit the mountains?",
  "Help me plan a honeymoon itinerary",
  "What should I pack for a beach vacation?",
];

export function getSuggestedPrompts() {
  return SUGGESTED_PROMPTS;
}

export function generateChatReply(message: string, history: { role: string; content: string }[]) {
  const lower = message.toLowerCase();

  if (lower.includes("budget")) {
    return "For a budget-friendly trip, I'd recommend hostels or guesthouses, local street food, and free walking tours. Would you like me to draft a full budget itinerary for a specific destination?";
  }
  if (lower.includes("pack") || lower.includes("packing")) {
    return "Great question! Packing depends on your destination's climate. Generally: breathable clothing, comfortable shoes, a power adapter, and essential documents. Want a packing list tailored to a specific place?";
  }
  if (lower.includes("weather") || lower.includes("season") || lower.includes("time to visit")) {
    return "The best time to visit really depends on the destination — most places have a 'shoulder season' with pleasant weather and fewer crowds. Tell me the destination and I'll suggest the ideal months.";
  }
  if (lower.includes("itinerary") || lower.includes("plan")) {
    return "I can put together a day-by-day itinerary for you! Head to the AI Trip Planner page, or tell me your destination, budget, and number of days here and I'll sketch one out.";
  }
  if (lower.includes("hello") || lower.includes("hi ")) {
    return "Hello! I'm your TripCraft AI Travel Assistant. Ask me about destinations, budgets, packing, or say 'plan a trip to Bali' to get started.";
  }

  return `That's a great question about "${message}". Based on our conversation so far, I'd suggest starting with your destination and rough budget so I can give more tailored travel advice. Want me to generate a sample itinerary?`;
}
