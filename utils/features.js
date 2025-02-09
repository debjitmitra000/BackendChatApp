import jwt from "jsonwebtoken";
import { getSockets } from "../lib/socket.js";

const cookieSettings = {
    maxAge: 15*24*60*60*1000,
    sameSite: "none",
    httpOnly: true,
    secure: true
}
const sendToken = (res,user,code,message)=>{
    const token= jwt.sign({_id: user._id},process.env.JWT_SECRET_KEY)
    return res.status(code).cookie("ChatAppToken",token,cookieSettings).json({
        success:true,
        message,
        user
    })
}

const emitEvent = (req,event,users,data) => {
    const io = req.app.get("io");
    const userSocket = getSockets(users);
    io.to(userSocket).emit(event,data)
    
    console.log("Emitting event",event)
}

export {sendToken, cookieSettings, emitEvent};