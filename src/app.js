// import express, { urlencoded } from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser"
// import { app,server,io } from "./socket/socket.js";

// // const app =express();

// app.use(cors({
//     origin:process.env.CORS_ORIGIN,
//     credentials:true
// }))

// app.use(express.json({limit:"16kb"}));
// app.use(urlencoded({extended:true,limit:"16kb"}))
// app.use(cookieParser())

// app.get('/home',(req,res)=>{
//     res.send("this project for insta clone")
// })
// // import routes 
// import UserRouter from './routes/user.route.js'
// import PostRouter from './routes/post.route.js'
// import MessageRouter from './routes/message.route.js'


// // route integrate 
// app.use("/api/v1/user",UserRouter)
// app.use("/api/v1/post",PostRouter)
// app.use("/api/v1/message",MessageRouter)

// export {app}