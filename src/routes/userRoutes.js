const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Basic CRUD routes
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUser);
router.post("/", userController.createUser);
router.patch("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

// Authentication route
router.post("/login", userController.login);

module.exports = router;
