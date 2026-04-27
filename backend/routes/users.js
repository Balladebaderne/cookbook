import { Router } from "express";
import { db } from "../db/index.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.post("/create/", asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  await db.prepare(`INSERT INTO users (email, password, name) VALUES (?, ?, ?)`)
    .run(email, password, name);
  res.status(201).json({ email, name });
}));

export default router;
