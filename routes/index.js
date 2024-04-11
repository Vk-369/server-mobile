var express = require('express');
var mangoose=require("mongoose")
var router = express.Router();
var db=require('./db')
var model=require('../services/model')

var app=express()
db()
//establishing db connection every time the server is made to run


/* GET home page. */
// router.get('/', async function (req, res, next) {
//   res.render('index', { title: 'this is working bro legitimately in the index file' });
// });

module.exports = router;
