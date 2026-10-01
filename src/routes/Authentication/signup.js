const express = require("express");
const Joi = require("joi");
const { nanoid } = require("nanoid");
const moment = require("moment");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { sql } = require("../../db");

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
    const [user] = await sql`
      SELECT user_id, status
      FROM users
      WHERE LOWER(mail_id) = LOWER(${body.mail_id})
      LIMIT 1
    `;
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

    const user_id = nanoid(10);
    const passwordHash = await bcrypt.hash(body.password, 10);

    const otp = generateOtp();
    const now = moment().format("YYYY-MM-DD HH:mm:ss");
    const expiresAt = moment().add(10, "minutes").format("YYYY-MM-DD HH:mm:ss");
    const mailData = {
      receiver: body.mail_id,
      subject: "Sign up Verification",
      content: otp + " is your Otp.",
    };
    await sql.begin(async (transaction) => {
      await transaction`DELETE FROM otps WHERE mail_id = ${body.mail_id} AND status <> 2`;
      await transaction`
        INSERT INTO users (user_id, mail_id, password_hash, username, gender, phone_no, status)
        VALUES (${user_id}, ${body.mail_id}, ${passwordHash}, ${body.username}, ${body.gender}, ${body.phone_no}, 0)
      `;
      await transaction`
        INSERT INTO otps (id, mail_id, otp, expiry, status, created_at, updated_at)
        VALUES (${crypto.randomBytes(12).toString("hex")}, ${body.mail_id}, ${otp}, ${expiresAt}, 1, ${now}, ${now})
      `;
    });
    await sendMails(mailData);
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
    const [user] = await sql`
      SELECT user_id FROM users
      WHERE LOWER(mail_id) = LOWER(${body.mail_id}) AND status = 1
      LIMIT 1
    `;
    const [userOtp] = await sql`
      SELECT otp, expiry, status FROM otps
      WHERE LOWER(mail_id) = LOWER(${body.mail_id}) AND status = 1
      ORDER BY created_at DESC LIMIT 1
    `;
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
      const updatedAt = moment().format("YYYY-MM-DD HH:mm:ss");
      await sql.begin(async (transaction) => {
        await transaction`
          UPDATE users SET status = 1, updated_at = NOW()
          WHERE LOWER(mail_id) = LOWER(${body.mail_id})
        `;
        await transaction`
          UPDATE otps SET updated_at = ${updatedAt}, status = 2
          WHERE LOWER(mail_id) = LOWER(${body.mail_id}) AND status = 1
        `;
      });
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
    const [user] = await sql`
      SELECT user_id, status FROM users
      WHERE LOWER(mail_id) = LOWER(${body.mail_id})
      LIMIT 1
    `;
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
      const now = moment().format("YYYY-MM-DD HH:mm:ss");
      const expiresAt = moment().add(10, "minutes").format("YYYY-MM-DD HH:mm:ss");
      const mailData = {
        receiver: body.mail_id,
        subject: "Sign up Verification",
        content: otp + " is your OTP for verification.",
      };
      await sql.begin(async (transaction) => {
        await transaction`DELETE FROM otps WHERE LOWER(mail_id) = LOWER(${body.mail_id}) AND status <> 2`;
        await transaction`
          INSERT INTO otps (id, mail_id, otp, expiry, status, created_at, updated_at)
          VALUES (${crypto.randomBytes(12).toString("hex")}, ${body.mail_id}, ${otp}, ${expiresAt}, 1, ${now}, ${now})
        `;
      });
      await sendMails(mailData);
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

    const [user] = await sql`
      SELECT user_id FROM users
      WHERE LOWER(mail_id) = LOWER(${body.mail_id})
      LIMIT 1
    `;
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
    const now = moment().format("YYYY-MM-DD HH:mm:ss");
    const expiresAt = moment().add(10, "minutes").format("YYYY-MM-DD HH:mm:ss");
    const mailData = {
      receiver: body.mail_id,
      subject: "Sign up Verification",
      content: otp + " is your OTP for verification.",
    };
    await sql.begin(async (transaction) => {
      await transaction`DELETE FROM otps WHERE LOWER(mail_id) = LOWER(${body.mail_id}) AND status <> 2`;
      await transaction`
        INSERT INTO otps (id, mail_id, otp, expiry, status, created_at, updated_at)
        VALUES (${crypto.randomBytes(12).toString("hex")}, ${body.mail_id}, ${otp}, ${expiresAt}, 1, ${now}, ${now})
      `;
    });
    await sendMails(mailData);
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
    const passwordHash = await bcrypt.hash(body.password, 10);
    await sql`
      UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE LOWER(mail_id) = LOWER(${body.mail_id})
    `;
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
