const express = require("express");
var app = express.Router();
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const cors = require("cors");
app.use(cors());

const UserDetails = require("../../models/userDetails");

const { encrypt, decrypt } = require("../../library/encryption");

const LoginRoutes = express.Router();

LoginRoutes.post("/login/user", async (req, res) => {
  console.log("/login/user/login/user")
  console.log(req.body,'this is the req')
  req.body = decrypt(req,'login');
  const Schema = Joi.object({
    mail_id: Joi.string().required(),
    password: Joi.string().required(),
  });

  try {
    console.log(req.body)
    const { error, value: body } = Schema.validate(req.body);
    if (error) {
      console.log(error);
      const response = error.details[0];
      return res.json(encrypt(response));
    }
    const user = await UserDetails.findOne({ mail_id: body.mail_id });
    if (!user) {
      const response = {
        success: true,
        error: false,
        message: "User not found",
        login: false,
      };
      return res.json(encrypt(response));
    }
    if (user && user.status === 0) {
      const response = {
        success: true,
        error: false,
        message: "User not verified",
        login: "verify",
      };
      return res.json(encrypt(response));
    }

    console.log(user);
    const validPassword = await user.comparePassword(body.password);
    if (!validPassword) {
      const response = {
        success: true,
        error: false,
        message: "Invalid Password",
        login: false,
      };
      return res.json(encrypt(response));
    }
    const token = jwt.sign(
      { mail_id: user.mail_id, user_id: user.user_id },
      process.env.JWT_KEY,
      {
        expiresIn: "1h",
      }
    );

    const response = {
      success: true,
      error: false,
      message: "Logged in successfully.",
      login: "success",
      token,
      userID:user.user_id
    };
    return res.json(encrypt(response));
  } catch (error) {
    console.log(error);
  }
});

module.exports = LoginRoutes;
