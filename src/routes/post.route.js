import express from "express";
import { addNewPost,
    getAllPosts,
    getUserAllPosts,
    getAllCommentsOfPost,
    likePost,
    dislikePost,
    deletePost,
    addComment,
    bookmarkPost
 } from "../controllers/post.controller.js";
import upload  from "../middlewares/multer.middleware.js";
import isAuthenticated from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route('/addpost').post(isAuthenticated,upload.single('image'),addNewPost);
router.route('/allposts').get(isAuthenticated,getAllPosts);
router.route('/userposts/all').get(isAuthenticated,getUserAllPosts);
router.route('/:id/like').get(isAuthenticated,likePost);
router.route('/:id/dislike').get(isAuthenticated,dislikePost);
router.route('/:id/comment').post(isAuthenticated,addComment);
router.route('/:id/comment/all').post(isAuthenticated,getAllCommentsOfPost);
router.route('/delete/:id').delete(isAuthenticated,deletePost);
router.route('/:id/bookmark').get(isAuthenticated,bookmarkPost);

export default router;