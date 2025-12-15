const cloudinary = require("../config/cloudinary");
const { validateBase64Image } = require("./validateBase64Image");

const uploadBase64Image = async ({
	base64,
	extension,
	folder = "saas/uploads",
	publicId,
}) => {
	validateBase64Image({ base64, extension });

	const dataUri = `data:image/${extension};base64,${base64}`;

	try {
		const result = await cloudinary.uploader.upload(dataUri, {
			folder,
			public_id: publicId,
			resource_type: "image",
			overwrite: true,
			transformation: [{ fetch_format: "auto", quality: "auto" }],
		});

		return {
			url: result.secure_url,
			publicId: result.public_id,
		};
	} catch (err) {
		console.error("Cloudinary Upload Error:", err);
		throw new Error("Image upload failed");
	}
};

module.exports = {
	uploadBase64Image,
};
