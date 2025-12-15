const Joi = require("joi");

const uploadImageSchema = Joi.object({
	base64: Joi.string().required(),
	extension: Joi.string().valid("jpg", "jpeg", "png", "webp").required(),
});

module.exports = { uploadImageSchema };
