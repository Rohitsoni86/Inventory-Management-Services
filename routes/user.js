const express = require("express");
const { createNewUser } = require("../controllers/userController");

const userRouter = express.Router();

userRouter.route("/organization/add").post(createNewUser);
module.exports = userRouter;
