import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import prisma from "../lib/prisma.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "avatars");

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const uploadAvatar = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const { image } = req.body;

  if (!image || typeof image !== "string") {
    res.status(400).json({ status: "fail", message: "Image data is required" });
    return;
  }

  // Parse Data URL format: "data:image/png;base64,..."
  const matches = image.match(/^data:(image\/(jpeg|jpg|png|webp));base64,(.+)$/);
  if (!matches) {
    res.status(400).json({
      status: "fail",
      message: "Invalid image format. Allowed formats: JPG, JPEG, PNG, WebP.",
    });
    return;
  }

  const mimeType = matches[1];
  const ext = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
  const base64Data = matches[3];
  const buffer = Buffer.from(base64Data, "base64");

  // Validate File Size (max 5MB = 5 * 1024 * 1024 bytes)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    res.status(400).json({
      status: "fail",
      message: "File size exceeds maximum allowed limit of 5MB.",
    });
    return;
  }

  // Find existing user to clean up old avatar file
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  if (existingUser?.avatarUrl) {
    const oldFileName = path.basename(existingUser.avatarUrl);
    const oldFilePath = path.join(UPLOADS_DIR, oldFileName);
    if (fs.existsSync(oldFilePath)) {
      try {
        await fs.promises.unlink(oldFilePath);
      } catch (err) {
        // Ignore deletion error of legacy file
      }
    }
  }

  // Generate safe filename
  const filename = `avatar-${userId}-${Date.now()}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  await fs.promises.writeFile(filePath, buffer);

  const relativeUrl = `/uploads/avatars/${filename}`;

  // Update DB record
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: relativeUrl },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  });

  res.status(200).json({
    status: "success",
    message: "Profile photo updated successfully",
    data: updatedUser,
  });
});

export const deleteAvatar = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }

  const userId = req.user.id;

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  if (existingUser?.avatarUrl) {
    const oldFileName = path.basename(existingUser.avatarUrl);
    const oldFilePath = path.join(UPLOADS_DIR, oldFileName);
    if (fs.existsSync(oldFilePath)) {
      try {
        await fs.promises.unlink(oldFilePath);
      } catch (err) {
        // Ignore file deletion error
      }
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  });

  res.status(200).json({
    status: "success",
    message: "Profile photo removed successfully",
    data: updatedUser,
  });
});
