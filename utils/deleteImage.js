const cloudinary = require("../config/cloudinary");

const deleteImageByPublicId = async (publicId) => {
	if (!publicId) return;
	await cloudinary.uploader.destroy(publicId);
};

module.exports = {
	deleteImageByPublicId,
};
