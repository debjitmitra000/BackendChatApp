import { compare } from 'bcrypt';
import { User } from '../models/user.js';
import { Chat } from '../models/chat.js';
import { cookieSettings, emitEvent, sendToken } from "../utils/features.js";
import { ErrorHandler } from '../utils/utility.js';
import { Request } from '../models/request.js';
import { NEW_REQUEST, REFETCH_CHAT } from '../constants/event.js';
import { deleteFileFromCloudinary, uploadFilesToCloudinary } from '../utils/handleCloudinary.js';

const newUser = async (req, res, next) => {
    try {
        const file = req.file;

        if(!file){
            return next(new ErrorHandler("Please upload avatar", 400))
        }

        const result = await uploadFilesToCloudinary([file])


        const avatar = {
            public_id: result[0].public_id,
            url: result[0].url
        };
        
        const { name, about, username, email, password } = req.body;

        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return next(new ErrorHandler("Email already in use", 409));
        }

        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return next(new ErrorHandler("Username already in use", 409));
        }

        const user = await User.create({
            name, about, username, email, password, avatar
        });
    
        sendToken(res, user, 201, `Welcome ${user.name}`);
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username }).select("+password");

        if (!user) {
            return next(new ErrorHandler("Invalid Credentials", 404));
        }
        const isMatch = await compare(password, user.password);
        if (!isMatch) {
            return next(new ErrorHandler("Invalid Credentials", 401));
        }

        return sendToken(res, user, 200, `Welcome Back ${user.name}`);
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select("-password");

        if (!user) return next(new ErrorHandler("User not found", 404));

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        res.status(200).cookie("ChatAppToken","",{...cookieSettings,maxAge: 0}).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        next(error);
    }
};

const searchUser = async (req, res, next) => {
    try {
        const { user = "" } = req.query;

        const myChats = await Chat.find({ groupChat: false, members: req.user });

        const allUserInChat = myChats.flatMap((chat) =>
            chat.members.filter((id) => id.toString() !== req.user._id.toString())
        );

        const remains = await User.find({
            _id: { $nin: allUserInChat, $ne: req.user._id },
            $or: [
                { name: { $regex: user, $options: "i" } },
                { username: { $regex: user, $options: "i" } }
            ]
        });

        const users = remains.map(({ _id, name, username, avatar }) => ({
            _id,
            name,
            username,
            avatar: avatar.url,
        }));

        return res.status(200).json({
            success: true,
            users,
        });
    } catch (error) {
        next(error);
    }
};

const sendRequest = async (req, res, next) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return next(new ErrorHandler("UserId is required", 400));
        }

        if (userId === req.user._id.toString()) {
            return next(new ErrorHandler("You can't send request to yourself", 400));
        }

        const existingRequest = await Request.findOne({
            $or: [
                { sender: req.user._id, receiver: userId },
                { sender: userId, receiver: req.user._id }
            ]
        });

        if (existingRequest) {
            if (existingRequest.status === "Blocked") {
                return next(new ErrorHandler("You are blocked by this user", 403));
            } else {
                return next(new ErrorHandler("Request already sent", 409));
            }
        }

        await Request.create({
            sender: req.user._id,
            receiver: userId
        });

        emitEvent(req, NEW_REQUEST, [userId]);

        return res.status(200).json({
            success: true,
            message: "Friend request sent successfully"
        });
    } catch (error) {
        next(error);
    }
};

const acceptRequest = async (req, res, next) => {
    try {
        const { reqId, status } = req.body;

        const request = await Request.findById(reqId)
            .populate("sender", "name")
            .populate("receiver", "name");

        if (!request) {
            return next(new ErrorHandler("Friend request not found", 404));
        }

        if (request.receiver._id.toString() !== req.user._id.toString()) {
            return next(new ErrorHandler("You don't have permission to perform this action", 403));
        }

        if (status === "Blocked") {
            request.status = "Blocked";
            await request.save();
            return res.status(200).json({
                success: true,
                message: "User blocked; they won't be able to send requests",
            });
        }

        if (status === "Rejected") {
            await request.deleteOne();
            return res.status(200).json({
                success: true,
                message: "Friend request rejected",
            });
        }

        if (status === "Accepted") {
            const members = [request.sender._id, request.receiver._id];

            await Promise.all([
                Chat.create({
                    members,
                    name: `${request.sender.name}-${request.receiver.name}`,
                    avatar: {
                        public_id: "null",
                        url: "null"
                    }
                }),
            ]);

            await request.deleteOne();

            emitEvent(req, REFETCH_CHAT, members);

            return res.status(200).json({
                success: true,
                message: "Friend request accepted",
                senderId: request.sender._id,
            });
        }

        return next(new ErrorHandler("Invalid status provided", 400));
    } catch (error) {
        next(error);
    }
};

const getNotifications = async (req, res, next) => {
    try {
        const requests = await Request.find({ receiver: req.user._id })
            .populate("sender", "name avatar");

        const allreq = requests.map(({ _id, sender }) => ({
            _id,
            sender: {
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar?.url 
            },
        }));

        return res.status(200).json({
            success: true,
            allreq,
        });
    } catch (error) {
        next(error);
    }
};

const getFriends = async (req, res, next) => {
    try {
        const { chatId } = req.query;

        const chats = await Chat.find({
            members: req.user,
            groupChat: false,
        }).populate("members", "name username avatar");

        const friends = chats.map(chat => {
            const otherMember = chat.members.find(member => member._id.toString() !== req.user._id.toString());
            return {
                id: otherMember?._id,
                name: otherMember?.name,
                avatar: otherMember?.avatar?.url || "/public/images/defaults/default-user-avatar.png",
            };
        });

        if (chatId) {
            const chat = await Chat.findById(chatId).populate("members", "_id");

            const chatMemberIds = chat.members.map(member => member._id.toString());

            const availableFriends = friends.filter(
                friend => !chatMemberIds.includes(friend.id.toString())
            );

            return res.status(200).json({
                success: true,
                friends: availableFriends,
            });
        }

        return res.status(200).json({
            success: true,
            friends,
        });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, username, about } = req.body;
        const file = req.file;
        
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        if (username && username !== user.username) {
            const usernameExists = await User.findOne({ 
                username,
                _id: { $ne: req.user._id } 
            });
            
            if (usernameExists) {
                return next(new ErrorHandler("Username already in use", 409));
            }
        }

        const updateData = {
            name: name || user.name,
            username: username || user.username,
            about: about || user.about
        };

        if (file) {
            try {
                if (user.avatar && user.avatar.public_id) {
                    await deleteFileFromCloudinary([user.avatar.public_id]);
                }

                const result = await uploadFilesToCloudinary([file]);
                
                updateData.avatar = {
                    public_id: result[0].public_id,
                    url: result[0].url
                };
            } catch (error) {
                return next(new ErrorHandler("Error uploading avatar", 500));
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).select("-password"); 

        return sendToken(res, updatedUser, 200, "Profile updated successfully");

    } catch (error) {
        next(error);
    }
};


export { 
    newUser, 
    login, 
    getProfile, 
    logout, 
    searchUser, 
    sendRequest,
    acceptRequest,
    getNotifications,
    getFriends,
    updateProfile
};

