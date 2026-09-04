import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  const statusCode = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  res.status(statusCode).json({
    status: "error",
    message: isProd && statusCode === 500 ? "Internal server error" : err.message || "An unexpected error occurred",
    ...(isProd ? {} : { stack: err.stack }),
  });
};
