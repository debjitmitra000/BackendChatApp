// Message Schema
import mongoose from "mongoose";
const { Schema, model, models, Types } = mongoose;

const schema = new Schema({
    content: { 
        type: String, 
        required: function() { return !this.attachments; } 
    },
    sender: { 
        type: Types.ObjectId, 
        ref: "User", 
        default: null 
    },
    chat: { 
        type: Types.ObjectId, 
        ref: "Chat", 
        required: true 
    },
    attachments: [{
        public_id: { type: String },
        url: { type: String }
    }],    
    replyTo: { 
        type: Types.ObjectId, 
        ref: "Message", 
        default: null,
        validate: {
            validator: function(value) {
                return !this.isReply || !!value; 
            },
            message: '`replyTo` field needed'
        }
    },
    isReply: { 
        type: Boolean, 
        default: false 
    },
    isSystem: { 
        type: Boolean, 
        default: false 
    },
}, { timestamps: true });

export const Message = models.Message || model("Message", schema);
