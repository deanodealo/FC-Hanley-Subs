// 🔥 Firebase config
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 👶 All children
let children = [];
let mediaConsent = "";
let latestFinalBooking = null;

// 💳 Square config
// Replace these with your Square SANDBOX values first
const SQUARE_APP_ID = "sandbox-sq0idb-UYZ4vS_qriKXRXKP5uNkEQ";
const SQUARE_LOCATION_ID = "LMMEC838AX8QP";

// Replace with your Firebase Function URL later
// Example:
// https://europe-west1-fchanley-8d910.cloudfunctions.net/createSquarePayment
const SQUARE_PAYMENT_ENDPOINT = "https://createsquarepayment-bxm44u2hxq-ew.a.run.app";

// 💳 Square runtime state
let squarePayments = null;
let squareCard = null;
let paymentSectionShown = false;
let paymentFormReady = false;
let savedBookingId = null;

// ⚡ Initialize
document.addEventListener("DOMContentLoaded", () => {
  addChild(); // start with one child

  // Continue button
  const continueBtn = document.getElementById("continueBooking");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      if (!validateParentDetails()) return;

      let valid = true;
      let errorMessages = [];

      const childCards = document.querySelectorAll(".child-card");

      children.forEach((child, index) => {
        const childCard = childCards[index];
        const nameInput = childCard?.querySelector('input[type="text"]');
        const ageInput = childCard?.querySelector('input[type="number"]');
        const dayCards = childCard?.querySelectorAll(".day-card");

        if (nameInput) nameInput.style.border = "none";
        if (ageInput) ageInput.style.border = "none";
        dayCards?.forEach(card => {
          card.style.border = "";
        });

        if (!child.name.trim()) {
          valid = false;
          errorMessages.push(`Please enter a name for Child ${index + 1}`);
          if (nameInput) nameInput.style.border = "2px solid red";
        }

        if (!child.age || Number(child.age) <= 0) {
          valid = false;
          errorMessages.push(`Please enter a valid age for Child ${index + 1}`);
          if (ageInput) ageInput.style.border = "2px solid red";
        }

        if (child.selectedDays.size === 0) {
          valid = false;
          errorMessages.push(`Please select at least one day for Child ${index + 1}`);
          dayCards?.forEach(card => {
            card.style.border = "2px solid red";
          });
        }
      });

      if (!valid) {
        showErrors("bookingErrors", errorMessages);
        return;
      }

      clearErrors("bookingErrors");

      document.querySelector(".container").style.display = "none";
      document.getElementById("childDetailsPage").style.display = "block";

      renderChildDetailsForm({
        children,
        mediaConsent
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Back to booking button
  const backBtn = document.getElementById("backToBooking");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      saveChildDetailsToState();
      document.getElementById("childDetailsPage").style.display = "none";
      document.querySelector(".container").style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Back to edit from review page
  const backToEditBtn = document.getElementById("backToEdit");
  if (backToEditBtn) {
    backToEditBtn.addEventListener("click", () => {
      document.getElementById("reviewPage").style.display = "none";
      document.getElementById("childDetailsPage").style.display = "block";

      renderChildDetailsForm({
        children,
        mediaConsent
      });

      // Reset visible payment state when going back to edit
      resetPaymentUI();

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Proceed to payment / Pay now
  const proceedToPaymentBtn = document.getElementById("proceedToPayment");
  if (proceedToPaymentBtn) {
    proceedToPaymentBtn.addEventListener("click", async () => {
      await handleProceedToPayment();
    });
  }

  // Live parent field feedback
  document.getElementById("parentName")?.addEventListener("input", function () {
    if (this.value.trim()) this.style.border = "none";
  });

  document.getElementById("email")?.addEventListener("input", function () {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(this.value.trim())) this.style.border = "none";
  });

  document.getElementById("phone")?.addEventListener("input", function () {
    const phonePattern = /^[\d+\s]+$/;
    if (phonePattern.test(this.value.trim())) this.style.border = "none";
  });

  // Media consent listeners
  document.querySelectorAll('input[name="mediaConsent"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      mediaConsent = e.target.value;
    });
  });

  // Submit child details
  const submitBtn = document.getElementById("submitChildDetails");
  if (submitBtn) {
    submitBtn.addEventListener("click", handleChildDetailsSubmit);
  }
});

function showErrors(containerId, messages) {
  const errorBox = document.getElementById(containerId);
  if (!errorBox) return;

  if (!messages.length) {
    errorBox.style.display = "none";
    errorBox.innerHTML = "";
    return;
  }

  errorBox.innerHTML = `
    <strong>Please fix the following:</strong>
    <ul>
      ${messages.map(msg => `<li>${msg}</li>`).join("")}
    </ul>
  `;
  errorBox.style.display = "block";
}

function clearErrors(containerId) {
  const errorBox = document.getElementById(containerId);
  if (!errorBox) return;

  errorBox.style.display = "none";
  errorBox.innerHTML = "";
}

function showPaymentStatus(message, isError = true) {
  const statusEl = document.getElementById("payment-status");
  if (!statusEl) return;

  statusEl.style.display = "block";
  statusEl.innerHTML = message;

  if (isError) {
    statusEl.style.background = "rgba(255, 0, 0, 0.12)";
    statusEl.style.border = "1px solid #ff6b6b";
  } else {
    statusEl.style.background = "rgba(0, 180, 90, 0.15)";
    statusEl.style.border = "1px solid #58d68d";
  }
}

function clearPaymentStatus() {
  const statusEl = document.getElementById("payment-status");
  if (!statusEl) return;

  statusEl.style.display = "none";
  statusEl.innerHTML = "";
  statusEl.style.background = "";
  statusEl.style.border = "";
}

function resetPaymentUI() {
  const paymentSection = document.getElementById("paymentSection");
  const proceedBtn = document.getElementById("proceedToPayment");
  const cardContainer = document.getElementById("card-container");

  paymentSectionShown = false;
  paymentFormReady = false;
  savedBookingId = null;
  squarePayments = null;
  squareCard = null;

  clearPaymentStatus();

  if (paymentSection) {
    paymentSection.style.display = "none";
  }

  if (cardContainer) {
    cardContainer.innerHTML = "";
  }

  if (proceedBtn) {
    proceedBtn.textContent = "Proceed to Payment";
    proceedBtn.disabled = false;
    proceedBtn.classList.remove("processing");
  }
}

// ✅ Parent field validation
function validateParentDetails() {
  const parentName = document.getElementById("parentName");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");

  let isValid = true;
  const messages = [];

  [parentName, email, phone].forEach(field => {
    if (field) field.style.border = "none";
  });

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[\d+\s]+$/;

  if (!parentName.value.trim()) {
    parentName.style.border = "2px solid red";
    messages.push("Enter parent/guardian name.");
    isValid = false;
  }

  if (!emailPattern.test(email.value.trim())) {
    email.style.border = "2px solid red";
    messages.push("Enter a valid email address.");
    isValid = false;
  }

  if (!phonePattern.test(phone.value.trim())) {
    phone.style.border = "2px solid red";
    messages.push("Enter a valid phone number.");
    isValid = false;
  }

  if (!isValid) {
    showErrors("bookingErrors", messages);

    const firstInvalid = [parentName, email, phone].find(field => {
      return field && field.style.border === "2px solid red";
    });

    if (firstInvalid) {
      firstInvalid.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    return false;
  }

  clearErrors("bookingErrors");
  return true;
}

// ➕ Add Child
function addChild() {
  children.push({
    name: "",
    age: "",
    selectedDays: new Set(),
    wrapDays: new Set(),
    dietary: "",
    dietaryDetails: "",
    allergies: "",
    allergiesDetails: "",
    other: "",
    otherDetails: "",
    safeguarding: "",
    safeguardingDetails: ""
  });
  renderChildren();
  updateSummary();
}

// ❌ Remove Child
function removeChildBooking(index) {
  if (children.length <= 1) return;
  children.splice(index, 1);
  renderChildren();
  updateSummary();
}

// 🎨 Render all children
function renderChildren() {
  const container = document.getElementById("childrenContainer");
  container.innerHTML = "";

  children.forEach((child, index) => {
    const div = document.createElement("div");
    div.className = "child-card";

    div.innerHTML = `
      <div class="child-header">
        <h3>Child ${index + 1}</h3>
        ${children.length > 1 ? `<button type="button" class="remove-child" data-index="${index}">✖</button>` : ""}
      </div>

      <input 
        type="text" 
        placeholder="Child Name" 
        value="${child.name || ""}"
        oninput="updateChildName(${index}, this.value)"
      >

      <input 
        type="number" 
        placeholder="Age" 
        value="${child.age || ""}"
        inputmode="numeric"
        min="4"
        max="16"
        oninput="updateChildAge(${index}, this.value)"
      >

      <div class="child-days" id="days-${index}"></div>
    `;

    container.appendChild(div);
    renderDays(index);
  });

  document.querySelectorAll(".remove-child").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      removeChildBooking(index);
    });
  });
}

// 📅 Render days per child
function renderDays(childIndex) {
  const container = document.getElementById(`days-${childIndex}`);
  const child = children[childIndex];
  container.innerHTML = "";

  CAMP.dates.forEach(day => {
    const daySelected = child.selectedDays.has(day.id);
    const wrapSelected = child.wrapDays.has(day.id);

    const div = document.createElement("div");
    div.className = `day-card ${daySelected ? "selected" : ""}`;

    div.innerHTML = `
      <strong>${day.label}</strong><br>
      <label>
        <input 
          type="checkbox" 
          ${daySelected ? "checked" : ""}
          onchange="toggleDay(${childIndex}, '${day.id}', this, this.closest('.day-card'))"
        >
        Select Day (£${CAMP.pricing.pricePerDay})
      </label><br>
      <label>
        <input 
          type="checkbox" 
          ${wrapSelected ? "checked" : ""}
          ${daySelected ? "" : "disabled"}
          onchange="toggleWrap(${childIndex}, '${day.id}', this)"
        >
        Wrap Around (+£${CAMP.pricing.wrapPrice})
      </label>
    `;

    container.appendChild(div);
  });
}

// ✏️ Update child info
function updateChildName(index, value) {
  children[index].name = value;
  updateSummary();
}

function updateChildAge(index, value) {
  children[index].age = value;
}

// 📅 Toggle day
function toggleDay(childIndex, dayId, checkbox, element) {
  const child = children[childIndex];
  const wrapCheckbox = element.querySelectorAll("input")[1];

  if (checkbox.checked) {
    child.selectedDays.add(dayId);
    element.classList.add("selected");
    if (wrapCheckbox) wrapCheckbox.disabled = false;
  } else {
    child.selectedDays.delete(dayId);
    element.classList.remove("selected");

    child.wrapDays.delete(dayId);
    if (wrapCheckbox) {
      wrapCheckbox.checked = false;
      wrapCheckbox.disabled = true;
    }
  }

  updateSummary();
}

// 🕒 Toggle wrap
function toggleWrap(childIndex, dayId, checkbox) {
  const child = children[childIndex];

  if (!child.selectedDays.has(dayId)) {
    checkbox.checked = false;
    return;
  }

  if (checkbox.checked) {
    child.wrapDays.add(dayId);
  } else {
    child.wrapDays.delete(dayId);
  }

  updateSummary();
}

// 💸 Calculate total
function calculateTotal() {
  let total = 0;

  children.forEach(child => {
    const selectedCount = child.selectedDays.size;
    const wrapTotal = child.wrapDays.size * CAMP.pricing.wrapPrice;

    let baseTotal = selectedCount * CAMP.pricing.pricePerDay;

    if (CAMP.pricing.dealEnabled) {
      if (
        CAMP.pricing.dealType === "bundle_price" &&
        selectedCount === CAMP.pricing.totalDealDays
      ) {
        baseTotal = CAMP.pricing.bundlePrice;
      } else if (
        CAMP.pricing.dealType === "nth_day_free" &&
        selectedCount === CAMP.pricing.totalDealDays
      ) {
        baseTotal = CAMP.pricing.chargedDays * CAMP.pricing.pricePerDay;
      }
    }

    total += baseTotal + wrapTotal;
  });

  return total;
}

function convertPoundsToPence(amount) {
  return Math.round(Number(amount) * 100);
}

function generateIdempotencyKey() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `fc-hanley-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function saveBookingToFirebase(finalBooking) {
  const bookingRef = db.collection("bookings").doc();

  await bookingRef.set({
    ...finalBooking,
    bookingReference: bookingRef.id,
    campName: CAMP.name,
    paymentStatus: "Pending",
    totalPricePence: convertPoundsToPence(finalBooking.totalPrice),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  return bookingRef.id;
}

async function updateBookingPayment(bookingId, updates) {
  await db.collection("bookings").doc(bookingId).update({
    ...updates,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function initialiseSquareCard() {
  if (paymentFormReady && squareCard) return;

  if (!window.Square) {
    throw new Error("Square payment library failed to load.");
  }

  if (
    !SQUARE_APP_ID ||
    SQUARE_APP_ID.includes("REPLACE_WITH") ||
    !SQUARE_LOCATION_ID ||
    SQUARE_LOCATION_ID.includes("REPLACE_WITH")
  ) {
    throw new Error("Square Application ID and Location ID need to be added to booking.js.");
  }

  squarePayments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
  squareCard = await squarePayments.card();

  const cardContainer = document.getElementById("card-container");
  if (!cardContainer) {
    throw new Error("Card container not found in the page.");
  }

  cardContainer.innerHTML = "";
  await squareCard.attach("#card-container");

  paymentFormReady = true;
}

async function revealPaymentSection() {
  const paymentSection = document.getElementById("paymentSection");
  const proceedBtn = document.getElementById("proceedToPayment");

  if (!paymentSection) {
    throw new Error("Payment section not found in the page.");
  }

  paymentSection.style.display = "block";
  clearPaymentStatus();

  if (!paymentFormReady) {
    await initialiseSquareCard();
  }

  paymentSectionShown = true;

  if (proceedBtn) {
    proceedBtn.textContent = "Pay Now";
  }

  paymentSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function tokenizeSquareCard() {
  if (!squareCard) {
    throw new Error("Card form is not ready.");
  }

  const result = await squareCard.tokenize();

  if (result.status !== "OK") {
    throw new Error("Your card details could not be validated. Please check them and try again.");
  }

  return result.token;
}

async function sendPaymentToBackend({ sourceId, bookingId, amountPence, finalBooking }) {
  if (
    !SQUARE_PAYMENT_ENDPOINT ||
    SQUARE_PAYMENT_ENDPOINT.includes("REPLACE_WITH")
  ) {
    throw new Error("Firebase Function URL is missing in booking.js.");
  }

  const response = await fetch(SQUARE_PAYMENT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sourceId,
      bookingId,
      idempotencyKey: generateIdempotencyKey(),
      amountMoney: {
        amount: amountPence,
        currency: "GBP"
      },
      buyer: {
        givenName: finalBooking.parent?.name || "",
        emailAddress: finalBooking.parent?.email || "",
        phoneNumber: finalBooking.parent?.phone || ""
      }
    })
  });

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    // ignore JSON parse failure and handle below
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      "Payment could not be processed. Please try again.";
    throw new Error(message);
  }

  return data;
}

async function handleProceedToPayment() {
  const proceedBtn = document.getElementById("proceedToPayment");

  if (!latestFinalBooking) {
    alert("Booking details are missing. Please review the form again.");
    return;
  }

  const originalText = proceedBtn?.textContent || "Proceed to Payment";

  try {
    clearPaymentStatus();
    if (proceedBtn) {
      proceedBtn.disabled = true;
      proceedBtn.classList.add("processing");
    }

    // Step 1: save booking and reveal card form
    if (!paymentSectionShown) {
      if (proceedBtn) {
        proceedBtn.textContent = "Saving booking...";
      }

      savedBookingId = await saveBookingToFirebase(latestFinalBooking);

      await revealPaymentSection();

      showPaymentStatus(
        `Booking saved with reference <strong>${savedBookingId}</strong>. Enter card details and click <strong>Pay Now</strong> to complete payment.`,
        false
      );

      if (proceedBtn) {
        proceedBtn.textContent = "Pay Now";
        proceedBtn.disabled = false;
        proceedBtn.classList.remove("processing");
      }

      return;
    }

    // Step 2: take payment
    if (!savedBookingId) {
      throw new Error("Booking reference missing. Please go back and review the booking again.");
    }

    if (proceedBtn) {
      proceedBtn.textContent = "Processing payment...";
    }

    const sourceId = await tokenizeSquareCard();
    const amountPence = convertPoundsToPence(latestFinalBooking.totalPrice);

    const paymentResult = await sendPaymentToBackend({
      sourceId,
      bookingId: savedBookingId,
      amountPence,
      finalBooking: latestFinalBooking
    });

    await updateBookingPayment(savedBookingId, {
      paymentStatus: "Paid",
      paidAt: firebase.firestore.FieldValue.serverTimestamp(),
      squarePaymentId: paymentResult.paymentId || paymentResult.payment?.id || "",
      squareOrderId: paymentResult.orderId || paymentResult.payment?.order_id || "",
      paymentAmountPence: amountPence
    });

    showPaymentStatus(
      `Payment successful. Your booking is confirmed. Reference: <strong>${savedBookingId}</strong>`,
      false
    );

    if (proceedBtn) {
      proceedBtn.textContent = "Payment Complete";
      proceedBtn.disabled = true;
      proceedBtn.classList.remove("processing");
    }
  } catch (error) {
    console.error("Payment flow error:", error);
    showPaymentStatus(error.message || "Something went wrong while taking payment.");

    if (savedBookingId) {
      try {
        await updateBookingPayment(savedBookingId, {
          paymentStatus: "Pending"
        });
      } catch (updateError) {
        console.error("Failed to preserve pending status:", updateError);
      }
    }

    if (proceedBtn) {
      proceedBtn.textContent = paymentSectionShown ? "Pay Now" : originalText;
      proceedBtn.disabled = false;
      proceedBtn.classList.remove("processing");
    }
    return;
  }

  if (proceedBtn && !proceedBtn.disabled) {
    proceedBtn.textContent = paymentSectionShown ? "Pay Now" : originalText;
    proceedBtn.disabled = false;
    proceedBtn.classList.remove("processing");
  }
}

// 📊 Update summary
function updateSummary() {
  const summaryDiv = document.getElementById("summaryDetails");
  if (!summaryDiv) return;

  summaryDiv.innerHTML = "";

  children.forEach((child, index) => {
    const div = document.createElement("div");
    div.className = "summary-child";

    div.innerHTML = `
      <strong>${child.name || "Child " + (index + 1)}</strong><br>
      Days: ${child.selectedDays.size} | Wrap: ${child.wrapDays.size}
    `;

    summaryDiv.appendChild(div);
  });

  const totalEl = document.getElementById("totalPrice");
  if (totalEl) {
    totalEl.innerText = `Total: £${calculateTotal()}`;
  }
}

// 🧾 Save child details page values into state
function saveChildDetailsToState() {
  children.forEach((child, index) => {
    child.dietary = document.getElementById(`dietary-${index}`)?.value || child.dietary || "";
    child.dietaryDetails = document.getElementById(`dietaryDetails-${index}`)?.value || child.dietaryDetails || "";
    child.allergies = document.getElementById(`allergies-${index}`)?.value || child.allergies || "";
    child.allergiesDetails = document.getElementById(`allergiesDetails-${index}`)?.value || child.allergiesDetails || "";
    child.other = document.getElementById(`other-${index}`)?.value || child.other || "";
    child.otherDetails = document.getElementById(`otherDetails-${index}`)?.value || child.otherDetails || "";
    child.safeguarding = document.getElementById(`safeguarding-${index}`)?.value || child.safeguarding || "";
    child.safeguardingDetails = document.getElementById(`safeguardingDetails-${index}`)?.value || child.safeguardingDetails || "";
  });

  const selectedConsent = document.querySelector('input[name="mediaConsent"]:checked');
  if (selectedConsent) {
    mediaConsent = selectedConsent.value;
  }
}

// 🧾 Child Details Form
function renderChildDetailsForm(bookingData) {
  const container = document.getElementById("childDetailsContainer");
  container.innerHTML = "";

  bookingData.children.forEach((child, index) => {
    const div = document.createElement("div");
    div.className = "child-details-card";

    div.innerHTML = `
      <h3>Child ${index + 1}: ${child.name || ""}</h3>

      <label>Is there any dietary information we should be aware of?</label>
      <select id="dietary-${index}">
        <option value="" ${!child.dietary ? "selected" : ""}>Select</option>
        <option value="No" ${child.dietary === "No" ? "selected" : ""}>No</option>
        <option value="Yes" ${child.dietary === "Yes" ? "selected" : ""}>Yes</option>
      </select>
      <textarea id="dietaryDetails-${index}" placeholder="Please provide full details" style="display:${child.dietary === "Yes" ? "block" : "none"};">${child.dietaryDetails || ""}</textarea>

      <label>Does your child have any known allergies or medical conditions?</label>
      <select id="allergies-${index}">
        <option value="" ${!child.allergies ? "selected" : ""}>Select</option>
        <option value="No" ${child.allergies === "No" ? "selected" : ""}>No</option>
        <option value="Yes" ${child.allergies === "Yes" ? "selected" : ""}>Yes</option>
      </select>
      <textarea id="allergiesDetails-${index}" placeholder="Please provide full details" style="display:${child.allergies === "Yes" ? "block" : "none"};">${child.allergiesDetails || ""}</textarea>

      <label>Is there anything else we need to know about your child? (e.g. Behavioural, SEN, Disabilities)</label>
      <select id="other-${index}">
        <option value="" ${!child.other ? "selected" : ""}>Select</option>
        <option value="No" ${child.other === "No" ? "selected" : ""}>No</option>
        <option value="Yes" ${child.other === "Yes" ? "selected" : ""}>Yes</option>
      </select>
      <textarea id="otherDetails-${index}" placeholder="Please provide full details" style="display:${child.other === "Yes" ? "block" : "none"};">${child.otherDetails || ""}</textarea>

      <label>Is there anything we need to know about your child in relation to safeguarding?</label>
      <select id="safeguarding-${index}">
        <option value="" ${!child.safeguarding ? "selected" : ""}>Select</option>
        <option value="No" ${child.safeguarding === "No" ? "selected" : ""}>No</option>
        <option value="Yes" ${child.safeguarding === "Yes" ? "selected" : ""}>Yes</option>
      </select>
      <textarea id="safeguardingDetails-${index}" placeholder="Please provide full details" style="display:${child.safeguarding === "Yes" ? "block" : "none"};">${child.safeguardingDetails || ""}</textarea>

      <hr>
    `;

    container.appendChild(div);

    ["dietary", "allergies", "other", "safeguarding"].forEach(field => {
      setupConditionalTextarea(index, field);
    });
  });

  if (bookingData.mediaConsent) {
    const radio = document.querySelector(`input[name="mediaConsent"][value="${bookingData.mediaConsent}"]`);
    if (radio) radio.checked = true;
  } else {
    document.querySelectorAll('input[name="mediaConsent"]').forEach(radio => {
      radio.checked = false;
    });
  }
}

// Show/hide textarea if Yes selected and save state
function setupConditionalTextarea(index, field) {
  const selectEl = document.getElementById(`${field}-${index}`);
  const textEl = document.getElementById(`${field}Details-${index}`);

  if (!selectEl || !textEl) return;

  selectEl.addEventListener("change", (e) => {
    children[index][field] = e.target.value;

    if (e.target.value === "Yes") {
      textEl.style.display = "block";
    } else {
      textEl.style.display = "none";
      textEl.value = "";
      children[index][`${field}Details`] = "";
      textEl.style.border = "none";
    }

    selectEl.style.border = "none";
  });

  textEl.addEventListener("input", () => {
    children[index][`${field}Details`] = textEl.value;

    if (textEl.value.trim()) {
      textEl.style.border = "none";
    }
  });
}

// 📋 Render review page
function renderReviewPage(finalBooking) {
  const parentReview = document.getElementById("parentDetailsReview");
  const childrenReview = document.getElementById("childrenDetailsReview");
  const consentReview = document.getElementById("mediaConsentReview");
  const totalReview = document.getElementById("totalPriceReview");

  if (parentReview) {
    parentReview.innerHTML = `
      <div class="review-card">
        <h3>Parent / Guardian Details</h3>
        <p><strong>Name:</strong> ${finalBooking.parent.name}</p>
        <p><strong>Email:</strong> ${finalBooking.parent.email}</p>
        <p><strong>Phone:</strong> ${finalBooking.parent.phone}</p>
      </div>
    `;
  }

  if (childrenReview) {
    childrenReview.innerHTML = `
      <div class="review-card">
        <h3>Children</h3>
        ${finalBooking.children.map((child, index) => `
          <div class="review-child">
            <p><strong>Child ${index + 1}:</strong> ${child.name} (${child.age})</p>
            <p><strong>Days:</strong> ${(child.selectedDays || []).join(", ") || "None"}</p>
            <p><strong>Wrap:</strong> ${(child.wrapDays || []).join(", ") || "None"}</p>
            <p><strong>Dietary:</strong> ${child.dietary}${child.dietary === "Yes" ? ` - ${child.dietaryDetails}` : ""}</p>
            <p><strong>Allergies / Medical:</strong> ${child.allergies}${child.allergies === "Yes" ? ` - ${child.allergiesDetails}` : ""}</p>
            <p><strong>Additional Needs:</strong> ${child.other}${child.other === "Yes" ? ` - ${child.otherDetails}` : ""}</p>
            <p><strong>Safeguarding:</strong> ${child.safeguarding}${child.safeguarding === "Yes" ? ` - ${child.safeguardingDetails}` : ""}</p>
          </div>
        `).join("")}
      </div>
    `;
  }

  if (consentReview) {
    consentReview.innerHTML = `
      <div class="review-card">
        <h3>Media Consent</h3>
        <p>${finalBooking.mediaConsent}</p>
      </div>
    `;
  }

  if (totalReview) {
    totalReview.innerHTML = `
      <div class="review-total">
        <div class="total-label">Total</div>
        <div class="total-amount">£${finalBooking.totalPrice}</div>
        <div class="total-note">Includes all selected days & wrap-around</div>
      </div>
    `;
  }
}

// ✅ Final child details submit
function handleChildDetailsSubmit() {
  saveChildDetailsToState();

  let valid = true;
  let errorMessages = [];

  children.forEach((child, index) => {
    const dietary = document.getElementById(`dietary-${index}`);
    const dietaryDetails = document.getElementById(`dietaryDetails-${index}`);
    const allergies = document.getElementById(`allergies-${index}`);
    const allergiesDetails = document.getElementById(`allergiesDetails-${index}`);
    const other = document.getElementById(`other-${index}`);
    const otherDetails = document.getElementById(`otherDetails-${index}`);
    const safeguarding = document.getElementById(`safeguarding-${index}`);
    const safeguardingDetails = document.getElementById(`safeguardingDetails-${index}`);

    [
      dietary,
      dietaryDetails,
      allergies,
      allergiesDetails,
      other,
      otherDetails,
      safeguarding,
      safeguardingDetails
    ].forEach(field => {
      if (field) field.style.border = "none";
    });

    if (!child.name.trim()) {
      valid = false;
      errorMessages.push(`Please enter a name for Child ${index + 1}`);
    }

    if (!child.age) {
      valid = false;
      errorMessages.push(`Please enter an age for Child ${index + 1}`);
    }

    if (!child.dietary) {
      valid = false;
      if (dietary) dietary.style.border = "2px solid red";
      errorMessages.push(`Please answer dietary info for Child ${index + 1}`);
    } else if (child.dietary === "Yes" && !child.dietaryDetails.trim()) {
      valid = false;
      if (dietaryDetails) dietaryDetails.style.border = "2px solid red";
      errorMessages.push(`Please provide dietary details for Child ${index + 1}`);
    }

    if (!child.allergies) {
      valid = false;
      if (allergies) allergies.style.border = "2px solid red";
      errorMessages.push(`Please answer allergies/medical info for Child ${index + 1}`);
    } else if (child.allergies === "Yes" && !child.allergiesDetails.trim()) {
      valid = false;
      if (allergiesDetails) allergiesDetails.style.border = "2px solid red";
      errorMessages.push(`Please provide allergy/medical details for Child ${index + 1}`);
    }

    if (!child.other) {
      valid = false;
      if (other) other.style.border = "2px solid red";
      errorMessages.push(`Please answer additional needs info for Child ${index + 1}`);
    } else if (child.other === "Yes" && !child.otherDetails.trim()) {
      valid = false;
      if (otherDetails) otherDetails.style.border = "2px solid red";
      errorMessages.push(`Please provide additional needs details for Child ${index + 1}`);
    }

    if (!child.safeguarding) {
      valid = false;
      if (safeguarding) safeguarding.style.border = "2px solid red";
      errorMessages.push(`Please answer safeguarding info for Child ${index + 1}`);
    } else if (child.safeguarding === "Yes" && !child.safeguardingDetails.trim()) {
      valid = false;
      if (safeguardingDetails) safeguardingDetails.style.border = "2px solid red";
      errorMessages.push(`Please provide safeguarding details for Child ${index + 1}`);
    }
  });

  const selectedConsent = document.querySelector('input[name="mediaConsent"]:checked');
  if (!selectedConsent) {
    valid = false;
    errorMessages.push("Please select Yes or No for media consent.");
  } else {
    mediaConsent = selectedConsent.value;
  }

  if (!valid) {
    showErrors("childDetailsErrors", errorMessages);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  clearErrors("childDetailsErrors");

  const finalBooking = {
    parent: {
      name: document.getElementById("parentName")?.value || "",
      email: document.getElementById("email")?.value || "",
      phone: document.getElementById("phone")?.value || ""
    },
    children: children.map((child) => ({
      name: child.name,
      age: child.age,
      selectedDays: Array.from(child.selectedDays).map(dayId => {
        const match = CAMP.dates.find(d => d.id === dayId);
        return match ? match.label : dayId;
      }),
      wrapDays: Array.from(child.wrapDays).map(dayId => {
        const match = CAMP.dates.find(d => d.id === dayId);
        return match ? match.label : dayId;
      }),
      dietary: child.dietary || "",
      dietaryDetails: child.dietaryDetails || "",
      allergies: child.allergies || "",
      allergiesDetails: child.allergiesDetails || "",
      other: child.other || "",
      otherDetails: child.otherDetails || "",
      safeguarding: child.safeguarding || "",
      safeguardingDetails: child.safeguardingDetails || ""
    })),
    mediaConsent: mediaConsent,
    totalPrice: calculateTotal()
  };

  latestFinalBooking = finalBooking;

  // Reset payment state whenever review is rebuilt
  resetPaymentUI();

  renderReviewPage(finalBooking);

  document.getElementById("childDetailsPage").style.display = "none";
  document.getElementById("reviewPage").style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });

  console.log("Final Booking:", finalBooking);
}