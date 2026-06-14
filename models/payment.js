const mongoose = require("mongoose");
const User = require("./user");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: User,
    },
    status: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    receipt: {
      type: String,
      required: true,
    },
    notes: {
      name: String,
      membershipType: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = new mongoose.model("Payment", paymentSchema);
