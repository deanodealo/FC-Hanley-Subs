/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure your email service credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: 'YOUR_EMAIL@gmail.com',       // your email address
    pass: 'YOUR_EMAIL_PASSWORD_OR_APP_PASSWORD' // your email password or app password
  }
});

const mailOptions = {
  from: 'YOUR_EMAIL@gmail.com',
  to: 'RECEIVER_EMAIL@example.com',   // the email where you want to receive registrations
  subject: 'New User Registration',
  text: '' // this will be filled dynamically
};

exports.sendRegistrationEmail = functions.database.ref('/registrations/{pushId}')
  .onCreate((snapshot, context) => {
    const registrationData = snapshot.val();

    // Customize the email content with registration data
    const emailText = `
      New user registered:
      Name: ${registrationData.name}
      Email: ${registrationData.email}
      Phone: ${registrationData.phone}
      // Add any other fields your registration has
    `;

    mailOptions.text = emailText;

    return transporter.sendMail(mailOptions)
      .then(() => console.log('Email sent!'))
      .catch(error => console.error('Error sending email:', error));
  });
