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
          registrationId,
          idempotencyKey,
          amountMoney,
          teamName,
          ageGroup,
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
  environment: SquareEnvironment.Sandbox  // hardcoded for testing
});

        const paymentResponse = await client.payments.create({
          sourceId,
          idempotencyKey,
          amountMoney: {
            amount: BigInt(amountMoney.amount),
            currency: amountMoney.currency
          },
          locationId: "LMMEC838AX8QP",
          referenceId: registrationId,
          note: `FC Hanley Tournament - ${teamName || ""} (${ageGroup || ""})`,
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