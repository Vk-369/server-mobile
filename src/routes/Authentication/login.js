const express = require("express");
const Joi = require("joi");
const jwt = require("jsonwebtoken")

const UserDetails = require('../../models/userDetails')

const LoginRoutes = express.Router();

LoginRoutes.post("/login/user", async (req, res) => {
  const Schema = Joi.object({
    mail_id: Joi.string().required(),
    password: Joi.string().required(),
  });
  try {
    const { error, value: body } = Schema.validate(req.body);
    if (error) {
        console.log(error);
      }
    const user = await UserDetails.findOne({ mail_id: body.mail_id });
    if (!user) {
      res.status(401).json({ response: "User not found" });
      return res.end();
    }
    if(user && user.status === 0){
        return res.status(401).json({ response: "User not verified" });
    }

    console.log(user);
    const validPassword = await user.comparePassword(body.password);
    if (!validPassword) {
      res.status(500).json({ response: "Invalid Password" });
      return res.end();
    }
    const token = jwt.sign({ mail_id: user.mail_id }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });
    res.status(200).json({ response: token });
    return res.end();
  } catch (error) {
    console.log(error);
  }
});

module.exports = LoginRoutes;
