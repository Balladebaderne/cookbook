import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.post("/create/", async (req, res) => {
  console.log("Route invoked: POST /api/user/create/");

  try {
    const { email, password, name } = req.body;

    await db.prepare(`INSERT INTO users (email, password, name) VALUES (?, ?, ?)`)
      .run(email, password, name);

    res.status(201).json({ email, name });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Kunne ikke oprette brugeren." });
  }
});

export default router;
