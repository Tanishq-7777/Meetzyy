<<<<<<< HEAD
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    remainingToken: {
      type: Number,
      default: 100,
    },
    membershipType: {
      type: String,
      default: "Free",
    },
    token_buffer: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);
const User = mongoose.model("User", userSchema);
module.exports = User;
=======
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    remainingToken: {
      type: Number,
      default: 100,
    },
    membershipType: {
      type: String,
      default: "Free",
    },
    token_buffer: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);
const User = mongoose.model("User", userSchema);
module.exports = User;
>>>>>>> 18a827c (Some Fixes)
