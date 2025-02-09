import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";

const isAuth = async (req, res, next) => {
    try {
        const token = req.cookies["ChatAppToken"];
        if (!token) {
            return next(new ErrorHandler("Login to get access", 401));
        }

        const decodedData = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decodedData;
        next();
    } catch (error) {
        console.error("Auth error:", error.message);
        next(error);
    }
};

export { isAuth };