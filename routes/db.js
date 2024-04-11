
const mongoose=require("mongoose")

const db=async()=>
{
    try{
        const con=await mongoose.connect('mongodb://localhost:27017/sar')
        console.log('connection established')
    }
    catch(err){
        console.log(err,'error while connecting to the db')
    }
}
module.exports=db 