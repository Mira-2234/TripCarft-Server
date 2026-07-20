import { Response } from "express";

export const success = (res: Response, statusCode: number, message: string, data: any = null, extra: Record<string, any> = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
  });
};

export const failure = (res: Response, statusCode: number, message: string, errors: any = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
