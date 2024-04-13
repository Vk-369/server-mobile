const express = require('express')
const route = express.Router()

route.get('/demo', async(req, res) => {
    console.log('demo hit')
})

module.exports = route