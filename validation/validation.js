const validator = require("validator");
const validate = (req) => {
  const { name, email, password } = req.body;
  if (name.length <= 3) {
    throw new Error("Name Length Can't Be Less Than 2");
  }
  if (!validator.isEmail(email)) {
    throw new Error("Email is not Valid.");
  }
};
module.exports = validate;
