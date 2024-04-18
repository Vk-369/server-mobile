const express = require("express");
const Joi = require("joi");
const { nanoid } = require("nanoid");
const moment = require("moment");

const UserDetails = require("../../models/userDetails");
const Otp = require("../../models/otp");

const { generateOtp } = require("../../library/otp-generate");
const sendMails = require("../../library/mail");
const { encrypt, decrypt } = require("../../library/encryption");

const SignupRoutes = express.Router();
SignupRoutes.post("/signup/user", async (req, res) => {
  req.body = decrypt(req);
  const Schema = Joi.object({
    user_id: Joi.string().required().allow(null),
    username: Joi.string().required(),
    mail_id: Joi.string().required(),
    password: Joi.string().required(),
    gender: Joi.string().required().allow("male", "female"),
    phone_no: Joi.string().required(),
  });
  try {
    const { error, value: body } = Schema.validate(req.body);
    if (error) {
      console.log(error);
      const response = error.details[0];
      return res.json(encrypt(response));
    }

    console.log(body);
    const user = await UserDetails.findOne({ mail_id: body.mail_id });
    if (user && user.status === 0) {
      const response = {
        success: true,
        error: false,
        message: "User not verified",
        verify: "no",
      };
      return res.json(encrypt(response));
    }
    if (user) {
      const response = {
        success: true,
        error: false,
        message: "User already exists",
        verify: "user",
      };
      return res.json(encrypt(response));
    }

    let user_id = "";
    let uniqueId = null;
    while (!user_id || uniqueId) {
      user_id = nanoid(10);
      uniqueId = await UserDetails.findOne({ user_id });
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
    const response = {
      success: true,
      error: false,
      message: "Successfully registered. Verify your account.",
      verify: "yes",
    };
    console.log(response);
    return res.json(encrypt(response));
  } catch (error) {
    console.log(error);
  }
});

SignupRoutes.post("/signup/verify/otp", async (req, res) => {
  req.body = decrypt(req);
  const Schema = Joi.object({
    mail_id: Joi.string().required(),
    otp: Joi.string().required(),
  });
  try {
    const { error, value: body } = Schema.validate(req.body);
    if (error) {
      console.log(error);
    }
    const user = await UserDetails.findOne({
      mail_id: body.mail_id,
      status: 1,
    });

    const userOtp = await Otp.findOne({ mail_id: body.mail_id, status: 1 });
    if (!userOtp && !user) {
      const response = {
        success: true,
        error: false,
        message: "No user exists!",
        operation: "SignUp",
      };
      return res.json(encrypt(response));
    }
    if (
      !userOtp ||
      (userOtp.otp === body.otp &&
        userOtp.expiry < moment().format("YYYY-MM-DD HH:mm:ss"))
    ) {
      const response = {
        success: true,
        error: false,
        message: "Otp expired.",
        operation: "Retry",
      };
      return res.json(encrypt(response));
    } else if (userOtp.otp != body.otp && userOtp.status === 1) {
      const response = {
        success: true,
        error: false,
        message: "Wrong Otp.",
        operation: "Retry",
      };
      return res.json(encrypt(response));
    } else if (
      userOtp.otp === body.otp &&
      userOtp.status === 2 &&
      userOtp.expiry > moment().format("YYYY-MM-DD HH:mm:ss") &&
      user
    ) {
      const response = {
        success: true,
        error: false,
        message: "User already verified.",
        operation: "Login",
      };
      return res.json(encrypt(response));
    }
    // else if (
    //   !userOtp ||
    //   (userOtp.otp === body.otp &&
    //     userOtp.expiry < moment().format("YYYY-MM-DD HH:mm:ss"))
    // ) {
    //   const response = {
    //     success: true,
    //     error: false,
    //     message: "Otp expired.",
    //     status: 1,
    //   };
    //   return res.json(encrypt(response));
    // }
    else {
      await UserDetails.updateOne(
        { mail_id: body.mail_id },
        { $set: { status: 1 } }
      );
      await Otp.updateOne(
        {
          mail_id: body.mail_id,
          status: 1,
        },
        {
          $set: {
            updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
            status: 2,
          },
        }
      );
      const mailData = {
        receiver: body.mail_id,
        subject: "Account Verified",
        content: "Your account is verified successfully.",
      };
      await sendMails(mailData);
      const response = {
        success: true,
        error: false,
        message: "Account Verified.",
        operation: "Login",
      };
      return res.json(encrypt(response));
    }
  } catch (error) {
    console.log(error);
  }
});

SignupRoutes.post("/check/mail/exists", async (req, res) => {
  req.body = decrypt(req);
  const Schema = Joi.object({
    mail_id: Joi.string().required(),
  });
  try {
    const { error, value: body } = Schema.validate(req.body);
    if (error) {
      console.log(error);
      const response = error.details[0];
      return res.json(encrypt(response));
    }
    const user = await UserDetails.findOne({ mail_id: body.mail_id });
    if (user && user.status === 1) {
      const response = {
        success: true,
        message: "User already exists",
        verify: "user",
        error: false,
      };
      return res.json(encrypt(response));
    }
    if (user && user.status === 0) {
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
        content: otp + " is your OTP for verification.",
      };
      await sendMails(mailData);
      await newOtp.save();
      const response = {
        success: true,
        message: "Verify your account.",
        verify: "yes",
        error: false,
      };
      return res.json(encrypt(response));
    }
    const response = {
      success: true,
      message: "new user",
      verify: "no",
      error: false,
    };
    // const data = encrypt(response)
    return res.json(encrypt(response));
  } catch (error) {
    console.log(error);
  }
});

SignupRoutes.post("/resend/otp", async (req, res) => {
  req.body = decrypt(req);
  const Schema = Joi.object({
    mail_id: Joi.string().required(),
  });
  try {
    const { error, value: body } = Schema.validate(req.body);
    if (error) {
      console.log(error);
      const response = error.details[0];
      return res.json(encrypt(response));
    }

    const user = await UserDetails.findOne({
      mail_id: body.mail_id,
    });
    console.log(user, body.mail_id);
    if (!user) {
      const response = {
        success: true,
        error: false,
        message: "User doesn't exists.",
        otp: false,
      };
      return res.json(encrypt(response));
    }

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
      content: otp + " is your OTP for verification.",
    };
    await sendMails(mailData);
    await newOtp.save();
    const response = {
      success: true,
      error: false,
      message: "new OTP sent.",
      otp: true,
    };
    return res.json(encrypt(response));
  } catch (error) {
    console.log(error);
  }
});

SignupRoutes.post("/change/password", async (req, res) => {
  req.body = decrypt(req);
  const Schema = Joi.object({
    mail_id: Joi.string().required(),
    password: Joi.string().required(),
  });
  try {
    const { error, value: body } = Schema.validate(req.body);
    if (error) {
      console.log(error);
      const response = error.details[0];
      return res.json(encrypt(response));
    }
    await UserDetails.updateOne(
      { mail_id: body.mail_id },
      { $set: { password: body.password } }
    );
    const response = {
      success: true,
      error: false,
      message: "Password reset successful.",
    };
    console.log(response);
    return res.json(encrypt(response));
  } catch (error) {
    console.log(error);
  }
});

module.exports = SignupRoutes;
