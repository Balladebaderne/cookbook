import express from "express";
import cors from "cors";
import { initDb } from "./initDb.js";

import apiRouter from "./routes/api.js";
import usersRouter from "./routes/users.js";
import recipesRouter from "./routes/recipes.js";

const app = express();
const PORT = process.env.PORT || 3000;

initDb();

app.use(cors());
app.use(express.json());

// samme base paths som Flask
app.use("/api", apiRouter);
app.use("/api/user", usersRouter);
app.use("/api/recipe", recipesRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Node API running: http://localhost:${PORT}`);
});
