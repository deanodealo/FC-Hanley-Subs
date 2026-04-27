// Firebase config
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

const PRICE = "30.00";
const MAX_TEAMS_PER_GROUP = 12;

async function isAgeGroupFull(ageGroup) {
  const snapshot = await db
    .collection("tournamentRegistrations")
    .where("ageGroup", "==", ageGroup)
    .get();

  return snapshot.size >= MAX_TEAMS_PER_GROUP;
}

const ageGroupInfo = {
  U7: {
    date: "Saturday 4th July 2026",
    session: "PM",
    format: "5v5"
  },
  U8: {
    date: "Sunday 5th July 2026",
    session: "AM",
    format: "5v5"
  },
  U9: {
    date: "Saturday 4th July 2026",
    session: "AM",
    format: "7v7"
  },
  U10: {
    date: "Sunday 5th July 2026",
    session: "PM",
    format: "7v7"
  },
  U11: {
    date: "Sunday 5th July 2026",
    session: "AM",
    format: "9v9"
  },
  U12: {
    date: "Saturday 4th July 2026",
    session: "AM",
    format: "9v9"
  },
  U13: {
    date: "Saturday 4th July 2026",
    session: "PM",
    format: "11v11"
  }
};

const form = document.getElementById("tournamentForm");
const messageBox = document.getElementById("formMessage");
const ageGroupSelect = document.getElementById("ageGroup");
const ageGroupDetails = document.getElementById("ageGroupDetails");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `form-message ${type}`;
}

function getFormData() {
  const ageGroup = document.getElementById("ageGroup").value;
  const selectedInfo = ageGroupInfo[ageGroup];

  return {
    managerName: document.getElementById("managerName").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    teamName: document.getElementById("teamName").value.trim(),
    ageGroup,
    tournamentDate: selectedInfo ? selectedInfo.date : "",
    session: selectedInfo ? selectedInfo.session : "",
    format: selectedInfo ? selectedInfo.format : ""
  };
}

function validateForm() {
  const data = getFormData();

  if (
    !data.managerName ||
    !data.email ||
    !data.phone ||
    !data.teamName ||
    !data.ageGroup
  ) {
    showMessage("Please complete all required fields before paying.", "error");
    return false;
  }

  return true;
}

ageGroupSelect.addEventListener("change", async () => {
  const selected = ageGroupSelect.value;
  const info = ageGroupInfo[selected];

  if (!info) {
    ageGroupDetails.classList.add("hidden");
    ageGroupDetails.innerHTML = "";
    return;
  }

  const snapshot = await db
    .collection("tournamentRegistrations")
    .where("ageGroup", "==", selected)
    .get();

  const count = snapshot.size;
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

paypal.Buttons({
  style: {
    layout: "vertical",
    color: "gold",
    shape: "rect",
    label: "paypal"
  },

 onClick: async function () {
  if (!validateForm()) return false;

  const ageGroup = document.getElementById("ageGroup").value;

  const isFull = await isAgeGroupFull(ageGroup);

  if (isFull) {
    showMessage("This age group is now FULL. Please choose another.", "error");
    return false;
  }

  return true;
},

  createOrder: function (data, actions) {
    return actions.order.create({
      purchase_units: [
        {
          description: "FC Hanley Tournament Registration",
          amount: {
            currency_code: "GBP",
            value: PRICE
          }
        }
      ]
    });
  },

  onApprove: function (data, actions) {
    return actions.order.capture().then(async function (details) {
      const registrationData = getFormData();

      const saveData = {
        ...registrationData,
        amountPaid: 30,
        paymentStatus: "paid",
        paypalOrderId: data.orderID,
        paypalPayerId: data.payerID || "",
        paypalPayerEmail: details?.payer?.email_address || "",
        paypalName: details?.payer?.name
          ? `${details.payer.name.given_name || ""} ${details.payer.name.surname || ""}`.trim()
          : "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        await db.collection("tournamentRegistrations").add(saveData);

        showMessage(
          "Registration complete. Payment received and team has been registered.",
          "success"
        );

        form.reset();
        ageGroupDetails.classList.add("hidden");
        ageGroupDetails.innerHTML = "";
      } catch (error) {
        console.error("Firebase save error:", error);
        showMessage(
          "Payment was successful, but there was a problem saving the registration. Please contact FC Hanley.",
          "error"
        );
      }
    });
  },

  onError: function (err) {
    console.error("PayPal error:", err);
    showMessage("There was a PayPal payment error. Please try again.", "error");
  },

  onCancel: function () {
    showMessage("Payment cancelled. Registration has not been saved.", "error");
  }
}).render("#paypal-button-container");