import nodemailer from "nodemailer";
class EmailService {
  static transporter = nodemailer.createTransport({
    service: "Gmail",
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // Gmail email address
      pass: process.env.EMAIL_PASSWORD, // Gmail app password
    },
  });

  async sendEmail(email: string, subject: string, body: string) {
    try {
      const info = await EmailService.transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          `"Support Team" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        text: body,
        html: body,
      });
      console.log("Message sent: %s", info.messageId);
      return { sent: true, data: info };
    } catch (error) {
      throw new Error(`Email sending failed: ${(error as Error).message}`);
    }
  }
}

export default new EmailService();
