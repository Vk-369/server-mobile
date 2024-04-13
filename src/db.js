require('dotenv').config()
const mongoose=require("mongoose")

const DB_PORT = process.env.DB_PORT
const DB_HOST = process.env.DB_HOST
const DB_NAME = process.env.DB_NAME

const db=async()=>
{
    try{
        const con=await mongoose.connect(`mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`)
        console.log('connection established')
    }
    catch(err){
        console.log(err,'error while connecting to the db')
    }
}
module.exports=db 