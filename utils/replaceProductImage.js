const { safeUploadProductImage } = require("./safeProductImageUpload");
const { deleteImageByPublicId } = require("./deleteImage");

const replaceProductImage = async ({
	product,
	base64,
	extension,
	imageType, // "front" | "back",
}) => {
	if (!base64 || !extension) return null;

	const folder = `inventory/products/${product.productType}/${product._id}`;
	const publicId = imageType;

	// Upload new image
	const uploaded = await safeUploadProductImage({
		base64,
		extension,
		folder,
		publicId,
	});

	if (!uploaded) return null;

	// Delete old image AFTER successful upload
	const oldPublicId =
		imageType === "front"
			? product.frontImagePublicId
			: product.backImagePublicId;

	if (oldPublicId && oldPublicId !== uploaded.publicId) {
		await deleteImageByPublicId(oldPublicId);
	}

	return uploaded;
};

module.exports = {
	replaceProductImage,
};
