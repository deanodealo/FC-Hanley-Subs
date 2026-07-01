const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

// ─────────────────────────────────────────────────────────────
// Secrets — set these once via the Firebase CLI, never hardcode:
//   firebase functions:secrets:set GMAIL_USER
//   firebase functions:secrets:set GMAIL_APP_PASSWORD
// GMAIL_USER is the full sending address (e.g. bookings@fchanley.com
// or whichever Gmail/Workspace account you're sending from).
// GMAIL_APP_PASSWORD is a 16-character App Password generated under
// that Google Account's Security > 2-Step Verification > App Passwords
// — NOT the account's normal login password.
// ─────────────────────────────────────────────────────────────
const gmailUser = defineSecret("GMAIL_USER");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

/* ═══════════════════════════════════════════════════════════
   CAMP_LOOKUP
   ───────────────────────────────────────────────────────────
   Same idea as the lookup in campregistration-admin.html — a
   campBookings document only stores raw weekId values ("w1"),
   not display labels. Keep this in sync with CAMP_CONFIG in
   campregistration.html and CAMP_LOOKUP in the admin page
   whenever you set up a new camp.
   ═══════════════════════════════════════════════════════════ */
const CAMP_LOOKUP = {
  weeks: [
    { id: "w1", label: "Week 1", dateRange: "3 Aug – 7 Aug" },
    { id: "w2", label: "Week 2", dateRange: "10 Aug – 14 Aug" }
  ]
};

function weekLabel(weekId) {
  const found = CAMP_LOOKUP.weeks.find(w => w.id === weekId);
  return found ? `${found.label} (${found.dateRange})` : weekId;
}

function describeChildBooking(child) {
  const weekParts = Object.entries(child.weeks || {}).map(([weekId, dates]) => {
    return `${weekLabel(weekId)} — ${dates.length} day${dates.length > 1 ? "s" : ""}`;
  });
  return `${child.name} (${child.ageGroup || ""}): ${weekParts.join("; ")}`;
}

/* ───────────────────────────────────────────────────────────
   PLACEHOLDER EMAIL CONTENT
   ───────────────────────────────────────────────────────────
   Replace buildEmailBody() below with the real wording once
   it's written — start times, where to book in on the day,
   what to bring, etc. Keep the booking-summary section (it's
   generated dynamically from the actual booking) and just
   change the surrounding copy.
   ─────────────────────────────────────────────────────────── */
function buildEmailBody(booking) {
  const childLines = (booking.children || [])
    .map(child => `  • ${describeChildBooking(child)}`)
    .join("\n");

  return `
Hi ${booking.parentName},

Thank you for booking onto ${booking.campName}! Your payment of £${Number(booking.amountPaid || 0).toFixed(0)} has been received and your place(s) are confirmed.

Booking summary:
${childLines}

On the day please report to one of the coaches who will be on hand to welcome your child. 

The day will run from 09:00 to 15:00, with wrap around available from 08:30 to 15:30. Please ensure your child brings a packed lunch, water bottle, and appropriate sportswear.

FC Hanley, Abbey Lane, Bucknall, ST2 8AJ

If you have any questions, you can reply directly to this email.

See you on the pitch!
FC Hanley
`.trim();
}

exports.sendCampBookingConfirmation = onDocumentCreated(
  {
    document: "campBookings/{bookingId}",
    region: "europe-west1",
    secrets: [gmailUser, gmailAppPassword]
  },
  async (event) => {
    const booking = event.data?.data();
    if (!booking) {
      logger.warn("No booking data on created document, skipping email.");
      return;
    }
    if (!booking.parentEmail) {
      logger.warn("Booking has no parentEmail, skipping email.", { bookingId: event.params.bookingId });
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser.value(),
        pass: gmailAppPassword.value()
      }
    });

    const mailOptions = {
      from: `"FC Hanley" <${gmailUser.value()}>`,
      to: booking.parentEmail,
      subject: `Booking Confirmed — ${booking.campName || "FC Hanley Camp"}`,
      text: buildEmailBody(booking)
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info("Camp booking confirmation email sent.", {
        bookingId: event.params.bookingId,
        to: booking.parentEmail
      });
    } catch (error) {
      // Deliberately don't throw — the booking and payment have already
      // succeeded by this point. A failed email shouldn't be treated as
      // a failed booking; it just needs to be visible in the logs so it
      // can be chased up manually if needed.
      logger.error("Failed to send camp booking confirmation email.", {
        bookingId: event.params.bookingId,
        error: error.message
      });
    }
  }
);