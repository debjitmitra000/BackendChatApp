import { faker,simpleFaker } from "@faker-js/faker";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";

// Create Single Chats
const createSingleChats = async () => {
  try {
    const users = await User.find().select("_id");

    const chatsPromise = [];

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        chatsPromise.push(
          Chat.create({
            name: faker.lorem.words(2),
            groupChat: false,
            members: [users[i], users[j]],
            avatar: {
                public_id: faker.system.fileName(),
                url: faker.image.avatar(),
            },
          })
        );
      }
    }

    await Promise.all(chatsPromise);

    console.log("Single chats created successfully");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// Create Group Chats
const createGroupChats = async (numChats) => {
  try {
    const users = await User.find().select("_id");

    const chatsPromise = [];

    for (let i = 0; i < numChats; i++) {
      const numMembers = simpleFaker.number.int({ min: 3, max: users.length });
      const members = [];

      while (members.length < numMembers) {
        const randomUser = users[simpleFaker.number.int({ min: 0, max: users.length - 1 })];
        if (!members.some(member => member._id.equals(randomUser._id))) {
          members.push(randomUser);
        }
      }

      chatsPromise.push(
        Chat.create({
          groupChat: true,
          name: faker.lorem.words(1),
          members,
          creator: members[0],
          avatar: {
            public_id: faker.system.fileName(),
            url: faker.image.avatar(),
          },
        })
      );
    }

    await Promise.all(chatsPromise);

    console.log("Group chats created successfully");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// Create Messages
const createMessages = async (numMessages) => {
    try {
      const users = await User.find().select("_id");
      const chats = await Chat.find().select("_id");
      const allMessages = await Message.find().select("_id");
  
      const messagesPromise = [];
      for (let i = 0; i < numMessages; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomChat = chats[Math.floor(Math.random() * chats.length)];
        const isReply = Math.random() > 0.5;
  
        messagesPromise.push(
          Message.create({
            chat: randomChat,
            sender: randomUser,
            content: faker.lorem.sentence(),
            attachments: Math.random() > 0.5
              ? {
                  public_id: faker.system.fileName(),
                  url: faker.image.avatar(),
                }
              : undefined,
            isReply,
            replyTo: isReply ? allMessages[Math.floor(Math.random() * allMessages.length)]?._id : undefined,
          })
        );
      }
  
      await Promise.all(messagesPromise);
      console.log("Messages created successfully");
      process.exit();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };
  
  // Create Messages in a Specific Chat
  const createMessagesInAChat = async (chatId, numMessages) => {
    try {
      const users = await User.find().select("_id");
      const allMessages = await Message.find({ chat: chatId }).select("_id");
  
      const messagesPromise = [];
      for (let i = 0; i < numMessages; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const isReply = Math.random() > 0.5;
  
        messagesPromise.push(
            Message.create({
              chat: chatId,
              sender: randomUser,
              content: faker.lorem.sentence(),
              attachments: Math.random() > 0.5
                ? {
                    public_id: faker.system.fileName(),
                    url: faker.image.avatar(),
                  }
                : undefined,
              isReply,
              ...(isReply && { replyTo: allMessages[Math.floor(Math.random() * allMessages.length)]?._id }),
            })
          );
      }
  
      await Promise.all(messagesPromise);
      console.log("Messages in chat created successfully");
      process.exit();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };
  

export {
  createGroupChats,
  createMessages,
  createMessagesInAChat,
  createSingleChats,
};
