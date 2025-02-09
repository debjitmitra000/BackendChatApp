import express from "express";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuth } from "../middlewares/auth.js";
import {
    acceptRequest,
    getFriends,
    getNotifications,
    getProfile, 
    login, 
    logout, 
    newUser, 
    searchUser,
    sendRequest,
    updateProfile
}  from "../controllers/user.js";
import {  
    validateHandler,
    acceptRequestValidator,
    loginValidator, 
    newUserValidator, 
    sendRequestValidator,
    updateProfileValidator
} from "../lib/validator.js";

const app = express.Router();

//unauthenticated
app.post("/newUser",singleAvatar,newUserValidator(),validateHandler,newUser)
app.post("/login",loginValidator(),validateHandler,login)



//authenticated
app.use(isAuth)



app.get("/profile",getProfile)

app.put("/updateProfile",singleAvatar,updateProfileValidator(),validateHandler,updateProfile)

app.delete("/logout",logout)

app.get("/searchUser",searchUser)

app.put("/sendRequest",sendRequestValidator(),validateHandler,sendRequest)

app.put("/acceptRequest",acceptRequestValidator(),validateHandler,acceptRequest)

app.get("/Notifications",getNotifications)

app.get("/getFriends",getFriends)

export default app;