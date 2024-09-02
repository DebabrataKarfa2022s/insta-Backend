import { v2 as cloudinary } from 'cloudinary';
// import fs from 'fs';
import dotenv from "dotenv"

dotenv.config({})

// Set the folder name globally
const CLOUDINARY_FOLDER = 'Instagram Clone(MERN)';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      return null;
    }

    // Upload the file to Cloudinary, using the global folder name
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
      folder: CLOUDINARY_FOLDER,
    });

    // Remove the locally saved temp file after successful upload
    // fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // Remove the locally saved temp file if the upload operation fails
    // fs.unlinkSync(localFilePath);
    console.error('Error uploading to Cloudinary:', error);
    return null;
  }
};

export { uploadOnCloudinary };
