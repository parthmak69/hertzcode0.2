import express from "express";
import { login, forgotPassword, listUsers, createUser } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.get("/users", listUsers);
router.post("/users", createUser);

export default router;
