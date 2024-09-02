import jwt from 'jsonwebtoken';

const isAuthenticated = async(req,res,next)=>{
    try {
        const token= req.cookies.token;
        if(!token){
            return res.json({
                status:401,
                message:'User not authenticated',
                success:false
            })
        }
        const decode= await jwt.verify(token,process.env.SECRET);
        if(!decode){
            return res.json({
                status:401,
                message:'token invalid',
                success:false
            })
        }

        req.id=decode.userId;
        next();

    } catch (error) {
        console.log("error in auth middleware file : ",error)
    }
}

export default isAuthenticated;