import mongoose from "mongoose"

const connectDB = (uri)=>{
    mongoose.connect(uri,{dbName: "ChatApp"})
    .then((data)=>{
        console.log(`Connected To Database: ${data.connection.host}`)
    })
    .catch((err)=>{
        throw err;
    })
}


export {connectDB};