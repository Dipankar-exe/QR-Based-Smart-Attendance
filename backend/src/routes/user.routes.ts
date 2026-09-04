import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { uploadAvatar, deleteAvatar } from "../controllers/user.controller.js";

const router = Router();

// Require authentication for avatar management
router.use(authenticate);

router.post("/avatar", uploadAvatar);
router.delete("/avatar", deleteAvatar);

export default router;
