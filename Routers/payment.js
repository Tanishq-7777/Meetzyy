<<<<<<< HEAD
const express = require("express");
const Razorpay = require("razorpay");
const Payment = require("../models/payment");
const userAuth = require("../middlewares/userAuth");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const User = require("../models/user");
const paymentRouter = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { _id } = req.user;
    const { name, type } = req.body;
    let orderAmount = 14900;
    if (type == "Gold") {
      orderAmount = 29900;
    } else if (type == "Platinum") {
      orderAmount = 49900;
    }
    const options = {
      amount: orderAmount,
      currency: "INR",
      receipt: "receipt_" + Math.random().toString(36).substring(7),
      notes: {
        name,
        membershipType: type,
      },
    };

    const orders = await razorpay.orders.create(options);
    const { id, status, amount, currency, receipt, notes } = orders;
    const payment = new Payment({
      userId: _id,
      status,
      orderId: id,
      amount,
      currency,
      receipt,
      notes,
    });

    const data = await payment.save();

    res
      .status(200)
      .json({ ...data.toJSON(), keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

paymentRouter.post("/payment/webhook", async (req, res) => {
  console.log(process.env.RAZORPAY_WEBHOOK_SECRET);
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const isWebhookValid = validateWebhookSignature(
      JSON.stringify(req.body),
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET,
    );

    if (!isWebhookValid) {
      return res.status(400).json({ msg: "Webhook signature in invalid" });
    }

    const paymentDetails = req.body.payload.payment.entity;
    console.log(paymentDetails);

    const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
    payment.status = paymentDetails.status;
    await payment.save();
    console.log(payment);

    const user = await User.findOne({ _id: payment.userId });

    if (paymentDetails.notes.membershipType == "Silver") {
      user.remainingToken = 3000;
    } else if (paymentDetails.notes.membershipType == "Gold") {
      user.remainingToken = 6000;
    } else {
      user.remainingToken = 10000;
    }

    if (req.body.event == "payment.captured") {
      user.membershipType = paymentDetails.notes.membershipType;
    }
    if (req.body.event == "payment.failed") {
    }
    await user.save();
    return res.status(200).json({ msg: "Webhook recieved successfully" });
  } catch (err) {
    return res.status(400).json({ msg: err.message });
  }
});
module.exports = paymentRouter;
=======
const express = require("express");
const Razorpay = require("razorpay");
const Payment = require("../models/payment");
const userAuth = require("../middlewares/userAuth");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const User = require("../models/user");
const paymentRouter = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { _id } = req.user;
    const { name, type } = req.body;
    let orderAmount = 14900;
    if (type == "Gold") {
      orderAmount = 29900;
    } else if (type == "Platinum") {
      orderAmount = 49900;
    }
    const options = {
      amount: orderAmount,
      currency: "INR",
      receipt: "receipt_" + Math.random().toString(36).substring(7),
      notes: {
        name,
        membershipType: type,
      },
    };

    const orders = await razorpay.orders.create(options);
    const { id, status, amount, currency, receipt, notes } = orders;
    const payment = new Payment({
      userId: _id,
      status,
      orderId: id,
      amount,
      currency,
      receipt,
      notes,
    });

    const data = await payment.save();

    res
      .status(200)
      .json({ ...data.toJSON(), keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

paymentRouter.post("/payment/webhook", async (req, res) => {
  console.log(process.env.RAZORPAY_WEBHOOK_SECRET);
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const isWebhookValid = validateWebhookSignature(
      JSON.stringify(req.body),
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET,
    );

    if (!isWebhookValid) {
      return res.status(400).json({ msg: "Webhook signature in invalid" });
    }

    const paymentDetails = req.body.payload.payment.entity;
    console.log(paymentDetails);

    const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
    payment.status = paymentDetails.status;
    await payment.save();
    console.log(payment);

    const user = await User.findOne({ _id: payment.userId });

    if (paymentDetails.notes.membershipType == "Silver") {
      user.remainingToken = 3000;
    } else if (paymentDetails.notes.membershipType == "Gold") {
      user.remainingToken = 6000;
    } else {
      user.remainingToken = 10000;
    }

    if (req.body.event == "payment.captured") {
      user.membershipType = paymentDetails.notes.membershipType;
    }
    if (req.body.event == "payment.failed") {
    }
    await user.save();
    return res.status(200).json({ msg: "Webhook recieved successfully" });
  } catch (err) {
    return res.status(400).json({ msg: err.message });
  }
});
module.exports = paymentRouter;
>>>>>>> 18a827c (Some Fixes)
