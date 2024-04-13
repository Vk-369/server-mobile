const express = require('express')
const Joi = require('joi')
const { nanoid } = require('nanoid')  
const moment = require('moment')

const UserDetails = require('../../models/userDetails')
const Otp = require('../../models/otp')

const {generateOtp} = require('../../library/otp-generate')
const sendMails = require('../../library/mail')

const SignupRoutes = express.Router()
SignupRoutes.post("/signup/user", async (req, res) => {
    const Schema = Joi.object({
      user_id: Joi.string().required().allow(null),
      username: Joi.string().required(),
      mail_id: Joi.string().required(),
      password: Joi.string().required(),
      gender: Joi.string().required().allow('male', 'female'),
      phone_no: Joi.string().required()
    });
    try {
      const { error, value: body } = Schema.validate(req.body);
      if (error) {
        console.log(error);
      }
  
      const user = await UserDetails.findOne({ mail_id: body.mail_id });
      if(user && user.status === 0) {
        return res.status(401).json({ message: "User not verified" });
      }
      if (user) {
        return res.status(400).json({ message: "User already exists" });
      }

      let user_id = ""
      let uniqueId = null
      while(!user_id || uniqueId){
        user_id = nanoid(10)
        uniqueId = await UserDetails.findOne({user_id})
      }
      
  
      const newUser = new UserDetails({
        user_id,
        mail_id: body.mail_id,
        password: body.password,
        username: body.username,
        gender: body.gender,
        phone_no: body.phone_no,
        status: 0,
      });
  
      const otp = generateOtp();
      const newOtp = new Otp({
        mail_id: body.mail_id,
        otp,
        expiry: moment().add(10, "minutes").format("YYYY-MM-DD HH:mm:ss"),
        status: 1,
        created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      });
      await Otp.deleteMany({ mail_id: body.mail_id, status: { $ne: 2 } });
      const mailData = {
        receiver: body.mail_id,
        subject: "Sign up Verification",
        content: otp + " is your Otp.",
      };
      await sendMails(mailData);
      await newOtp.save();
      await newUser.save();
      res.status(200).json({ response: "done" });
    } catch (error) {
      console.log(error);
    }
  });

SignupRoutes.post("/signup/verify/otp", async (req, res) => {
    const Schema = Joi.object({
      mail_id: Joi.string().required(),
      otp: Joi.string().required(),
    });
    try {
      const { error, value: body } = Schema.validate(req.body);
      if (error) {
        console.log(error);
      }
      const userOtp = await Otp.findOne({ mail_id: body.mail_id, status: 1 });
      if (!(userOtp && userOtp.mail_id && userOtp.otp)) {
        return res.status(403).json({ response: "No user exists!" });
      }
      if (userOtp.otp != body.otp) {
        return res.status(403).json({ response: "Wrong Otp." });
      } else if (
        userOtp.otp === body.otp &&
        userOtp.expiry < moment().format("YYYY-MM-DD HH:mm:ss")
      ) {
        return res.status(403).json({ response: "Otp expired." });
      } else {
        await UserDetails.updateOne({ mail_id: body.mail_id }, { $set: { status: 1 } });
        await Otp.updateOne(
          {
            mail_id: body.mail_id,
            status: 1,
            updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
          },
          { $set: { status: 2 } }
        );
        const mailData = {
          receiver: body.mail_id,
          subject: "Account Verified",
          content: "Your account is verified successfully.",
        };
        await sendMails(mailData);
        return res.status(200).json({ response: "Verified." });
      }
    } catch (error) {
      console.log(error);
    }
  });

  module.exports = SignupRoutes