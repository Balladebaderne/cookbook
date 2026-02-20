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
    res.status(500).json({ error: err.message });
  }
});

router.get("/me/", (req, res) => {
  console.log("Route invoked: GET /api/user/me/");
  res.status(200).json({
    email: "user@example.com",
    name: "Example User"
  });
});

router.put("/me/", (req, res) => {
  console.log("Route invoked: PUT /api/user/me/");
  const { email, name } = req.body;
  res.status(200).json({ email, name });
});

router.patch("/me/", (req, res) => {
  console.log("Route invoked: PATCH /api/user/me/");
  const data = req.body || {};

  res.status(200).json({
    email: Object.prototype.hasOwnProperty.call(data, "email") ? data.email : "user@example.com",
    name: Object.prototype.hasOwnProperty.call(data, "name") ? data.name : "Example User"
  });
});

router.post("/token/", (req, res) => {
  console.log("Route invoked: POST /api/user/token/");
  const { email, password } = req.body;

  // stub 1:1 som Flask
  res.status(200).json({ email, password });
});

export default router;
