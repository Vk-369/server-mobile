const UserRoutes = require('./routes/users')
const SignupRoutes = require('./routes/Authentication/signup')
const LoginRoutes = require('./routes/Authentication/login')
const DashboardRoutes = require('./routes/songs/dashboard')

const routes = [UserRoutes, SignupRoutes, LoginRoutes, DashboardRoutes]

module.exports = routes