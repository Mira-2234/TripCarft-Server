import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { failure } from "../utils/apiResponse";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "tripcraft_token";
    let token = req.cookies?.[cookieName];

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return failure(res, 401, "Not authenticated. Please log in.");
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return failure(res, 401, "Invalid or expired session. Please log in again.");
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "admin") {
    return failure(res, 403, "Access denied. Admin privileges required.");
  }
  next();
};
