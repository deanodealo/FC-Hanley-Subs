const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { SquareClient, SquareEnvironment, SquareError } = require("square");
const corsLib = require("cors");

const squareAccessToken = defineSecret("SQUARE_ACCESS_TOKEN");

const corsHandler = corsLib({ origin: "https://fchanley.com" });

exports.createSquarePayment = onRequest(
  {
    region: "europe-west1",
    secrets: [squareAccessToken]
  },
  (req, res) => {
    corsHandler(req, res, async () => {

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      try {
        const {
          sourceId,
          verificationToken,
          registrationId,
          idempotencyKey,
          amountMoney,
          // Tournament-specific (kept for backwards compatibility with the
          // existing live tournament-registration.html — unchanged behaviour
          // if these are the only fields sent).
          teamName,
          ageGroup,
          // Generic fields — any booking type can send these instead of/
          // alongside the tournament-specific ones above.
          bookingType,   // e.g. "tournament" | "camp"
          description,   // free-text summary for the Square payment note
          buyerEmail
        } = req.body || {};

        if (!sourceId)       return res.status(400).json({ error: "Missing sourceId" });
        if (!registrationId) return res.status(400).json({ error: "Missing registrationId" });
        if (!idempotencyKey) return res.status(400).json({ error: "Missing idempotencyKey" });

        if (
          !amountMoney ||
          typeof amountMoney.amount !== "number" ||
          amountMoney.amount <= 0 ||
          amountMoney.currency !== "GBP"
        ) {
          return res.status(400).json({ error: "Invalid amountMoney payload" });
        }

        const client = new SquareClient({
          token: squareAccessToken.value(),
          environment: SquareEnvironment.Production
        });

        // Build the Square payment note based on whatever booking shape
        // was actually sent, rather than assuming tournament fields exist.
        // - Tournament calls (existing behaviour): teamName + ageGroup present.
        // - Camp calls (and anything else going forward): pass `description`
        //   directly, e.g. "FC Hanley Summer Camp 2026 - Smith family (2 children)".
        // - bookingType is optional and only used as a label prefix if no
        //   description was given.
        let note;
        if (description) {
          note = description;
        } else if (teamName || ageGroup) {
          note = `FC Hanley Tournament - ${teamName || ""} (${ageGroup || ""})`;
        } else if (bookingType) {
          note = `FC Hanley - ${bookingType}`;
        } else {
          note = "FC Hanley payment";
        }

        const paymentResponse = await client.payments.create({
          sourceId,
          verificationToken,
          idempotencyKey,
          amountMoney: {
            amount: BigInt(amountMoney.amount),
            currency: amountMoney.currency
          },
          locationId: "LH6SFF775591G",
          referenceId: registrationId,
          note,
          buyerEmailAddress: buyerEmail || undefined
        });

        const payment = paymentResponse.payment;

        return res.status(200).json({
          success: true,
          paymentId: payment?.id || "",
          status: payment?.status || ""
        });

      } catch (error) {
        logger.error("Square payment error", error);

        if (error instanceof SquareError) {
          const detail =
            error.errors?.map(e => e.detail).filter(Boolean).join(" | ") ||
            "Square payment failed";
          return res.status(400).json({ error: detail });
        }

        return res.status(500).json({ error: "Internal payment error" });
      }
    });
  }
);