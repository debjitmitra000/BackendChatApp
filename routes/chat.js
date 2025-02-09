import express from "express";
import { isAuth } from "../middlewares/auth.js";
import { attachmentSend, singleAvatar } from "../middlewares/multer.js";
import { 
    addMembers, 
    attachment, 
    deleteChat, 
    deleteMessage, 
    getChatDetails, 
    getGroupsMadeByMe, 
    getMessages, 
    getMyChats, 
    leaveGroup, 
    newGroupChat, 
    removeMembers,
    renameGroup,
    updateGroupImage
} from "../controllers/chat.js";
import { 
    validateHandler,
    newGroupChatValidator, 
    removeMembersValidator, 
    addMembersValidator,     
    leaveGroupValidator,
    attachmentValidator,
    renameGroupValidator,
    deleteChatValidator,
    getMessagesValidator,
    getChatDetailsValidator,
    updateGroupImageValidator,
    paramvalidator
} from "../lib/validator.js";

const app = express.Router();

//authenticated
app.use(isAuth)

app.post("/newGroup", singleAvatar, newGroupChatValidator(), validateHandler, newGroupChat);

app.get("/mychats", getMyChats);

app.get("/groupsByMe", getGroupsMadeByMe);

app.put("/addMembers", addMembersValidator(), validateHandler, addMembers);

app.delete("/removeMember", removeMembersValidator(), validateHandler, removeMembers);

app.delete("/leaveGroup/:id", leaveGroupValidator(), validateHandler, leaveGroup);

app.post("/message", attachmentSend,attachmentValidator(), validateHandler,  attachment);

app.get("/message/:id", getMessagesValidator(), validateHandler, getMessages);

app.put("/updateGrpImage/:id",singleAvatar,updateGroupImageValidator(),validateHandler,updateGroupImage);

app.delete("/deletemessage/:id",deleteMessage);

app.route("/:id")
.get(getChatDetailsValidator(), validateHandler, getChatDetails)
.put(renameGroupValidator(), validateHandler, renameGroup)
.delete(deleteChatValidator(),validateHandler, deleteChat)

export default app;