import express from "express";
import { login, forgotPassword, listUsers, createUser, deleteUser, updateUser } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.get("/users", listUsers);
router.post("/users", createUser);
router.delete("/users/:id", deleteUser);
router.delete("/users", deleteUser);
router.put("/users/:id", updateUser);
router.put("/users", updateUser);



export default router;
