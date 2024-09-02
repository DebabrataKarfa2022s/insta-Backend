import mongoose, { Schema } from "mongoose";

const postSchema = new Schema({
    caption:{
        type:String,
        default:""
    },
    image:{
        type:String,
        required:true
    },
    author:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    likes:[
        {
            type:Schema.Types.ObjectId,
            ref:"User"
        }
    ],
    comments:[
        {
            type:Schema.Types.ObjectId,
            ref:"Comment"
        }
    ]
},{timestamps:true});

export const Post = mongoose.model('Post',postSchema);