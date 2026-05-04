// -----------------------------------------------
// Firebase config
// -----------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDXXX-LMkY4Q0oN0M9e5wLdVhANzL8ifHs",
  authDomain: "fchanley-8d910.firebaseapp.com",
  databaseURL: "https://fchanley-8d910-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fchanley-8d910",
  storageBucket: "fchanley-8d910.firebasestorage.app",
  messagingSenderId: "384977183977",
  appId: "1:384977183977:web:7805c8ba7e9122b883bc78",
  measurementId: "G-1CBV4NK83L"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// -----------------------------------------------
// Square config
// TODO: swap to production App ID & Location ID when going live
// -----------------------------------------------
const SQUARE_APP_ID      = "sandbox-sq0idb-UYZ4vS_qriKXRXKP5uNkEQ";    // replace with your sandbox App ID
const SQUARE_LOCATION_ID = "LMMEC838AX8QP";                 // your sandbox Location ID

// Cloud Function URL
// TODO: confirm this matches your deployed function URL
const CHARGE_FUNCTION_URL = "https://europe-west1-fchanley-8d910.cloudfunctions.net/createSquarePayment";

// -----------------------------------------------
// Constants
// -----------------------------------------------
const PRICE             = 30;
const MAX_TEAMS_PER_GROUP = 12;

// -----------------------------------------------
// DOM refs
// -----------------------------------------------
const form           = document.getElementById("tournamentForm");
const messageBox     = document.getElementById("formMessage");
const ageGroupSelect = document.getElementById("ageGroup");
const ageGroupDetails = document.getElementById("ageGroupDetails");
const payButton      = document.getElementById("pay-button");

// -----------------------------------------------
// Age group info
// -----------------------------------------------
const ageGroupInfo = {
  U7:  { date: "Saturday 4th July 2026",  session: "PM", format: "5v5"   },
  U8:  { date: "Sunday 5th July 2026",    session: "AM", format: "5v5"   },
  U9:  { date: "Saturday 4th July 2026",  session: "AM", format: "7v7"   },
  U10: { date: "Sunday 5th July 2026",    session: "PM", format: "7v7"   },
  U11: { date: "Sunday 5th July 2026",    session: "AM", format: "9v9"   },
  U12: { date: "Saturday 4th July 2026",  session: "AM", format: "9v9"   },
  U13: { date: "Saturday 4th July 2026",  session: "PM", format: "11v11" }
};

// -----------------------------------------------
// Helpers
// -----------------------------------------------
function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `form-message ${type}`;
  messageBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function getFormData() {
  const ageGroup    = ageGroupSelect.value;
  const selectedInfo = ageGroupInfo[ageGroup];

  return {
    managerName:    document.getElementById("managerName").value.trim(),
    email:          document.getElementById("email").value.trim(),
    phone:          document.getElementById("phone").value.trim(),
    teamName:       document.getElementById("teamName").value.trim(),
    ageGroup,
    tournamentDate: selectedInfo ? selectedInfo.date    : "",
    session:        selectedInfo ? selectedInfo.session : "",
    format:         selectedInfo ? selectedInfo.format  : ""
  };
}

function validateForm() {
  const data = getFormData();

  if (!data.managerName || !data.email || !data.phone || !data.teamName || !data.ageGroup) {
    showMessage("Please complete all required fields before paying.", "error");
    return false;
  }

  return true;
}

async function isAgeGroupFull(ageGroup) {
  const snapshot = await db
    .collection("tournamentRegistrations")
    .where("ageGroup", "==", ageGroup)
    .get();

  return snapshot.size >= MAX_TEAMS_PER_GROUP;
}

function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

// -----------------------------------------------
// Age group change — show details + availability
// -----------------------------------------------
ageGroupSelect.addEventListener("change", async () => {
  const selected = ageGroupSelect.value;
  const info     = ageGroupInfo[selected];

  if (!info) {
    ageGroupDetails.classList.add("hidden");
    ageGroupDetails.innerHTML = "";
    return;
  }

  const snapshot = await db
    .collection("tournamentRegistrations")
    .where("ageGroup", "==", selected)
    .get();

  const count  = snapshot.size;
  const isFull = count >= MAX_TEAMS_PER_GROUP;

  ageGroupDetails.classList.remove("hidden");
  ageGroupDetails.innerHTML = `
    <p><strong>Date:</strong> ${info.date}</p>
    <p><strong>Session:</strong> ${info.session}</p>
    <p><strong>Format:</strong> ${info.format}</p>
    <p><strong>Teams:</strong> ${count}/${MAX_TEAMS_PER_GROUP}</p>
    ${isFull ? `<p style="color:red;"><strong>THIS AGE GROUP IS FULL</strong></p>` : ""}
  `;
});

// -----------------------------------------------
// Square — initialise card widget
// -----------------------------------------------
let card;

async function initSquare() {
  if (!window.Square) {
    showMessage("Payment system failed to load. Please refresh the page.", "error");
    return;
  }

  try {
    const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
    card = await payments.card();
    await card.configure({ postalCode: false });
    await card.attach("#card-container");
  } catch (err) {
    console.error("Square init error:", err);
    showMessage("Payment system could not be initialised. Please refresh.", "error");
  }
}

// -----------------------------------------------
// Pay button — tokenise + charge + save
// -----------------------------------------------
payButton.addEventListener("click", async () => {

  // 1. Validate form fields
  if (!validateForm()) return;

  // 2. Check age group availability
  const formData = getFormData();
  const isFull   = await isAgeGroupFull(formData.ageGroup);

  if (isFull) {
    showMessage("This age group is now FULL. Please choose another.", "error");
    return;
  }

  // 3. Disable button while processing
  payButton.disabled    = true;
  payButton.textContent = "Processing...";
  showMessage("", "");

  try {
    // 4. Tokenise card details via Square SDK
    const result = await card.tokenize();

    if (result.status !== "OK") {
      const errorMessages = result.errors
        ? result.errors.map(e => e.message).join(", ")
        : "Invalid card details. Please check and try again.";
      showMessage(errorMessages, "error");
      return;
    }

    // 5. Call Firebase Cloud Function to charge the card
    const registrationId  = generateIdempotencyKey();
    const idempotencyKey  = generateIdempotencyKey();

    const response = await fetch(CHARGE_FUNCTION_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId:       result.token,
        registrationId,
        idempotencyKey,
        amountMoney: {
          amount:   PRICE * 100,  // £30 → 3000 pence
          currency: "GBP"
        },
        teamName:  formData.teamName,
        ageGroup:  formData.ageGroup,
        buyerEmail: formData.email
      })
    });

    const chargeResult = await response.json();

    if (!response.ok || !chargeResult.success) {
      showMessage(chargeResult.error || "Payment failed. Please try again.", "error");
      return;
    }

    // 6. Payment successful — save registration to Firestore
    await db.collection("tournamentRegistrations").add({
      ...formData,
      amountPaid:      PRICE,
      paymentStatus:   "paid",
      squarePaymentId: chargeResult.paymentId,
      registrationId,
      createdAt:       firebase.firestore.FieldValue.serverTimestamp()
    });

    // 7. Success!
    showMessage(
      "Registration complete! Payment received and your team has been registered. You will receive a welcome pack via email once registration closes.",
  "success"
    );

    form.reset();
    ageGroupDetails.classList.add("hidden");
    ageGroupDetails.innerHTML = "";

  } catch (err) {
    console.error("Payment error:", err);
    showMessage("An unexpected error occurred. Please try again or contact FC Hanley.", "error");

  } finally {
    payButton.disabled    = false;
    payButton.textContent = "Pay £30 & Register";
  }
});

// -----------------------------------------------
// Init
// -----------------------------------------------
initSquare();