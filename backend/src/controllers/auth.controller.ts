import { Request, Response } from "express";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { loginUser, refreshUserTokens, logoutUser, getProfile } from "../services/auth.service.js";

export const login = asyncWrapper(async (req: Request, res: Response) => {
  const userPayload = await loginUser(req.body, res);
  res.status(200).json({
    status: "success",
    message: "Login successful",
    data: userPayload,
  });
});

export const refresh = asyncWrapper(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  if (!rawRefreshToken) {
    res.status(401).json({ status: "fail", message: "Refresh token missing" });
    return;
  }
  const userPayload = await refreshUserTokens(rawRefreshToken, res);
  res.status(200).json({
    status: "success",
    message: "Tokens refreshed successfully",
    data: userPayload,
  });
});

export const logout = asyncWrapper(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  await logoutUser(rawRefreshToken, res);
  res.status(200).json({
    status: "success",
    message: "Logout successful",
  });
});

export const me = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const profile = await getProfile(req.user.id);
  res.status(200).json({
    status: "success",
    data: profile,
  });
});
