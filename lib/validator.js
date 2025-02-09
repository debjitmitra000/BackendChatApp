import { body, check, validationResult, param, query } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validateHandler = (req, res, next) => {
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
        return next();
    } else {
        const errorsMessages = errors.array().map((error) => error.msg).join(", ");
        next(new ErrorHandler(errorsMessages, 400));
    }
};

const newUserValidator = () => [
    body("name", "Name is required").notEmpty(),

    body("about", "About is required").notEmpty()
        .isLength({ max: 200 }).withMessage("About should not exceed 200 characters"),

    body("username", "Username is required").notEmpty()
        .isLength({ min: 3, max: 20 }).withMessage("Username must be between 3 and 20 characters")
        .isAlphanumeric().withMessage("Username must contain only letters and numbers"),

    body("email", "Valid email is required").isEmail(),
    
    body("password", "Password is required").notEmpty()
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
        .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
        .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
        .matches(/[0-9]/).withMessage("Password must contain at least one number")
        .matches(/[@$!%*?&#]/).withMessage("Password must contain at least one special character (@, $, !, %, *, ?, & or #)")
];

const loginValidator = () => [
    body("username", "Username is required").notEmpty(),

    body("password", "Password is required").notEmpty()
];

const newGroupChatValidator = () => [
    body("name", "Group name is required").notEmpty()
        .isLength({ min: 3, max: 50 }).withMessage("Group name must be between 3 and 50 characters"),

    body("members", "Members are required").isArray({ min: 2 }).withMessage("Group chat must have at least 3 members"),

    body("avatar").optional().isObject().withMessage("Avatar should be an object")
        .custom(avatar => {
            if (avatar && (!avatar.public_id || !avatar.url)) {
                throw new Error("Avatar must contain both public_id and url");
            }
            return true;
        })
];

const addMembersValidator = () => [
    body("chatId", "Chat ID is required and must be a valid ID")
        .notEmpty()
        .isMongoId()
        .withMessage("Invalid chat ID format"),

    body("members", "Members array is required and must contain valid user IDs")
        .isArray({ min: 1 })
        .withMessage("Members array must contain at least one user ID")
        .custom((members) => {
            if (members.some((id) => typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id))) {
                throw new Error("All member IDs must be valid ObjectIDs");
            }
            return true;
        })
];

const removeMembersValidator = () => [
    body("chatId", "Chat ID is required and must be a valid ID")
        .notEmpty()
        .isMongoId()
        .withMessage("Invalid chat ID format"),

    body("userId", "User ID is required and must be a valid ID")
        .notEmpty()
        .isMongoId()
        .withMessage("Invalid user ID format")
];

const leaveGroupValidator = () => [
    param("id", "Chat ID is required and must be a valid ID")
        .notEmpty()
        .isMongoId()
        .withMessage("Invalid chat ID format"),
];

const attachmentValidator = () => [
    body("chatId", "Chat ID is required and should be a valid ID").isMongoId(),

    body("replyTo", "ReplyTo should be a valid MongoDB ID").optional().isMongoId(),
];

const renameGroupValidator = () => [
    param("id", "Chat ID is required and should be a valid ID").isMongoId(),

    body("name", "Group name is required and should be a string").isString().notEmpty(),
];

const deleteChatValidator = () => [
    param("id", "Chat ID is required and should be a valid ID").isMongoId(),
];

const getMessagesValidator = () => [
    param("id", "Chat ID is required and should be a valid ID").isMongoId(),
];

const getChatDetailsValidator = () => [
    param("id", "Chat ID is required and should be a valid MongoDB ID").isMongoId(),

    query("populate", "Populate must be either 'true' or 'false'").optional().isIn(["true", "false"]),
];

const sendRequestValidator = () => [
    body("userId")
        .exists().withMessage("UserId is required")
        .isMongoId().withMessage("Invalid UserId format"),
];

const acceptRequestValidator = () => [
    body("reqId")
        .exists().withMessage("Request ID is required")
        .isMongoId().withMessage("Invalid Request ID format"),
    
    body("status")
        .exists().withMessage("Status is required")
        .isIn(["Accepted", "Rejected", "Blocked"]).withMessage("Status must be 'Accepted', 'Rejected', or 'Blocked'"),
];

const updateProfileValidator = () => [
    body("name")
        .optional()
        .notEmpty().withMessage("Name cannot be empty if provided"),

    body("about")
        .optional()
        .notEmpty().withMessage("About cannot be empty if provided")
        .isLength({ max: 200 }).withMessage("About should not exceed 200 characters"),

    body("username")
        .optional()
        .notEmpty().withMessage("Username cannot be empty if provided")
        .isLength({ min: 3, max: 20 }).withMessage("Username must be between 3 and 20 characters")
        .isAlphanumeric().withMessage("Username must contain only letters and numbers"),
];

const updateGroupImageValidator = () => [
    param("id", "Chat ID is required and must be a valid ID")
        .notEmpty()
        .isMongoId()
        .withMessage("Invalid chat ID format"),
];

const paramvalidator = () => [
    param("id", "Message ID is required and must be a valid ID")
      .notEmpty()
      .isMongoId()
      .withMessage("Invalid message ID format")
  ];

export { 
    validateHandler, 
    newUserValidator, 
    loginValidator,
    newGroupChatValidator,
    addMembersValidator,
    removeMembersValidator,
    leaveGroupValidator,
    attachmentValidator,
    renameGroupValidator,
    deleteChatValidator,
    getMessagesValidator,
    getChatDetailsValidator,
    sendRequestValidator,
    acceptRequestValidator,
    updateProfileValidator,
    updateGroupImageValidator,
    paramvalidator
};
