import nodemailer from "nodemailer";
class EmailService {
  static transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.GMAIL_USER, // generated ethereal user
      pass: process.env.GMAIL_PASS, // generated ethereal password
    },
  });

  async sendEmail(email: string, subject: string, body: string) {
    try {
      const info = await EmailService.transporter.sendMail({
        from: ` '"Support Team" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: subject,
        text: body,
        html: `<b>${body}</b>`,
      });
      console.log("Message sent: %s", info.messageId);
      return { sent: true, data: info };
    } catch (error) {
      throw new Error(`Email sending failed: ${(error as Error).message}`);
    }
  }
}

export default new EmailService();
