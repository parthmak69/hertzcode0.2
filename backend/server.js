import express from "express";
import dotenv from "dotenv";
import cors from "cors";


dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("Hertzcode server is running");
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});