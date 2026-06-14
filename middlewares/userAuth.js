const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (token == undefined) {
      return res.status(401).send("Your Token Is Expired.");
    }
    //verify the token
    const { userId } = jwt.verify(token, "2026$Meetzyy");
    const user = await User.findById(userId).select(
      "name email remainingToken membershipType ",
    );
    if (!user) {
      return res.status(401).send("Your Token Is Invalid.");
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = userAuth;
