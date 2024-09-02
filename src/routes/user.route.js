import express from "express";
import { register , login, logout,getProfile,editProfile,getSuggestedUsers,followOrUnfollow , getFollowers , getFollowing, getAllUsers, searchUsers, forgetPassword, resetPassword, checkUsernameUnique } from "../controllers/user.controller.js";
import upload  from "../middlewares/multer.middleware.js";
import isAuthenticated from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route('/register').post(register);                       
router.route('/check-usernameUnique/:username').get(checkUsernameUnique);                       
router.route('/login').post(login);
router.route('/logout').get(isAuthenticated,logout);
router.route('/forget-password').post(forgetPassword);
router.route('/reset-password/:id/:token').post(resetPassword);
router.route('/:id/profile').get(isAuthenticated,getProfile);
router.route('/profile/edit').post(isAuthenticated,upload.single('profilePicture'),editProfile);
router.route('/suggested').get(isAuthenticated,getSuggestedUsers);
router.route('/followorunfollow/:id').post(isAuthenticated,followOrUnfollow);
router.route('/:id/followers').get(isAuthenticated,getFollowers);
router.route('/:id/followings').get(isAuthenticated,getFollowing);
router.route('/all').get(isAuthenticated,getAllUsers);
router.route('/search').get(isAuthenticated,searchUsers);

export default router;