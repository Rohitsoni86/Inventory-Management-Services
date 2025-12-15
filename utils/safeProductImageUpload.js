const { uploadBase64Image } = require("./uploadBase64Image");

const safeUploadProductImage = async ({
	base64,
	extension,
	folder,
	publicId,
}) => {
	try {
		if (!base64 || !extension) return null;

		const result = await uploadBase64Image({
			base64,
			extension,
			folder,
			publicId,
		});

		return result; // { url, publicId }
	} catch (err) {
		console.error("Product Image Upload Failed:", err.message);
		return null;
	}
};

module.exports = {
	safeUploadProductImage,
};
