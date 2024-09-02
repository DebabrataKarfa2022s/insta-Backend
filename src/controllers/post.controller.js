import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import sharp from "sharp";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {getReceiverSocketId,io} from "../socket/socket.js"

const addNewPost = asyncHandler(async(req,res)=>{
    try {
        const {caption} = req.body;
        const image = req.file;
        const authorId= req.id;

        if(!image){
            throw new ApiError(400, "Please provide image");
        }

        // upload image on cludinary 
        const optimizedImageBuffer = await sharp(image.buffer).resize({width:800,height:800,fit:'inside'}).toFormat('jpeg',{quality:90}).toBuffer();

        // buffer to datauri 
        const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
        const cloudinary = await uploadOnCloudinary(fileUri);

        const post = await Post.create({
            caption,
            image:cloudinary.secure_url,
            author:authorId
        });

        const user = await User.findById(authorId);
        if(user){
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({
            path:'author',
            select:'-password'
        });

        return res.json(new ApiResponse(200, post, "post created successfully"));

    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in addNewPost"
            )
        )
    }
})

const getAllPosts= asyncHandler(async(req,res)=>{
    try {
        const posts = await Post.find().sort({createdAt:-1}).populate({
            path:'author',
            select:'username profilePicture'
        }).populate({
            path:'comments',
            sort:{createdAt:-1},
            populate:{
                path:'author',
                select:'username profilePicture'
            }
        });
        return res.json(new ApiResponse(200, posts, "posts get successfully"));
    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in getAllPost"
            )
        )
    }
})

const getUserAllPosts = asyncHandler(async(req,res)=>{
    try {
        const authorId= req.id
        const posts = await Post.find(authorId).sort({createdAt:-1}).populate({
            path:'author',
            select:'username profilePicture'
        }).populate({
            path:'comments',
            sort:{createdAt:-1},
            populate:{
                path:'author',
                select:'username profilePicture'
            }
        });

        return res.json(new ApiResponse(200, posts, "user all posts get successfully"));
    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in getUserAllPost"
            )
        )
    }
})

const likePost = asyncHandler(async(req,res)=>{
    try {
        const IdwhoLikeThePost = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            throw new ApiError(404, "post not found");
        }

        // like logic start 
        await post.updateOne({$addToSet:{likes:IdwhoLikeThePost}});
        await post.save();

        //todo implement socket io for real time notification 
        const user = await User.findById(IdwhoLikeThePost).select('username profilePicture');

        const postOwnerId = post.author.toString();
        if(postOwnerId!== IdwhoLikeThePost){
            // todo send notification
            const notification = {
                type:'like',
                userId:IdwhoLikeThePost,
                userDetails:user,
                postId,
                message:'Your post was liked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            io.to(postOwnerSocketId).emit('notification',notification)
        }

        return res.json(new ApiResponse(200, post, "post liked successfully"));

    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in likePost"
            )
        )
    }
})

const dislikePost = asyncHandler(async(req,res)=>{
    try {
        const idWhoLikeThePost = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            throw new ApiError(404, "post not found");
        }

        // dislike logic start
        await post.updateOne({$pull:{likes:idWhoLikeThePost}});
        await post.save();

        //todo implement socket io for real time notification 
        const user = await User.findById(idWhoLikeThePost).select('username profilePicture');

        const postOwnerId = post.author.toString();
        if(postOwnerId!== idWhoLikeThePost){
            // todo send notification
            const notification = {
                type:'dislike',
                userId:idWhoLikeThePost,
                userDetails:user,
                postId,
                message:'Your post was disliked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            io.to(postOwnerSocketId).emit('notification',notification)
        }

        return res.json(new ApiResponse(200, post, "post disliked successfully"));

    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in disliekPost"
            )
        ) 
    }
})

const addComment = asyncHandler(async(req,res)=>{
    try {
        const postId = req.params.id;
        const idWhoCommentInThePost = req.id;
        const {text} = req.body;
        const post = await Post.findById(postId);
        if (!text) {
            throw new ApiError(404, "text is required");
        }
        if (!post) {
            throw new ApiError(404, "post not found");
        }

        const comment = await Comment.create({
            text,
            author:idWhoCommentInThePost,
            post:postId
        });

        post.comments.push(comment._id);
        await post.save();

        return res.json(new ApiResponse(200, comment, "comment added successfully"));
    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in addComment"
            )
        )
    }
})

const getAllCommentsOfPost = asyncHandler(async(req,res)=>{
    try {
        const postId= req.params.id;

        const comments = await Comment.find({post:postId}).populate({
            path:'author',
            select:'username profilePicture'
        })

        if(!comments){
            throw new ApiError(404, "comments not found for this post");
        }

        return res.json(new ApiResponse(200, comments, "comments get successfully"));
    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in getAllCommentOfPost"
            )
        ) 
    }
})

const deletePost = asyncHandler(async(req,res)=>{
    try {
        const postId= req.params.id;
        const authorId= req.id;
        const post = await Post.findById(postId);
        if(!post){
            throw new ApiError(404, "post not found");
        }

        // check if the logged-in user is the owner of the post or not 
        if(post.author.toString() !== authorId){
            throw new ApiError(401, "you are not authorized to delete this post");
        }
        // delete the post 
        await Post.findByIdAndDelete(postId);

        //* remove the post id from the user's psot 

        let user = await User.findById(authorId);
        user.posts= user.posts.filter(id=>id.toString() ==! postId);
        await user.save();

        //* delete associated comments 
        await Comment.deleteMany({post:postId});

        return res.json(new ApiResponse(200, null, "post deleted successfully"));
    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in deletePost"
            )
        )
    }
})

const bookmarkPost = asyncHandler(async(req,res)=>{
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if(!post){
            throw new ApiError(404, "post not found");
        }

        const user = await User.findById(authorId);

        if(user.bookmarks.includes(post._id)){
            // allready bookmarked --> remove from bookmark 
            await user.updateOne({$pull:{bookmarks:post._id}});
            await user.save();

            return res.json(new ApiResponse(200, null, "post removed from bookmark successfully"));
        }else{
            // not bookmarked --> add to bookmark
            await user.updateOne({$addToSet:{bookmarks:post._id}});
            await user.save();

            return res.json(new ApiResponse(200, null, "post added to bookmark successfully"));
        }


    } catch (error) {
        res.json(
            new ApiError(
              error?.statusCode || 500,
              error?.message || "internal server error in bookmarkPost"
            )
        )
    }
})

export {
    addNewPost,
    getAllPosts,
    getUserAllPosts,
    likePost,
    dislikePost,
    addComment,
    getAllCommentsOfPost,
    deletePost,
    bookmarkPost
}