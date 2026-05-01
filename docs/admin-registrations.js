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

let allRegistrations = [];

const totalTeamsEl = document.getElementById("totalTeams");
const totalIncomeEl = document.getElementById("totalIncome");
const registrationsList = document.getElementById("registrationsList");
const ageBreakdown = document.getElementById("ageBreakdown");
const ageFilter = document.getElementById("ageFilter");
const refreshBtn = document.getElementById("refreshBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");

async function loadRegistrations() {
  registrationsList.innerHTML = "Loading registrations...";

  try {
    const snapshot = await db
      .collection("tournamentRegistrations")
      .orderBy("createdAt", "desc")
      .get();

    allRegistrations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderDashboard();
  } catch (error) {
    console.error("Error loading registrations:", error);
    registrationsList.innerHTML = `
      <p style="color:red; text-align:center;">
        Could not load registrations. Check Firestore rules.
      </p>
    `;
  }
}

function renderDashboard() {
  const selectedAge = ageFilter.value;

  const filtered = selectedAge === "all"
    ? allRegistrations
    : allRegistrations.filter(reg => reg.ageGroup === selectedAge);

  totalTeamsEl.textContent = filtered.length;

  const income = filtered.reduce((total, reg) => {
    return total + Number(reg.amountPaid || 0);
  }, 0);

  totalIncomeEl.textContent = `£${income}`;

  renderAgeBreakdown();
  renderRegistrations(filtered);
}

function renderAgeBreakdown() {
  const ageGroups = ["U7", "U8", "U9", "U10", "U11", "U12", "U13"];
  const MAX_TEAMS = 12;

  ageBreakdown.innerHTML = ageGroups.map(age => {
    const count = allRegistrations.filter(reg => reg.ageGroup === age).length;
    const income = allRegistrations
      .filter(reg => reg.ageGroup === age)
      .reduce((total, reg) => total + Number(reg.amountPaid || 0), 0);

    const percentage = Math.min((count / MAX_TEAMS) * 100, 100);
    const isFull = count >= MAX_TEAMS;
    const isNearlyFull = count >= MAX_TEAMS * 0.75;

    const barColour = isFull ? '#c0392b' : isNearlyFull ? '#e67e22' : '#27ae60';

    return `
      <div class="age-box">
        <div class="age-box-header">
          <span>${age}</span>
          ${isFull ? '<span class="full-badge">FULL</span>' : ''}
        </div>
        <div class="capacity-bar-track">
          <div class="capacity-bar-fill" style="width:${percentage}%; background:${barColour};"></div>
        </div>
        <div class="age-box-stats">
          <span>${count}/${MAX_TEAMS} teams</span>
          <span>£${income}</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderRegistrations(registrations) {
  if (!registrations.length) {
    registrationsList.innerHTML = `
      <p style="text-align:center;">No registrations found.</p>
    `;
    return;
  }

  registrationsList.innerHTML = registrations.map(reg => {
    const createdDate = reg.createdAt && reg.createdAt.toDate
      ? reg.createdAt.toDate().toLocaleString("en-GB")
      : "Not available";

    return `
      <div class="registration-card">
        <h3>${escapeHtml(reg.teamName || "No team name")} <span class="age-badge">${escapeHtml(reg.ageGroup || "")}</span></h3>

        <p><strong>Manager:</strong> ${escapeHtml(reg.managerName || "")}</p>
        <p><strong>Email:</strong> ${escapeHtml(reg.email || "")}</p>
        <p><strong>Phone:</strong> ${escapeHtml(reg.phone || "")}</p>

        <p><strong>Age Group:</strong> ${escapeHtml(reg.ageGroup || "")}</p>
        <p><strong>Date:</strong> ${escapeHtml(reg.tournamentDate || "")}</p>
        <p><strong>Session:</strong> ${escapeHtml(reg.session || "")}</p>
        <p><strong>Format:</strong> ${escapeHtml(reg.format || "")}</p>

        <p><strong>Payment:</strong> <span class="paid">${escapeHtml(reg.paymentStatus || "")}</span></p>
        <p><strong>Amount Paid:</strong> £${Number(reg.amountPaid || 0)}</p>
        <p><strong>PayPal Order ID:</strong> ${escapeHtml(reg.paypalOrderId || "")}</p>
        <p><strong>Registered:</strong> ${createdDate}</p>
      </div>
    `;
  }).join("");
}

function exportCsv() {
  if (!allRegistrations.length) {
    alert("No registrations to export.");
    return;
  }

  const headers = [
    "Team Name",
    "Manager Name",
    "Email",
    "Phone",
    "Age Group",
    "Tournament Date",
    "Session",
    "Format",
    "Amount Paid",
    "Payment Status",
    "PayPal Order ID",
    "Registered Date"
  ];

  const rows = allRegistrations.map(reg => {
    const createdDate = reg.createdAt && reg.createdAt.toDate
      ? reg.createdAt.toDate().toLocaleString("en-GB")
      : "";

    return [
      reg.teamName || "",
      reg.managerName || "",
      reg.email || "",
      reg.phone || "",
      reg.ageGroup || "",
      reg.tournamentDate || "",
      reg.session || "",
      reg.format || "",
      reg.amountPaid || "",
      reg.paymentStatus || "",
      reg.paypalOrderId || "",
      createdDate
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "fc-hanley-tournament-registrations.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

ageFilter.addEventListener("change", renderDashboard);
refreshBtn.addEventListener("click", loadRegistrations);
exportCsvBtn.addEventListener("click", exportCsv);

loadRegistrations();