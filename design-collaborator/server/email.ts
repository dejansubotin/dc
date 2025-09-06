import nodemailer from 'nodemailer';
import type { Session, Comment, User } from '../types';

// Ensure your .env file has these variables
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, APP_BASE_URL } = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL) {
  console.warn("SMTP environment variables are not fully configured. Email notifications will be disabled.");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: parseInt(SMTP_PORT || "587", 10),
  secure: parseInt(SMTP_PORT || "587", 10) === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendNewCommentEmail(session: Session, newComment: Comment, recipients: User[]) {
  if (!SMTP_HOST) {
    console.log("Email notifications disabled. Would have sent email for new comment:", newComment.text);
    return;
  }
  
  const recipientEmails = recipients.map(r => r.email);
  if(recipientEmails.length === 0) {
      return;
  }

  const sessionUrl = `${APP_BASE_URL || 'http://localhost:8080'}/?sessionId=${session.id}`;

  const mailOptions = {
    from: SMTP_FROM_EMAIL,
    to: recipientEmails.join(', '),
    subject: `New comment in session: ${session.id}`,
    text: `
      Hello,

      A new comment has been posted by ${newComment.author} in a design collaboration session you are part of.

      Comment: "${newComment.text}"

      You can view the session here: ${sessionUrl}

      Regards,
      Image Collaborator
    `,
    html: `
      <p>Hello,</p>
      <p>A new comment has been posted by <strong>${newComment.author}</strong> in a design collaboration session you are part of.</p>
      <p><strong>Comment:</strong> <em>"${newComment.text}"</em></p>
      <p>You can view the session here: <a href="${sessionUrl}">${sessionUrl}</a></p>
      <p>Regards,<br/>Image Collaborator</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
