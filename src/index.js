const UserRoutes = require('./routes/users')
const Demo = require('./routes/demo')

const routes = [UserRoutes, Demo]
console.log(Demo)

module.exports = routes