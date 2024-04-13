const UserRoutes = require('./routes/users')
const SignupRoutes = require('./routes/Authentication/signup')
const LoginRoutes = require('./routes/Authentication/login')

const routes = [UserRoutes, SignupRoutes, LoginRoutes]

module.exports = routes