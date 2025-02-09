import jwt from "jsonwebtoken";
import { CHATAPP_TOKEN } from "../constants/config.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";

const socketAuthenticator = async (err, socket, next) =>{
    try {
        if (err){
            return next(err);
        }
        const authToken = socket.request.cookies[CHATAPP_TOKEN];

        if (!authToken){
            return next(new ErrorHandler("Login to get access", 401));
        }

        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET_KEY);

        const user = await User.findById(decodedData._id);

        if (!user)
            return next(new ErrorHandler("Login to get access", 401));

        socket.user = user;

        return next();

    } catch (error) {
        return next(new ErrorHandler("Login to get access", 401));
    }
}

export { socketAuthenticator };
