import express from "express";
import { generateFiles, getSchemas, getProjects, saveProjects, initializeProject } from "../controllers/crudController.js";

const router = express.Router();

router.post("/generate", generateFiles);
router.post("/initialize", initializeProject);
router.get("/schemas", getSchemas);
router.get("/projects", getProjects);
router.post("/projects", saveProjects);

export default router;
