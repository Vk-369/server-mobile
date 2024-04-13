const jwt = require("jsonwebtoken");

const jwtAuth = (req, res, next) => {
  try {
    const token = req.headers["authorization"];
    if (!token) {
      res.status(401).json({ response: "Token not found" });
      return;
    }
    jwt.verify(token, process.env.JWT_KEY, (err, creds) => {
      if (err) {
        res
          .status(500)
          .json({ auth: false, response: "Failed to Authenticate token" });
        return;
      }
      console.log(creds);
      req.email = creds.email;
      next();
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { jwtAuth }
