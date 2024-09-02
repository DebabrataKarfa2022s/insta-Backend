import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {Conversation} from "../models/conversation.model.js";
import {Message} from "../models/message.model.js"
import { io,getReceiverSocketId } from "../socket/socket.js";


const sendMessage = asyncHandler(async(req,res)=>{
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const {textMessage:message} =req.body;

        let consversation = await Conversation.findOne({
            participants:{$all:[senderId,receiverId]}
        });

        // establish the conversation if not started yet 

        if(!consversation){
            consversation = await Conversation.create({
                participants:[senderId,receiverId]
            });
        }


        const newMessage = await Message.create({
            senderId:senderId,
            receiverId:receiverId,
            message
        });

        if(newMessage){
            consversation.messages.push(newMessage._id);
        }

        await Promise.all([
            consversation.save(),
            newMessage.save()
        ])

        //* implement socket io for real time data trasnfer 

        const receiverSocketId = getReceiverSocketId(receiverId);
        
        if(receiverSocketId){
            io.to(receiverSocketId).emit('newMessage',newMessage)
        }

        return res.json(new ApiResponse(200, newMessage, "message send successfully"));

    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in sendMessage "
            )
        )
    }
})

const getMessage = asyncHandler(async(req,res)=>{
    try {
        const senderId = req.id;
        const receiverId =req.params.id;
        const conversation = await Conversation.findOne({
            participants:{$all:[senderId,receiverId]}
        }).populate('messages')
        if(!conversation){
            throw new ApiError(404, []);
        }

        return res.json(new ApiResponse(200, conversation?.messages, "conversation found successfully"));
    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in getMesage "
            )
        )
    }
})

export{sendMessage,getMessage}