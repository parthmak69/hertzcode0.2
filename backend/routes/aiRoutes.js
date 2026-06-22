import express from "express";
import { generateSql } from "../controllers/aiController.js";

const router = express.Router();

router.post("/", generateSql);

export default router;
