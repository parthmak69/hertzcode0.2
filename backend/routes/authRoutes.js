import express from "express";
import { login, forgotPassword, listUsers, createUser, deleteUser, updateUser } from "../controllers/authController.js";

const router = express.Router();

// Handle login via /login, /admin/login, or /api/auth/admin/login
router.post(["/login", "/admin/login", "/api/auth/admin/login"], login);
router.post(["/forgot-password", "/admin/forgot-password", "/api/auth/admin/forgot-password"], forgotPassword);
router.post(["/reset-password", "/admin/reset-password", "/api/auth/admin/reset-password"], forgotPassword);
router.get("/users", listUsers);
router.post("/users", createUser);
router.delete("/users/:id", deleteUser);
router.delete("/users", deleteUser);
router.put("/users/:id", updateUser);
router.put("/users", updateUser);

export default router;

