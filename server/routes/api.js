import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  console.log("Route invoked: GET /api");
  res.status(200).json({
    message: "Cookbook API",
    version: "1.0.0",
    endpoints: {
      user: "/api/user",
      recipe: "/api/recipe"
    }
  });
});

export default router;
