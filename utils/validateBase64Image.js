const {
	MAX_IMAGE_SIZE_MB,
	ALLOWED_IMAGE_EXTENSIONS,
} = require("./image.constants");

const BASE64_REGEX = /^[A-Za-z0-9+/=]+$/;

const getBase64SizeInMB = (base64) => {
	const bytes = (base64.length * 3) / 4;
	return bytes / (1024 * 1024);
};

const validateBase64Image = ({ base64, extension }) => {
	if (!base64 || typeof base64 !== "string") {
		throw new Error("Base64 string is required");
	}

	if (!BASE64_REGEX.test(base64)) {
		throw new Error("Invalid base64 format");
	}

	if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
		throw new Error("Unsupported image extension");
	}

	const sizeInMB = getBase64SizeInMB(base64);

	if (sizeInMB > MAX_IMAGE_SIZE_MB) {
		throw new Error(`Image size exceeds ${MAX_IMAGE_SIZE_MB}MB limit`);
	}
};

module.exports = {
	validateBase64Image,
};
