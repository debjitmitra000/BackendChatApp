// User Schema
import { hash } from "bcrypt";
import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

const schema = new Schema({
    name: { 
        type: String, 
        required: true 
    },
    about: { 
        type: String, 
        required: true,
        unique: false
    },
    username: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    password: { 
        type: String, 
        required: true, 
        minlength: 6, 
        select: false 
    },
    avatar: {
        public_id: { 
            type: String, 
            required: true 
        },
        url: { 
            type: String, 
            required: true 
        }
    }
}, { timestamps: true });

schema.pre("save",async function(next) {
    if(!this.isModified("password")) return next();
    this.password = await hash(this.password,10);
})

export const User = models.User || model("User", schema);
