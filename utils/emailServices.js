require("dotenv").config();
const nodemailer = require("nodemailer");

const isProduction = process.env.NODE_ENV === "production";

// 2. Create Transporter
const transporter = nodemailer.createTransport({
	host: isProduction
		? process.env.MAILGUN_PROD_SMTP_HOST
		: process.env.MAILGUN_TEST_SMTP_HOST,
	port: 587,
	secure: false,
	auth: {
		user: isProduction
			? process.env.MAILGUN_PROD_SMTP_USER
			: process.env.MAILGUN_TEST_SMTP_USER,
		pass: isProduction
			? process.env.MAILGUN_PROD_SMTP_PASS
			: process.env.MAILGUN_TEST_SMTP_PASS,
	},
});

// 3. Define the Sender Address
// In production, use custom domain. In test, use the sandbox address.
const SENDER_EMAIL = isProduction
	? `"Inventom Support" <support@${process.env.MAILGUN_PROD_DOMAIN}>`
	: `"Inventom Test" <postmaster@${process.env.MAILGUN_TEST_DOMAIN}>`;

const sendPasswordResetEmail = async (toEmail, resetToken, origin) => {
	// Construct the link (Ensure your frontend has a route like /reset-password?token=...)
	const resetLink = `${origin}/reset-password?token=${resetToken}`;

	const subject = "Reset Your Inventom Password";

	const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #007bff; text-align: center;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>You requested to reset your password for your <strong>Inventom</strong> account.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #555;">${resetLink}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
        </div>
    `;

	try {
		const info = await transporter.sendMail({
			from: SENDER_EMAIL,
			to: toEmail,
			subject: subject,
			html: htmlContent,
			text: `Reset your password here: ${resetLink}`, // Plaintext fallback
		});
		console.log(
			`Password Reset email sent to ${toEmail}. MessageID: ${info.messageId}`
		);
		return { success: true, messageId: info.messageId };
	} catch (error) {
		console.error("Error sending Password Reset email:", error);
		throw new Error("Could not send reset email.");
	}
};

const sendOTPEmail = async (toEmail, otp) => {
	const subject = "Your Verification Code - Inventom";

	const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #007bff; text-align: center;">Verify Your Account</h2>
            <p>Hello,</p>
            <p>Use the following One-Time Password (OTP) for verification.</p>
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px; margin: 20px 0;">
                ${otp}
            </div>
            <p><em>This code is valid for 10 minutes. Do not share this code with anyone.</em></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888;">Sent by Inventom Security Team</p>
        </div>
    `;

	try {
		const info = await transporter.sendMail({
			from: SENDER_EMAIL,
			to: toEmail,
			subject: subject,
			html: htmlContent,
			text: `Your verification code is: ${otp}`,
		});
		console.log(`OTP email sent to ${toEmail}. MessageID: ${info.messageId}`);
		return { success: true, messageId: info.messageId };
	} catch (error) {
		console.error("Error sending OTP email:", error);
		throw new Error("Could not send OTP email.");
	}
};

module.exports = {
	sendPasswordResetEmail,
	sendOTPEmail,
};
