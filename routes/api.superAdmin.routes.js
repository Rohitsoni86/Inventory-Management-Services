const express = require("express");
const { createSuperAdmin } = require("../controllers/superAdminController");
const superAdminRouter = express.Router();

// Create New Super Admin
superAdminRouter.post("/create", createSuperAdmin);

// Verify Super Admin

// Admin Actions Definations

module.exports = superAdminRouter;
