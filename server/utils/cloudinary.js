const fs = require('fs');
const path = require('path');

/**
 * Uploads a file buffer to Cloudinary, or falls back to saving locally
 * if Cloudinary credentials are not configured in the environment.
 * 
 * @param {Object} file - The file object from Multer (containing buffer, originalname)
 * @returns {Promise<string>} - The file access URL (Cloudinary secure_url or local /uploads/... path)
 */
const uploadToCloudinary = async (file) => {
  if (!file || !file.buffer) return null;

  const hasCloudinaryConfig = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET;

  if (hasCloudinaryConfig) {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'southern_waves' },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary Upload Error:', error);
            return reject(error);
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    });
  } else {
    // Local fallback: write the buffer to the local uploads directory
    console.log('⚠️ Cloudinary config not found. Falling back to local storage.');
    
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/${uniqueName}`;
  }
};

module.exports = { uploadToCloudinary };
