import dotenv from "dotenv"
import connectDB from "./db/index.js"
// import { app } from "./app.js"
import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser"
import { app,server,io } from "./socket/socket.js";

dotenv.config({
    path:'./.env'
})

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}));
app.use(urlencoded({extended:true,limit:"16kb"}))
app.use(cookieParser())

app.get('/home',(req,res)=>{
    res.send("this project for insta clone")
})
// import routes 
import UserRouter from './routes/user.route.js'
import PostRouter from './routes/post.route.js'
import MessageRouter from './routes/message.route.js'

// route integrate 
app.use("/api/v1/user",UserRouter)
app.use("/api/v1/post",PostRouter)
app.use("/api/v1/message",MessageRouter)

connectDB().then(()=>{
    server.listen(process.env.PORT || 3000, ()=>{
        console.log(`server is running at port : ${process.env.PORT}`)
    })
}).catch((error)=>{
    console.log("mongodb connection failed",error)
})