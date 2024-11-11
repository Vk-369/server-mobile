const UserRoutes = require('./src/routes/users')
const SignupRoutes = require('./src/routes/Authentication/signup')
const LoginRoutes = require('./src/routes/Authentication/login')

const routes = [UserRoutes, SignupRoutes, LoginRoutes]

module.exports = routes