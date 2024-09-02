import mongoose from "mongoose";
// console.log(process.env.PORT)

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(`${process.env.MONGODB_URI}`)

        console.log(`MongoDB Connected: ${conn.connection.host}`)

    } catch (error) {
        console.error(`mongo Error: ${error.message}`)
        process.exit(1)
    }
}

export default connectDB