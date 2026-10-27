<<<<<<< HEAD
const express = require("express");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userAuth = require("../middlewares/userAuth");
const authRouter = express.Router();

authRouter.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassoword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassoword,
    });
    await user.save();
    const savedUser = await User.findById(user._id).select(
      "name email isVerified remainingToken membershipType",
    );

    const token = jwt.sign({ userId: user._id }, "2026$Meetzyy", {
      expiresIn: "30d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

      secure: true,
      sameSite: "none",
    });
    res.json({ data: savedUser });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email }).select(
      "name email password isVerified remainingToken membershipType",
    );
    if (!user) {
      throw new Error("No User Found.");
    }

    const isValidUser = await bcrypt.compare(password, user.password);
    if (isValidUser) {
      const token = jwt.sign({ userId: user._id }, "2026$Meetzyy", {
        expiresIn: "30d",
      });
      res.cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        secure: true,
        sameSite: "none",
      });
      res.json({ data: user });
    } else {
      res.send("Something went wrong");
    }
  } catch (err) {
    res.status(400).send(err.message);
  }
});

authRouter.post("/logout", (req, res) => {
  res.cookie("token", "", { expires: new Date(0) });
  res.send("Logout successfull");
});

authRouter.get("/profile", userAuth, async (req, res) => {
  try {
    res.status(200).json({
      data: req.user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});
module.exports = authRouter;
=======
const express = require("express");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userAuth = require("../middlewares/userAuth");
const authRouter = express.Router();

authRouter.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassoword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassoword,
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, "2026$Meetzyy", {
      expiresIn: "30d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

      secure: true,
      sameSite: "none",
    });
    res.json({ data: user });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email }).select(
      "name email password isVerified remainingToken membershipType",
    );
    if (!user) {
      throw new Error("No User Found.");
    }

    const isValidUser = await bcrypt.compare(password, user.password);
    if (isValidUser) {
      const token = jwt.sign({ userId: user._id }, "2026$Meetzyy", {
        expiresIn: "30d",
      });
      res.cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        secure: true,
        sameSite: "none",
      });
      res.json({ data: user });
    } else {
      res.send("Something went wrong");
    }
  } catch (err) {
    res.status(400).send(err.message);
  }
});

authRouter.post("/logout", (req, res) => {
  res.cookie("token", "", { expires: new Date(0) });
  res.send("Logout successfull");
});

authRouter.get("/profile", userAuth, async (req, res) => {
  try {
    res.status(200).json({
      data: req.user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});
module.exports = authRouter;
>>>>>>> 18a827c (Some Fixes)
