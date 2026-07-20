import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";

import { connectDB } from "./config/db";
import { signToken } from "./utils/jwt";
import { success, failure } from "./utils/apiResponse";
import { protect, adminOnly, AuthRequest } from "./middleware/auth";

import User from "./models/User";
import Trip from "./models/Trip";
import Favorite from "./models/Favorite";
import Booking from "./models/Booking";
import Review from "./models/Review";
import ChatHistory from "./models/ChatHistory";
import Recommendation from "./models/Recommendation";

import {
  generateItinerary,
  generateRecommendationReason,
  generateChatReply,
  getSuggestedPrompts,
} from "./utils/aiEngine";

const app = express();
const PORT = process.env.PORT || 5000;
const COOKIE_NAME = process.env.COOKIE_NAME || "tripcraft_token";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ==========================================================
// GLOBAL MIDDLEWARE
// ==========================================================
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ==========================================================
// HEALTH CHECK
// ==========================================================
app.get("/api/health", (_req: Request, res: Response) => {
  return success(res, 200, "TripCraft API is running", { timestamp: new Date().toISOString() });
});

// ==========================================================
// AUTH ROUTES
// ==========================================================

// Register
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return failure(res, 400, "Name, email and password are required.");
    }
    if (password.length < 6) {
      return failure(res, 400, "Password must be at least 6 characters long.");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return failure(res, 409, "An account with this email already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      provider: "local",
    });

    const token = signToken({ id: user._id.toString(), role: user.role });
    res.cookie(COOKIE_NAME, token, cookieOptions);

    return success(res, 201, "Account created successfully", {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err: any) {
    return failure(res, 500, "Registration failed", err.message);
  }
});

// Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return failure(res, 400, "Email and password are required.");
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !user.password) {
      return failure(res, 401, "Invalid email or password.");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return failure(res, 401, "Invalid email or password.");
    }

    const token = signToken({ id: user._id.toString(), role: user.role });
    res.cookie(COOKIE_NAME, token, cookieOptions);

    return success(res, 200, "Logged in successfully", {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err: any) {
    return failure(res, 500, "Login failed", err.message);
  }
});

// Demo Login (auto login with a seeded demo account)
app.post("/api/auth/demo-login", async (_req: Request, res: Response) => {
  try {
    const demoEmail = "demo@tripcraft.ai";
    let user = await User.findOne({ email: demoEmail });

    if (!user) {
      const hashedPassword = await bcrypt.hash("Demo@1234", 10);
      user = await User.create({
        name: "Demo Traveler",
        email: demoEmail,
        password: hashedPassword,
        provider: "local",
        role: "user",
        preferences: { interests: ["Beach", "Adventure"], travelStyle: "Mid-range", budgetRange: "$1000-$2000" },
      });
    }

    const token = signToken({ id: user._id.toString(), role: user.role });
    res.cookie(COOKIE_NAME, token, cookieOptions);

    return success(res, 200, "Logged in with demo account", {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err: any) {
    return failure(res, 500, "Demo login failed", err.message);
  }
});

// Google Login (One Tap / ID token flow)
app.post("/api/auth/google", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return failure(res, 400, "Google idToken is required.");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return failure(res, 401, "Invalid Google token.");
    }

    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name: payload.name || "Google User",
        email: payload.email.toLowerCase(),
        avatar: payload.picture || "",
        provider: "google",
        googleId: payload.sub,
      });
    } else if (user.provider !== "google") {
      user.provider = "google";
      user.googleId = payload.sub;
      if (payload.picture) user.avatar = payload.picture;
      await user.save();
    }

    const token = signToken({ id: user._id.toString(), role: user.role });
    res.cookie(COOKIE_NAME, token, cookieOptions);

    return success(res, 200, "Logged in with Google", {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err: any) {
    return failure(res, 401, "Google authentication failed", err.message);
  }
});

// Logout
app.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  return success(res, 200, "Logged out successfully");
});

// Get current logged-in user
app.get("/api/auth/me", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) return failure(res, 404, "User not found");
    return success(res, 200, "Current user fetched", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        preferences: user.preferences,
      },
    });
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch current user", err.message);
  }
});

// Update profile
app.put("/api/auth/profile", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatar, preferences } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) return failure(res, 404, "User not found");

    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();
    return success(res, 200, "Profile updated successfully", { user });
  } catch (err: any) {
    return failure(res, 500, "Failed to update profile", err.message);
  }
});

// ==========================================================
// TRIPS CRUD
// ==========================================================

// Get all trips (public) - with search, filter, sort, pagination
app.get("/api/trips", async (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      country,
      minBudget,
      maxBudget,
      minDuration,
      maxDuration,
      sortBy = "createdAt",
      order = "desc",
      page = "1",
      limit = "12",
    } = req.query as Record<string, string>;

    const filter: any = {};

    if (search) {
      filter.$text = { $search: search };
    }
    if (category) filter.category = category;
    if (country) filter.country = new RegExp(country as string, "i");
    if (minBudget || maxBudget) {
      filter.budget = {};
      if (minBudget) filter.budget.$gte = Number(minBudget);
      if (maxBudget) filter.budget.$lte = Number(maxBudget);
    }
    if (minDuration || maxDuration) {
      filter.duration = {};
      if (minDuration) filter.duration.$gte = Number(minDuration);
      if (maxDuration) filter.duration.$lte = Number(maxDuration);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const sortOrder = order === "asc" ? 1 : -1;
    const sortField = ["budget", "duration", "rating", "createdAt", "travelDate"].includes(sortBy) ? sortBy : "createdAt";

    const [trips, total] = await Promise.all([
      Trip.find(filter).sort({ [sortField]: sortOrder }).skip(skip).limit(limitNum),
      Trip.countDocuments(filter),
    ]);

    return success(res, 200, "Trips fetched successfully", trips, {
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch trips", err.message);
  }
});

// Get single trip details (public)
app.get("/api/trips/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return failure(res, 400, "Invalid trip id");

    const trip = await Trip.findById(id).populate("createdBy", "name avatar");
    if (!trip) return failure(res, 404, "Trip not found");

    const reviews = await Review.find({ trip: id }).populate("user", "name avatar").sort({ createdAt: -1 });
    const relatedTrips = await Trip.find({ category: trip.category, _id: { $ne: trip._id } }).limit(4);

    return success(res, 200, "Trip details fetched", { trip, reviews, relatedTrips });
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch trip", err.message);
  }
});

// Create trip (protected - admin only)
app.post("/api/trips", protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { title, country, description, budget, duration, travelDate, category, imageUrl, gallery } = req.body;

    if (!title || !country || !description || !budget || !duration || !travelDate || !category || !imageUrl) {
      return failure(res, 400, "All required fields must be filled.");
    }

    const trip = await Trip.create({
      title,
      country,
      description,
      budget,
      duration,
      travelDate,
      category,
      imageUrl,
      gallery: gallery || [imageUrl],
      createdBy: req.user!.id,
    });

    return success(res, 201, "Trip created successfully", trip);
  } catch (err: any) {
    return failure(res, 500, "Failed to create trip", err.message);
  }
});

// Update trip (protected - owner only)
app.put("/api/trips/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return failure(res, 400, "Invalid trip id");

    const trip = await Trip.findById(id);
    if (!trip) return failure(res, 404, "Trip not found");

    if (trip.createdBy.toString() !== req.user!.id && req.user!.role !== "admin") {
      return failure(res, 403, "You are not authorized to edit this trip.");
    }

    const updatable = ["title", "country", "description", "budget", "duration", "travelDate", "category", "imageUrl", "gallery"];
    updatable.forEach((field) => {
      if (req.body[field] !== undefined) (trip as any)[field] = req.body[field];
    });

    await trip.save();
    return success(res, 200, "Trip updated successfully", trip);
  } catch (err: any) {
    return failure(res, 500, "Failed to update trip", err.message);
  }
});

// Delete trip (protected - owner or admin)
app.delete("/api/trips/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return failure(res, 400, "Invalid trip id");

    const trip = await Trip.findById(id);
    if (!trip) return failure(res, 404, "Trip not found");

    if (trip.createdBy.toString() !== req.user!.id && req.user!.role !== "admin") {
      return failure(res, 403, "You are not authorized to delete this trip.");
    }

    await trip.deleteOne();
    await Favorite.deleteMany({ trip: id });
    await Review.deleteMany({ trip: id });

    return success(res, 200, "Trip deleted successfully");
  } catch (err: any) {
    return failure(res, 500, "Failed to delete trip", err.message);
  }
});

// Get logged-in user's own trips
app.get("/api/trips/user/mine", protect, async (req: AuthRequest, res: Response) => {
  try {
    const trips = await Trip.find({ createdBy: req.user!.id }).sort({ createdAt: -1 });
    return success(res, 200, "Your trips fetched", trips);
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch your trips", err.message);
  }
});

// ==========================================================
// FAVORITES CRUD
// ==========================================================

app.get("/api/favorites", protect, async (req: AuthRequest, res: Response) => {
  try {
    const favorites = await Favorite.find({ user: req.user!.id }).populate("trip");
    return success(res, 200, "Favorites fetched", favorites);
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch favorites", err.message);
  }
});

app.post("/api/favorites/:tripId", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tripId)) return failure(res, 400, "Invalid trip id");

    const trip = await Trip.findById(tripId);
    if (!trip) return failure(res, 404, "Trip not found");

    const existing = await Favorite.findOne({ user: req.user!.id, trip: tripId });
    if (existing) return failure(res, 409, "Trip already in favorites");

    const favorite = await Favorite.create({ user: req.user!.id, trip: tripId });
    return success(res, 201, "Added to favorites", favorite);
  } catch (err: any) {
    return failure(res, 500, "Failed to add favorite", err.message);
  }
});

app.delete("/api/favorites/:tripId", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    await Favorite.findOneAndDelete({ user: req.user!.id, trip: tripId });
    return success(res, 200, "Removed from favorites");
  } catch (err: any) {
    return failure(res, 500, "Failed to remove favorite", err.message);
  }
});

// ==========================================================
// BOOKINGS CRUD
// ==========================================================

app.get("/api/bookings", protect, async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await Booking.find({ user: req.user!.id }).populate("trip").sort({ createdAt: -1 });
    return success(res, 200, "Bookings fetched", bookings);
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch bookings", err.message);
  }
});

app.post("/api/bookings", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, travelers } = req.body;
    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) return failure(res, 400, "Valid trip id is required");

    const trip = await Trip.findById(tripId);
    if (!trip) return failure(res, 404, "Trip not found");

    const travelerCount = Number(travelers) || 1;
    const booking = await Booking.create({
      user: req.user!.id,
      trip: tripId,
      travelers: travelerCount,
      totalCost: trip.budget * travelerCount,
      status: "confirmed",
    });

    return success(res, 201, "Trip booked successfully", booking);
  } catch (err: any) {
    return failure(res, 500, "Failed to create booking", err.message);
  }
});

app.delete("/api/bookings/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return failure(res, 404, "Booking not found");
    if (booking.user.toString() !== req.user!.id) return failure(res, 403, "Not authorized");

    booking.status = "cancelled";
    await booking.save();
    return success(res, 200, "Booking cancelled");
  } catch (err: any) {
    return failure(res, 500, "Failed to cancel booking", err.message);
  }
});

// ==========================================================
// REVIEWS CRUD
// ==========================================================

app.get("/api/reviews/:tripId", async (req: Request, res: Response) => {
  try {
    const reviews = await Review.find({ trip: req.params.tripId }).populate("user", "name avatar").sort({ createdAt: -1 });
    return success(res, 200, "Reviews fetched", reviews);
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch reviews", err.message);
  }
});

app.post("/api/reviews/:tripId", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || !comment) return failure(res, 400, "Rating and comment are required");
    if (!mongoose.Types.ObjectId.isValid(tripId)) return failure(res, 400, "Invalid trip id");

    const trip = await Trip.findById(tripId);
    if (!trip) return failure(res, 404, "Trip not found");

    const review = await Review.create({ user: req.user!.id, trip: tripId, rating, comment });

    const allReviews = await Review.find({ trip: tripId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    trip.rating = Math.round(avgRating * 10) / 10;
    trip.ratingCount = allReviews.length;
    await trip.save();

    return success(res, 201, "Review added successfully", review);
  } catch (err: any) {
    return failure(res, 500, "Failed to add review", err.message);
  }
});

app.delete("/api/reviews/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return failure(res, 404, "Review not found");
    if (review.user.toString() !== req.user!.id && req.user!.role !== "admin") {
      return failure(res, 403, "Not authorized");
    }

    const tripId = review.trip;
    await review.deleteOne();

    const remaining = await Review.find({ trip: tripId });
    const trip = await Trip.findById(tripId);
    if (trip) {
      trip.rating = remaining.length ? Math.round((remaining.reduce((s, r) => s + r.rating, 0) / remaining.length) * 10) / 10 : 0;
      trip.ratingCount = remaining.length;
      await trip.save();
    }

    return success(res, 200, "Review deleted");
  } catch (err: any) {
    return failure(res, 500, "Failed to delete review", err.message);
  }
});

// ==========================================================
// AI FEATURE 1: AI TRIP PLANNER
// ==========================================================

app.post("/api/ai/trip-planner", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { destination, budget, travelDays, interests, travelStyle } = req.body;

    if (!destination || !budget || !travelDays) {
      return failure(res, 400, "Destination, budget, and travel days are required.");
    }

    const plan = generateItinerary({
      destination,
      budget: Number(budget),
      travelDays: Number(travelDays),
      interests: Array.isArray(interests) ? interests : [],
      travelStyle: travelStyle || "Balanced",
    });

    return success(res, 200, "Itinerary generated successfully", plan);
  } catch (err: any) {
    return failure(res, 500, "Failed to generate itinerary", err.message);
  }
});

// ==========================================================
// AI FEATURE 2: AI SMART RECOMMENDATION ENGINE
// ==========================================================

app.get("/api/ai/recommendations", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) return failure(res, 404, "User not found");

    const favorites = await Favorite.find({ user: req.user!.id }).populate("trip");
    const favoriteCategories = favorites.map((f: any) => f.trip?.category).filter(Boolean);
    const interests = [...new Set([...user.preferences.interests, ...favoriteCategories])];

    const filter: any = {};
    if (interests.length) filter.category = { $in: interests };

    let recommendedTrips = await Trip.find(filter).sort({ rating: -1 }).limit(8);

    if (recommendedTrips.length < 4) {
      const extra = await Trip.find({ _id: { $nin: recommendedTrips.map((t) => t._id) } })
        .sort({ rating: -1 })
        .limit(8 - recommendedTrips.length);
      recommendedTrips = [...recommendedTrips, ...extra];
    }

    const season = ["Winter", "Spring", "Summer", "Autumn"][Math.floor(new Date().getMonth() / 3)];
    const reason = generateRecommendationReason(interests, user.preferences.budgetRange || "", season);

    const recommendation = await Recommendation.create({
      user: req.user!.id,
      trips: recommendedTrips.map((t) => t._id),
      reason,
      basedOn: { interests, budgetRange: user.preferences.budgetRange, season },
    });

    return success(res, 200, "Recommendations generated", {
      trips: recommendedTrips,
      reason,
      basedOn: recommendation.basedOn,
    });
  } catch (err: any) {
    return failure(res, 500, "Failed to generate recommendations", err.message);
  }
});

// ==========================================================
// AI FEATURE 3: AI TRAVEL CHAT ASSISTANT
// ==========================================================

app.get("/api/ai/chat/history", protect, async (req: AuthRequest, res: Response) => {
  try {
    let chat = await ChatHistory.findOne({ user: req.user!.id });
    if (!chat) {
      chat = await ChatHistory.create({ user: req.user!.id, messages: [] });
    }
    return success(res, 200, "Chat history fetched", {
      messages: chat.messages,
      suggestedPrompts: getSuggestedPrompts(),
    });
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch chat history", err.message);
  }
});

app.post("/api/ai/chat", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) return failure(res, 400, "Message is required");

    let chat = await ChatHistory.findOne({ user: req.user!.id });
    if (!chat) {
      chat = await ChatHistory.create({ user: req.user!.id, messages: [] });
    }

    chat.messages.push({ role: "user", content: message, createdAt: new Date() });

    const reply = generateChatReply(
      message,
      chat.messages.map((m) => ({ role: m.role, content: m.content }))
    );

    chat.messages.push({ role: "assistant", content: reply, createdAt: new Date() });
    await chat.save();

    return success(res, 200, "AI reply generated", {
      reply,
      suggestedPrompts: getSuggestedPrompts(),
    });
  } catch (err: any) {
    return failure(res, 500, "Failed to get AI reply", err.message);
  }
});

app.delete("/api/ai/chat/history", protect, async (req: AuthRequest, res: Response) => {
  try {
    await ChatHistory.findOneAndUpdate({ user: req.user!.id }, { messages: [] });
    return success(res, 200, "Chat history cleared");
  } catch (err: any) {
    return failure(res, 500, "Failed to clear chat history", err.message);
  }
});

// ==========================================================
// DASHBOARD ANALYTICS (for Recharts)
// ==========================================================

app.get("/api/dashboard/stats", protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const myTrips = await Trip.find({ createdBy: userId });
    const favorites = await Favorite.find({ user: userId }).populate("trip");
    const bookings = await Booking.find({ user: userId });

    // Trips created per month (last 6 months)
    const monthlyActivity: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      monthlyActivity[key] = 0;
    }
    myTrips.forEach((trip) => {
      const d = new Date(trip.createdAt);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (monthlyActivity[key] !== undefined) monthlyActivity[key]++;
    });

    // Favorite categories breakdown
    const categoryCount: Record<string, number> = {};
    favorites.forEach((f: any) => {
      if (f.trip?.category) {
        categoryCount[f.trip.category] = (categoryCount[f.trip.category] || 0) + 1;
      }
    });

    // Budget analysis across own trips
    const budgetAnalysis = myTrips.map((t) => ({ title: t.title, budget: t.budget }));

    return success(res, 200, "Dashboard stats fetched", {
      totalTrips: myTrips.length,
      totalFavorites: favorites.length,
      totalBookings: bookings.length,
      monthlyActivity: Object.entries(monthlyActivity).map(([month, count]) => ({ month, count })),
      favoriteCategories: Object.entries(categoryCount).map(([category, count]) => ({ category, count })),
      budgetAnalysis,
    });
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch dashboard stats", err.message);
  }
});

// ==========================================================
// ADMIN ROUTES
// ==========================================================

app.get("/api/admin/stats", protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, totalTrips, totalBookings, totalReviews] = await Promise.all([
      User.countDocuments(),
      Trip.countDocuments(),
      Booking.countDocuments(),
      Review.countDocuments(),
    ]);

    return success(res, 200, "Site statistics fetched", {
      totalUsers,
      totalTrips,
      totalBookings,
      totalReviews,
    });
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch admin stats", err.message);
  }
});

app.get("/api/admin/users", protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return success(res, 200, "Users fetched", users);
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch users", err.message);
  }
});

app.delete("/api/admin/users/:id", protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return failure(res, 404, "User not found");

    await user.deleteOne();
    await Trip.deleteMany({ createdBy: req.params.id });
    await Favorite.deleteMany({ user: req.params.id });
    await Booking.deleteMany({ user: req.params.id });

    return success(res, 200, "User deleted successfully");
  } catch (err: any) {
    return failure(res, 500, "Failed to delete user", err.message);
  }
});

app.put("/api/admin/users/:id/role", protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) return failure(res, 400, "Invalid role");

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return failure(res, 404, "User not found");

    return success(res, 200, "User role updated", user);
  } catch (err: any) {
    return failure(res, 500, "Failed to update role", err.message);
  }
});

app.get("/api/admin/trips", protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const trips = await Trip.find().populate("createdBy", "name email").sort({ createdAt: -1 });
    return success(res, 200, "All trips fetched", trips);
  } catch (err: any) {
    return failure(res, 500, "Failed to fetch trips", err.message);
  }
});

app.delete("/api/admin/trips/:id", protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return failure(res, 404, "Trip not found");

    await trip.deleteOne();
    await Favorite.deleteMany({ trip: req.params.id });
    await Review.deleteMany({ trip: req.params.id });
    await Booking.deleteMany({ trip: req.params.id });

    return success(res, 200, "Trip deleted successfully");
  } catch (err: any) {
    return failure(res, 500, "Failed to delete trip", err.message);
  }
});

// ==========================================================
// 404 HANDLER
// ==========================================================
app.use((req: Request, res: Response) => {
  return failure(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
});

// ==========================================================
// GLOBAL ERROR HANDLER
// ==========================================================
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  return failure(res, 500, "Internal server error", process.env.NODE_ENV === "development" ? err.message : undefined);
});

// ==========================================================
// START SERVER
// ==========================================================
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`TripCraft API running on http://localhost:${PORT}`);
  });
};

startServer();