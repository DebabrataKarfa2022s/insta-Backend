import {ApiError} from "../utils/apiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {Post} from "../models/post.model.js";
import nodemailer from "nodemailer";

const register = asyncHandler(async (req, res) => {
  try {
    const {username, email, password} = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      throw new ApiError(400, "Please provide all fields");
    }

    // Check if the user already exists
    const userExist = await User.findOne({email});
    if (userExist) {
      throw new ApiError(409, "User already exists");
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Create the user object
    const userObj = {
      username,
      email,
      password: hash,
    };

    // Save the user to the database
    const userCreated = await User.create(userObj);
    // console.log(userCreated._id)
    const createdUser = await User.findById(userCreated._id).select(
      "-password"
    );
    if (!userCreated) {
      throw new ApiError(500, "Something went wrong, user not created");
    }

    // Send success response
    res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User created successfully"));
  } catch (error) {
    // Handle any errors
    res
      .status(error.statusCode || 500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Internal server error"
        )
      );
  }
});

const checkUsernameUnique = asyncHandler(async(req,res)=>{
  try {
    const {username} = req.params
    if(username.length<3){
      throw new ApiError(400, "username should be more than 3 character");
    }

    const user = await User.findOne({username});

    if(user){
      throw new ApiError(400, "username already exists");
    }

    return res.json(
      new ApiResponse(200,null, "username is unique")
    )
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "internal server error"
      )
    );
  }
})

const login = asyncHandler(async (req, res) => {
  try {
    const {email, password} = req.body;
    if (!email || !password) {
      throw new ApiError(401, "something is missing , please check");
    }

    let user = await User.findOne({email});
    if (!user) {
      throw new ApiError(401, "incorrect email or password");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new ApiError(401, "incorrect password");
    }


    const token =  jwt.sign(
      {
        userId: user._id,
      },
      process.env.SECRET,
      {
        expiresIn: "1d",
      }
    );

    
    //*for posts
    const populatedPosts= await Promise.all(
      user.posts.map(async (postId) => {
        const postObj = await Post.findById(postId);
        if (postObj.author.equals(user._id)) {
          return postObj;
        }
        return null;
      })
    )

    user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePicture: user.profilePicture,
      followers: user.followers,
      following: user.following,
      posts: populatedPosts,
    };
    console.log("user login successfull")

    return res
      .cookie("token", token, {
        httpOnly: true,
        secure:true,
        sameSite: "none",
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .json(new ApiResponse(200, user, `Welcome back ${user.username}`));
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "internal server error in login"
      )
    );
  }
});

const logout = asyncHandler(async (req, res) => {
  try {
    console.log("logout successfull")
    return res
      .cookie("token", "", {maxAge: 0})
      .json(new ApiResponse(200,null, "logged out successfully"));
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "internal server error"
      )
    );
  }
});

const forgetPassword = asyncHandler(async(req,res)=>{
  try {
    const {email} = req.body;

    if(!email){
      throw new ApiError(400, "email is required");
    }

    const user = await User.findOne({email});

    if(!user){
      throw new ApiError(400, "user not found");
    }

    const payload = {_id:user._id};

    const token =  jwt.sign(
      payload,
      process.env.SECRET,
      {
        expiresIn: "10m",
      }
    );

    // const resetLink = `http://localhost:5173/reset-password/${user._id}/${token}`;
    const resetLink = `https://inasta-frontend.onrender.com/reset-password/${user._id}/${token}`;


    const transpoter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.ethereal.email",
      port:587,
      secure:false,
      auth:{
        user:process.env.EMAIL,
        pass:process.env.PASSWORD
      }
    })

    const mailOptions = {
      from:{
        name:"Instagram-reset-link",
        address:process.env.EMAIL
      },
      to:email,
      subject:"Reset Password",
      html:`
      <p>Hello ${user.username},</p>
      <p>You have requested to reset your password. Please click on the link below to reset your password:</p>
      ${resetLink}
      <p>If you did not request a password reset, please ignore this email.</p>
      <p>Thank you, <br>Instagram</p>
      `
    };

    transpoter.sendMail(mailOptions);

    return res.json(new ApiResponse(200, mailOptions, "email sent successfully"));
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "internal server error to send the reset link"
      )
    );
  }
})

const resetPassword = asyncHandler(async(req,res)=>{
try {
  const {password} = req.body
  const {id, token} = req.params

  const salt = await bcrypt.genSalt(10);
  const hashPassword =await bcrypt.hash(password,salt);

  const user = await User.findById({_id:id});

  if(!user){
    return res.json(new ApiError(404, "user not found"))
    }

    // verify the token
    let payload;

    try {
      payload = jwt.verify(token,process.env.SECRET);
    } catch (error) {
      throw new ApiError(404, "Invalid or expired token");
    }
    // match the token with the user
    if(payload._id !== user._id.toString()){
      throw new ApiError(401, "Unauthorized access");
    }

    const updateUser = await User.findByIdAndUpdate(id,{password:hashPassword},{new:true})

    return res.json(
      new ApiResponse(200,updateUser,"Password update successful")
    )
} catch (error) {
  res.json(
    new ApiError(
      error?.statusCode || 500,
      error?.message || "internal server error to update the password"
    )
  );
}
})

const getProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;
    let user = await User.findById(userId)
      .populate({path: "posts", createdAt: -1})
      .populate("bookmarks");

    return res.json(new ApiResponse(200, user, "profile get successfully"));
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "internal server error"
      )
    );
  }
});

const editProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.id;
    const {bio, gender} = req.body;
    const profilePicture = req.file;
    let cloudinary;

    // console.log("profile picture : ", profilePicture)

    if (profilePicture) {
      // console.log(profilePicture.path);
      const fileUri= getDataUri(profilePicture)
      // console.log(fileUri)
      cloudinary = await uploadOnCloudinary(fileUri);
    }
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new ApiError(401, "user not found");
    }

    if (bio) {
      user.bio = bio;
    }

    if (gender) {
      user.gender = gender;
    }

    if (profilePicture) {
      user.profilePicture = cloudinary.secure_url;
    }

    await user.save();

    return res.json(new ApiResponse(200, user, "Profile updated."));
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "internal server error"
      )
    );
  }
});

const getSuggestedUsers = asyncHandler(async (req, res) => {
  const loggedInUserId = req.id;

  try {
    // Find the logged-in user to get their following list
    const loggedInUser = await User.findById(loggedInUserId).select('following');
    
    if (!loggedInUser) {
      throw new ApiError(401, "Logged-in user not found");
    }

    // Find users that are not the logged-in user and are not in the following list
    const suggestedUsers = await User.find({
      _id: { $ne: loggedInUserId, $nin: loggedInUser.following }
    }).select('-password');

    if (!suggestedUsers || suggestedUsers.length === 0) {
      throw new ApiError(401, "No suggested users found");
    }

    return res.json(
      new ApiResponse(200, suggestedUsers, "Suggested users retrieved successfully")
    );
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "Internal server error"
      )
    );
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  const loggedInUserId = req.id;

  try {
    // Find the logged-in user to get their following list
    const loggedInUser = await User.findById(loggedInUserId);
    
    if (!loggedInUser) {
      throw new ApiError(401, "Logged-in user not found");
    }

    // Find users that are not the logged-in user and are not in the following list
    const allUsers = await User.find({
      _id: { $ne: loggedInUserId}
    }).select('-password');

    if (!allUsers || allUsers.length === 0) {
      throw new ApiError(401, "No users found");
    }

    return res.json(
      new ApiResponse(200, allUsers, "all users retrieved successfully")
    );
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "Internal server error to get all users"
      )
    );
  }
});

const followOrUnfollow = asyncHandler(async (req, res) => {
  try {
    const jeFollowKorbe = req.id; // I
    const jakeFollowKorbo = req.params.id; //soumi

    if (jeFollowKorbe === jakeFollowKorbo) {
      throw new ApiError(401, "you can't follow/unfollow yourself");
    }

    const user = await User.findById(jeFollowKorbe);
    const targetUser = await User.findById(jakeFollowKorbo);

    if (!user || !targetUser) {
      throw new ApiError(401, "user not found");
    }

    // now check which I do follow or unfollow
    const isFollowing = user.following.includes(jakeFollowKorbo);

    if (isFollowing) {
      // here unfollow logic
      await Promise.all([
        User.updateOne(
          {_id: jeFollowKorbe},
          {$pull: {following: jakeFollowKorbo}}
        ),
        User.updateOne(
          {_id: jakeFollowKorbo},
          {$pull: {followers: jeFollowKorbe}}
        ),
      ]);

      return res.json(new ApiResponse(200, "unfollow"));
    } else {
      // here follow logic
      await Promise.all([
        User.updateOne(
          {_id: jeFollowKorbe},
          {$push: {following: jakeFollowKorbo}}
        ),
        User.updateOne(
          {_id: jakeFollowKorbo},
          {$push: {followers: jeFollowKorbe}}
        ),
      ]);

      return res.json(new ApiResponse(200, "follow"));
    }
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "internal server error"
      )
    );
  }
});

const getFollowers = asyncHandler(async(req,res)=>{
  const userId = req.params.id
  // console.log("user id from get followers : ", userId)
  try {
    if(!userId){
      throw new ApiError(400, "user id is required");
    }

    const user = await User.findById(userId).populate("followers")
    if(!user){
      throw new ApiError(400, "user not found");
    }
    return res.json(new ApiResponse(200, user.followers, "followers get successfully"));
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "internal server error in fetch followers"
      )
    );
  }
})

const getFollowing = asyncHandler(async(req,res)=>{
  const userId = req.params.id
  // console.log("user id from get followings : ", userId)
  try {
    if(!userId){
      throw new ApiError(400, "user id is required");
    }

    const user = await User.findById(userId).populate("following");
    if(!user){
      throw new ApiError(400, "user not found");
    }
    return res.json(new ApiResponse(200, user.following, "following get successfully"));

  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || "internal server error in fetch following"
      )
    );
  }
})

const searchUsers= asyncHandler(async(req,res)=>{
  try {
    const { username } = req.query;

    // Search for users whose username matches the query (case-insensitive)
    const users = await User.find({
      username: { $regex: new RegExp(username, 'i') },
    }).select('username profilePicture');

    res.json(new ApiResponse(200, users, 'Users fetched successfully'));
  } catch (error) {
    res.json(
      new ApiError(
        error?.statusCode || 500,
        error?.message || 'Internal server error in searchUsers'
      )
    );
  }
})


export {register,checkUsernameUnique, login,logout,getProfile,editProfile,getSuggestedUsers,followOrUnfollow,getFollowers, getFollowing,getAllUsers,searchUsers, forgetPassword, resetPassword};
