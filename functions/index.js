const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { SquareClient, SquareEnvironment, SquareError } = require("square");

const squareAccessToken = defineSecret("SQUARE_ACCESS_TOKEN");

exports.createSquarePayment = onRequest(
  {
    region: "europe-west1",
    secrets: [squareAccessToken],
    cors: {
      origin: "*", // Allow all origins (use your domain in production for security)
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAgeSeconds: 3600
    }
  },
  async (req, res) => {
    // Basic method guard
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const {
        sourceId,
        bookingId,
        idempotencyKey,
        amountMoney,
        buyer
      } = req.body || {};

      if (!sourceId) {
        return res.status(400).json({ error: "Missing sourceId" });
      }

      if (!bookingId) {
        return res.status(400).json({ error: "Missing bookingId" });
      }

      if (!idempotencyKey) {
        return res.status(400).json({ error: "Missing idempotencyKey" });
      }

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
        environment: SquareEnvironment.Sandbox
      });

      const paymentResponse = await client.payments.create({
        sourceId,
        idempotencyKey,
        amountMoney: {
          amount: BigInt(amountMoney.amount),
          currency: amountMoney.currency
        },
        locationId: "LMMEC838AX8QP",
        referenceId: bookingId,
        note: `FC Hanley camp booking ${bookingId}`,
        buyerEmailAddress: buyer?.emailAddress || undefined,
        buyerPhoneNumber: buyer?.phoneNumber || undefined
      });

      const payment = paymentResponse.payment;

      return res.status(200).json({
        success: true,
        paymentId: payment?.id || "",
        orderId: payment?.orderId || "",
        status: payment?.status || ""
      });
    } catch (error) {
      logger.error("Square payment error", error);

      if (error instanceof SquareError) {
        const detail =
          error.errors?.map(e => e.detail).filter(Boolean).join(" | ") ||
          "Square payment failed";

        return res.status(400).json({
          error: detail
        });
      }

      return res.status(500).json({
        error: "Internal payment error"
      });
    }
  }
);