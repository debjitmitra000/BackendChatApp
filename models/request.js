// Request Schema
import mongoose from "mongoose";
const { Schema, model, models, Types } = mongoose;

const schema = new Schema({
    status: {
        type: String,
        default: "Pending",
        enum: ["Pending", "Accepted", "Rejected", "Blocked"]
    },
    sender: { 
        type: Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    receiver: { 
        type: Types.ObjectId, 
        ref: "User", 
        required: true 
    },
}, { timestamps: true });

export const Request = models.Request || model("Request", schema);
