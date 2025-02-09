import { v4 as uuid } from "uuid";
import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHAT,
  REFETCH_MESSAGES,
} from "../constants/event.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { emitEvent } from "../utils/features.js";
import {
  deleteFileFromCloudinary,
  uploadFilesToCloudinary,
} from "../utils/handleCloudinary.js";
import { ErrorHandler } from "../utils/utility.js";

const newGroupChat = async (req, res, next) => {
  try {
    const { name, members } = req.body;

    if (members.length < 2) {
      return next(
        new ErrorHandler("Group chat must have at least 3 members", 400)
      );
    }

    const uniqueMembers = [...new Set([...members, req.user])];

    await Chat.create({
      name,
      groupChat: true,
      creator: req.user,
      members: uniqueMembers,
      avatar: {
        public_id: "vedy7a7qfseuc038dgdj",
        url: "https://res.cloudinary.com/dtfyx1fwv/image/upload/v1738852717/vedy7a7qfseuc038dgdj.png",
      },
    });

    emitEvent(req, ALERT, uniqueMembers, `Welcome to ${name} group`);
    emitEvent(req, REFETCH_CHAT, uniqueMembers);

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.user }).populate(
      "members",
      "name username avatar"
    );

    const transformChats = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await Message.findOne({ chat: chat._id })
          .sort({ createdAt: -1 })
          .select("content createdAt");

        if (chat.groupChat) {
          return {
            id: chat._id,
            name: chat.name,
            avatar: chat.avatar?.url || "default-group-avatar.png",
            groupChat: true,
            members: chat.members.map((member) => ({
              // _id: member._id,
              name: member.name,
              username: member.username,
              avatar: member.avatar || "default-user-avatar.png",
            })),
            lastMessage: lastMessage?.content || "No messages yet",
            timestamp: lastMessage?.createdAt || null,
          };
        } else {
          const otherMember = chat.members.find(
            (member) => member._id.toString() !== req.user._id.toString()
          );
          return {
            id: chat._id,
            name: otherMember?.name,
            avatar: otherMember?.avatar.url || "efault-user-avatar.png",
            groupChat: false,
            members: chat.members.map((member) => ({
              _id: member._id,
              name: member.name,
              username: member.username,
              avatar: member.avatar || "efault-user-avatar.png",
            })),
            lastMessage: lastMessage?.content || "No messages yet",
            timestamp: lastMessage?.createdAt || null,
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      chats: transformChats,
    });
  } catch (error) {
    next(error);
  }
};

const getGroupsMadeByMe = async (req, res, next) => {
  try {
    const chats = await Chat.find({ creator: req.user }).populate(
      "members",
      "name username avatar"
    );

    const groups = chats.map((chat) => {
      return {
        id: chat._id,
        name: chat.name,
        avatar: chat.avatar?.url || "default-group-avatar.png",
        members: chat.members.map((member) => ({
          name: member.name,
          username: member.username,
          avatar: member.avatar,
        })),
      };
    });

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    next(error);
  }
};

const addMembers = async (req, res, next) => {
  try {
    const { chatId, members } = req.body;

    if (!members || members.length < 1) {
      return next(new ErrorHandler("Members not selected", 400));
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }

    if (!chat.groupChat) {
      return next(new ErrorHandler("Not a group chat", 400));
    }

    if (chat.creator.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("You don't have permission", 403));
    }

    const uniqueRequestedMembers = [...new Set(members)];

    const newMembers = await Promise.all(
      uniqueRequestedMembers.map((memberId) =>
        User.findById(memberId, "name avatar")
      )
    );
    const validMembers = newMembers.filter(Boolean);

    const existingMemberIds = chat.members.map((member) => member.toString());
    const uniqueNewMembers = validMembers.filter(
      (member) => !existingMemberIds.includes(member._id.toString())
    );

    if (uniqueNewMembers.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All members are already in the group",
      });
    }

    if (chat.members.length + uniqueNewMembers.length > 50) {
      return next(new ErrorHandler("Maximum number of members reached", 403));
    }

    chat.members.push(...uniqueNewMembers.map((member) => member._id));
    await chat.save();

    const newMemberNames = uniqueNewMembers
      .map((member) => member.name)
      .join(", ");

    emitEvent(req, ALERT, chat.members, {
      message: `${newMemberNames} joined group`,
      chatId,
    });

    const refetchUsers = [...uniqueNewMembers.map((member) => member._id)];

    emitEvent(req, REFETCH_CHAT, refetchUsers);

    return res.status(201).json({
      success: true,
      message: "Members added successfully",
    });
  } catch (error) {
    next(error);
  }
};

const removeMembers = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;

    const [chat, memberToRemove] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId, "name"),
    ]);

    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }
    if (!memberToRemove) {
      return next(new ErrorHandler("Member not found", 404));
    }
    if (!chat.groupChat) {
      return next(new ErrorHandler("Not a group chat", 400));
    }
    if (chat.creator.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("You don't have permission", 403));
    }
    if (userId === chat.creator.toString()) {
      return next(new ErrorHandler("Creator can't be removed", 403));
    }
    if (chat.members.length <= 3) {
      return next(
        new ErrorHandler(
          "Can't remove members, group must have at least 3 members",
          403
        )
      );
    }

    const removedUserId = userId;

    chat.members = chat.members.filter(
      (member) => member.toString() !== userId.toString()
    );

    await chat.save();
    emitEvent(req, ALERT, chat.members, {
      message: `${memberToRemove.name} was removed`,
      chatId,
    });
    emitEvent(req, REFETCH_CHAT, [removedUserId]);

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }
    if (!chat.groupChat) {
      return next(new ErrorHandler("Not a group chat", 400));
    }

    chat.members = chat.members.filter(
      (member) => member.toString() !== req.user._id.toString()
    );

    if (chat.members.length < 3) {
      return next(
        new ErrorHandler(
          "Can't leave, group must have at least 3 members.",
          400
        )
      );
    }

    if (chat.creator.toString() === req.user._id.toString()) {
      chat.creator = chat.members[0];
    }

    await chat.save();

    emitEvent(req, ALERT, chat.members, {
      message: `${req.user.name} has left the group`,
      chatId,
    });
    emitEvent(req, REFETCH_CHAT, chat.members);

    return res.status(200).json({
      success: true,
      message: "You have left the group",
    });
  } catch (error) {
    next(error);
  }
};

const attachment = async (req, res, next) => {
  try {
    const { chatId, replyTo } = req.body;

    const [chat, me] = await Promise.all([
      Chat.findById(chatId),
      User.findById(req.user._id, "name"),
    ]);

    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }

    const files = req.files || [];

    if (files.length < 1) {
      return next(new ErrorHandler("No attachment found", 400));
    }
    if (files.length > 5) {
      return next(new ErrorHandler("Max 10 files at a time", 400));
    }

    const attachments = await uploadFilesToCloudinary(files);

    const messageForRealTime = {
      content: "",
      attachments,
      sender: {
        _id: me._id,
        name: me.name,
      },
      _id: uuid(),
      chat: chatId,
      createdAt: new Date().toISOString(),
      replyTo: replyTo || null,
      isReply: !!replyTo,
    };

    const messageForDB = {
      content: "",
      attachments,
      sender: me._id,
      chat: chatId,
      replyTo: replyTo || null,
      isReply: !!replyTo,
    };

    const message = await Message.create(messageForDB);

    emitEvent(req, NEW_MESSAGE, chat.members, {
      message: messageForRealTime,
      chatId,
    });
    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, {
      chatId,
    });

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { page = 1 } = req.query;

    const messagePerPage = 20;
    const skip = (page - 1) * messagePerPage;

    const chat = await Chat.findOne({ _id: chatId, members: req.user._id });

    if (!chat) {
      return res
        .status(403)
        .json({ message: "You are not allowed to access this chat" });
    }

    const [messages, totalMessageCount] = await Promise.all([
      Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(messagePerPage)
        .populate("sender", "name avatar")
        .populate("replyTo", "_id content sender chat createdAt")
        .lean(),
      Message.countDocuments({ chat: chatId }),
    ]);

    const totalPages = Math.ceil(totalMessageCount / messagePerPage);
    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

const getChatDetails = async (req, res, next) => {
  try {
    if (req.query.populate === "true") {
      const chat = await Chat.findById(req.params.id)
        .populate("members", "name avatar")
        .lean();

      if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
      }

      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
      }));

      return res.status(200).json({
        success: true,
        chat,
      });
    } else {
      const chat = await Chat.findById(req.params.id);
      if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
      }

      return res.status(200).json({
        success: true,
        chat,
      });
    }
  } catch (error) {
    next(error);
  }
};

const updateGroupImage = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const file = req.file;

    if (!file) {
      return next(new ErrorHandler("No image file provided", 400));
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }
    if (!chat.groupChat) {
      return next(new ErrorHandler("Not a group chat", 400));
    }
    if (chat.creator.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("You don't have permission", 403));
    }

    let avatar;

    if (file) {
      if (chat.avatar.public_id && chat.avatar.public_id !== "vedy7a7qfseuc038dgdj") {
        try {
          await deleteFileFromCloudinary([chat.avatar.public_id]);
        } catch (error) {
          return next(new ErrorHandler("Error deleting previous image", 500));
        }
      }
      try {
        const result = await uploadFilesToCloudinary([file]);
        avatar = {
          public_id: result[0].public_id,
          url: result[0].url,
        };
      } catch (error) {
        return next(new ErrorHandler("Error uploading image", 500));
      }
    }

    chat.avatar = avatar;

    await chat.save();
    return res.status(200).json({
      success: true,
      message: "Group image changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

const renameGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { name } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }
    if (!chat.groupChat) {
      return next(new ErrorHandler("Not a group chat", 400));
    }
    if (chat.creator.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("You don't have permission", 403));
    }
    chat.name = name;

    await chat.save();

    emitEvent(req, REFETCH_CHAT, chat.members);

    return res.status(200).json({
      success: true,
      message: "Group name changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

const deleteChat = async (req, res, next) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }
    if (chat.groupChat) {
      if (chat.creator.toString() !== req.user._id.toString()) {
        return next(
          new ErrorHandler("Only group creator can delete this chat", 403)
        );
      }
    } else {
      if (!chat.members.includes(req.user._id.toString())) {
        return next(new ErrorHandler("You don't have permission", 403));
      }
    }

    const messagesWithAttachments = await Message.find({
      chat: chatId,
      attachments: { $exists: true, $ne: [] },
    });

    const public_ids = messagesWithAttachments.flatMap(({ attachments }) =>
      attachments.map(({ public_id }) => public_id)
    );

    if (public_ids.length > 0) {
      await Promise.all([
        deleteFileFromCloudinary(public_ids),
        Chat.deleteOne({ _id: chatId }),
        Message.deleteMany({ chat: chatId }),
      ]);
      if (chat.avatar.public_id && chat.avatar.public_id !== "vedy7a7qfseuc038dgdj") {
        try {
          await deleteFileFromCloudinary([chat.avatar.public_id]);
        } catch (error) {
          return next(new ErrorHandler("Error deleting previous image", 500));
        }
      }
    } else {
      await Promise.all([
        Chat.deleteOne({ _id: chatId }),
        Message.deleteMany({ chat: chatId }),
      ]);
      if (chat.avatar.public_id && chat.avatar.public_id !== "vedy7a7qfseuc038dgdj") {
        try {
          await deleteFileFromCloudinary([chat.avatar.public_id]);
        } catch (error) {
          return next(new ErrorHandler("Error deleting previous image", 500));
        }
      }
    }
    
    emitEvent(req, REFETCH_CHAT, chat.members);

    return res.status(200).json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;

    const message = await Message.findById(messageId)
    if (!message) {
      return next(new ErrorHandler("Message not found", 404));
    }

    const isMessageSender = message.sender.toString() === req.user._id.toString();

    if (!isMessageSender) {
      return next(new ErrorHandler("You don't have permission to delete this message", 403));
    }
    
        const chat = await Chat.findById(message.chat)
    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }

    if (message.attachments && message.attachments.length > 0) {
      const public_ids = message.attachments.map(attachment => attachment.public_id);
      
      try {
        await Promise.all([
          deleteFileFromCloudinary(public_ids),
          Message.deleteOne({ _id: messageId })
        ]);
      } catch (error) {
        return next(new ErrorHandler("Error deleting message attachments", 500));
      }
    } else {
      await Message.deleteOne({ _id: messageId });
    }

    const members = chat.members
    console.log(members)
    
    emitEvent(req, REFETCH_MESSAGES, members );


    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


export {
  addMembers,
  attachment,
  deleteChat,
  getChatDetails,
  getGroupsMadeByMe,
  getMessages,
  getMyChats,
  leaveGroup,
  newGroupChat,
  removeMembers,
  updateGroupImage,
  renameGroup,
  deleteMessage
};
