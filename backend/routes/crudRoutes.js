import express from "express";
import { generateFiles, getSchemas } from "../controllers/crudController.js";

const router = express.Router();

router.post("/generate", generateFiles);
router.get("/schemas", getSchemas);

export default router;
