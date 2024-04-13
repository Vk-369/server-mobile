const otpGenerator = require("otp-generator");

const generateOtp = () => {
  return otpGenerator.generate(4, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
};

module.exports = { generateOtp };
