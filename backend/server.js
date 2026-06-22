import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import databaseRoutes from "./routes/databaseRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import crudRoutes from "./routes/crudRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Register API Routes
app.use("/api/auth", authRoutes);
app.use("/api/database", databaseRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/crud", crudRoutes);

app.get("/", async (req, res) => {
  res.send("Hertzcode server is running");
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
