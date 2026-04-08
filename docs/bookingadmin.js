// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDXXX-LMkY4Q0oN0M9e5wLdVhANzL8ifHs",
  authDomain: "fchanley-8d910.firebaseapp.com",
  databaseURL: "https://fchanley-8d910-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fchanley-8d910",
  storageBucket: "fchanley-8d910.appspot.com",
  messagingSenderId: "384977183977",
  appId: "1:384977183977:web:7805c8ba7e9122b883bc78",
  measurementId: "G-1CBV4NK83L"
};

firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Store bookings globally
let allBookings = [];

// Elements for DOM manipulation
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const errorMessage = document.getElementById("errorMessage");
const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");

// Login button event listener
if (loginButton) {
  loginButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);

      const currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        throw new Error("No user is logged in.");
      }

      const userRef = db.collection("users").doc(currentUser.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new Error("User document not found in Firestore.");
      }

      if (userDoc.data().isAdmin) {
        loginSection.style.display = "none";
        adminSection.style.display = "block";
        loadBookings();
      } else {
        errorMessage.textContent = "You do not have permission to access this page.";
        errorMessage.style.display = "block";
      }
    } catch (error) {
      console.error("Login error:", error);
      errorMessage.textContent = error.message;
      errorMessage.style.display = "block";
    }
  });
}

// Function to load bookings from Firestore
async function loadBookings() {
  try {
    const snapshot = await db.collection("bookings").get();

    allBookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    allBookings.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    applyFilters(allBookings);
  } catch (error) {
    console.error("Error loading bookings:", error);
    const noBookingsMessage = document.getElementById("noBookingsMessage");
    if (noBookingsMessage) {
      noBookingsMessage.style.display = "block";
      noBookingsMessage.textContent = "Could not load bookings.";
    }
  }
}

// Function to apply filters on bookings
function applyFilters(bookings) {
  const searchInput = document.getElementById("searchInput");
  const searchValue = searchInput?.value.trim().toLowerCase() || "";
  const selectedDay = document.getElementById("dayFilter")?.value || "all";

  const filtered = bookings.filter(booking => {
    const parentName = booking.parent?.name?.toLowerCase() || "";
    const childNames = (booking.children || [])
      .map(child => child.name?.toLowerCase() || "")
      .join(" ");

    const matchesSearch =
      !searchValue ||
      parentName.includes(searchValue) ||
      childNames.includes(searchValue);

    let matchesDay = false;

    if (selectedDay === "all") {
      matchesDay = true;
    } else {
      matchesDay = (booking.children || []).some(child => {
        const mappedSelectedDays = (child.selectedDays || []).map(day => mapFullDayToShort(day));
        return mappedSelectedDays.includes(selectedDay);
      });
    }

    return matchesSearch && matchesDay;
  });

  renderDashboard(filtered, selectedDay);
  renderDayIncomeBreakdown(allBookings);
  renderBookings(filtered);
}

// Helper function to map full day names to short day IDs
function mapFullDayToShort(fullDay) {
  const dayMapping = {
    "Monday": "mon",
    "Tuesday": "tue",
    "Wednesday": "wed",
    "Thursday": "thu",
    "Friday": "fri",
    "Saturday": "sat",
    "Sunday": "sun"
  };

  const dayName = String(fullDay || "").split(" ")[0];
  return dayMapping[dayName] || fullDay;
}

// Populate day filter dropdown
function populateDayFilter() {
  const dayFilter = document.getElementById("dayFilter");
  if (!dayFilter) return;

  dayFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All Days";
  dayFilter.appendChild(allOption);

  (CAMP.dates || []).forEach(day => {
    const option = document.createElement("option");
    option.value = day.id;
    option.textContent = day.label;
    dayFilter.appendChild(option);
  });

  dayFilter.addEventListener("change", () => {
    applyFilters(allBookings);
  });
}

// Work out which camp days are actually charged for a child after deal logic
function getChargedCampDaysForChild(child) {
  const selectedDays = Array.isArray(child.selectedDays) ? child.selectedDays : [];

  const mappedSelectedDays = selectedDays
    .map(day => mapFullDayToShort(day))
    .filter(Boolean);

  const campDayOrder = (CAMP.dates || []).map(day => day.id);

  const orderedSelectedDays = campDayOrder.filter(dayId =>
    mappedSelectedDays.includes(dayId)
  );

  const pricing = CAMP.pricing || {};
  const dealEnabled = pricing.dealEnabled;
  const dealType = pricing.dealType;
  const chargedDays = Number(pricing.chargedDays || 0);
  const totalDealDays = Number(pricing.totalDealDays || 0);

  if (
    !dealEnabled ||
    dealType !== "nth_day_free" ||
    !chargedDays ||
    !totalDealDays
  ) {
    return orderedSelectedDays;
  }

  const chargedDayIds = [];

  orderedSelectedDays.forEach((dayId, index) => {
    const cyclePosition = index % totalDealDays;

    if (cyclePosition < chargedDays) {
      chargedDayIds.push(dayId);
    }
  });

  return chargedDayIds;
}

// Calculate discounted income for one specific day
function calculateIncomeForDay(bookings, dayId) {
  const dayPrice = Number(CAMP.pricing?.pricePerDay || 0);
  const wrapPrice = Number(CAMP.pricing?.wrapPrice || 0);

  let total = 0;

  bookings.forEach(booking => {
    (booking.children || []).forEach(child => {
      const wrapDays = Array.isArray(child.wrapDays) ? child.wrapDays : [];
      const mappedWrapDays = wrapDays.map(day => mapFullDayToShort(day));
      const chargedCampDays = getChargedCampDaysForChild(child);

      if (chargedCampDays.includes(dayId)) {
        total += dayPrice;
      }

      if (mappedWrapDays.includes(dayId)) {
        total += wrapPrice;
      }
    });
  });

  return total;
}

// Render daily income cards
function renderDayIncomeBreakdown(bookings) {
  const grid = document.getElementById("dayTotalsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  (CAMP.dates || []).forEach(day => {
    const total = calculateIncomeForDay(bookings, day.id);

    const card = document.createElement("div");
    card.className = "day-total-card";
    card.innerHTML = `
      <div class="day-name">${day.label}</div>
      <div class="day-count">£${total}</div>
    `;

    grid.appendChild(card);
  });
}

// Render main dashboard stats
function renderDashboard(bookings, selectedDay) {
  const totalBookingsElement = document.getElementById("totalBookings");
  const totalChildrenElement = document.getElementById("totalChildren");
  const totalIncomeElement = document.getElementById("totalIncome");

  if (!totalBookingsElement || !totalChildrenElement || !totalIncomeElement) {
    console.error("Dashboard elements are missing!");
    return;
  }

  let totalBookings = bookings.length;
  let totalChildren = 0;
  let totalIncome = 0;

  const dayPrice = Number(CAMP.pricing?.pricePerDay || 0);
  const wrapPrice = Number(CAMP.pricing?.wrapPrice || 0);

  bookings.forEach(booking => {
    if (selectedDay === "all") {
      totalIncome += Number(booking.totalPrice || 0);

      (booking.children || []).forEach(() => {
        totalChildren += 1;
      });

      return;
    }

    (booking.children || []).forEach(child => {
      const selectedDays = Array.isArray(child.selectedDays) ? child.selectedDays : [];
      const wrapDays = Array.isArray(child.wrapDays) ? child.wrapDays : [];

      const mappedSelectedDays = selectedDays.map(day => mapFullDayToShort(day));
      const mappedWrapDays = wrapDays.map(day => mapFullDayToShort(day));
      const chargedCampDays = getChargedCampDaysForChild(child);

      if (mappedSelectedDays.includes(selectedDay)) {
        totalChildren += 1;
      }

      if (chargedCampDays.includes(selectedDay)) {
        totalIncome += dayPrice;
      }

      if (mappedWrapDays.includes(selectedDay)) {
        totalIncome += wrapPrice;
      }
    });
  });

  totalBookingsElement.innerHTML = totalBookings;
  totalChildrenElement.innerHTML = totalChildren;
  totalIncomeElement.innerHTML = `£${totalIncome}`;
}

// Render bookings list - collapsed by default
function renderBookings(bookings) {
  const list = document.getElementById("bookingsList");
  const noBookingsMessage = document.getElementById("noBookingsMessage");

  if (!list || !noBookingsMessage) return;

  list.innerHTML = "";

  if (!bookings.length) {
    noBookingsMessage.style.display = "block";
    return;
  }

  noBookingsMessage.style.display = "none";

  bookings.forEach(booking => {
    const card = document.createElement("div");
    card.className = "booking-card";

    const parentName = booking.parent?.name || "No parent name";
    const parentEmail = booking.parent?.email || "-";
    const parentPhone = booking.parent?.phone || "-";
    const mediaConsent = booking.mediaConsent || "-";
    const totalPrice = booking.totalPrice || 0;
    const createdAt = formatTimestamp(booking.createdAt);
    const childCount = (booking.children || []).length;

    card.innerHTML = `
      <div class="booking-summary" role="button" tabindex="0" aria-expanded="false">
        <div class="booking-summary-left">
          <div class="booking-name">${parentName}</div>
          <div class="booking-summary-meta">
            Booked: ${createdAt} | Children: ${childCount} | Total: £${totalPrice}
          </div>
        </div>
        <div class="booking-toggle">View details</div>
      </div>

      <div class="booking-details">
        <div class="booking-meta">
          <div><strong>Email:</strong> ${parentEmail}</div>
          <div><strong>Phone:</strong> ${parentPhone}</div>
          <div><strong>Media Consent:</strong> ${mediaConsent}</div>
        </div>

        <div class="booking-section">
          <h3>Children</h3>
          ${(booking.children || []).map(child => renderChildBlock(child)).join("")}
        </div>
      </div>
    `;

    const summary = card.querySelector(".booking-summary");
    const toggleLabel = card.querySelector(".booking-toggle");

    const toggleCard = () => {
      const isExpanded = card.classList.toggle("expanded");
      if (toggleLabel) {
        toggleLabel.textContent = isExpanded ? "Hide details" : "View details";
      }
      if (summary) {
        summary.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      }
    };

    if (summary) {
      summary.addEventListener("click", toggleCard);

      summary.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleCard();
        }
      });
    }

    list.appendChild(card);
  });
}

function renderChildBlock(child) {
  const selectedDays = (child.selectedDays || []).join(", ") || "None";
  const wrapDays = (child.wrapDays || []).join(", ") || "None";

  const alerts = [];

  if (child.dietary === "Yes") {
    alerts.push(`<div><strong>Dietary:</strong> ${child.dietaryDetails || "Yes"}</div>`);
  }

  if (child.allergies === "Yes") {
    alerts.push(`<div><strong>Allergies / Medical:</strong> ${child.allergiesDetails || "Yes"}</div>`);
  }

  if (child.other === "Yes") {
    alerts.push(`<div><strong>Additional Needs:</strong> ${child.otherDetails || "Yes"}</div>`);
  }

  if (child.safeguarding === "Yes") {
    alerts.push(`<div><strong>Safeguarding:</strong> ${child.safeguardingDetails || "Yes"}</div>`);
  }

  return `
    <div class="child-block">
      <div class="child-name">${child.name || "Unnamed Child"} (${child.age || "-"})</div>
      <div><strong>Days:</strong> ${selectedDays}</div>
      <div><strong>Wrap Around:</strong> ${wrapDays}</div>
      ${
        alerts.length
          ? `<div class="flag alert">Medical / additional info present</div><div style="margin-top:8px;">${alerts.join("")}</div>`
          : `<div class="flag ok">No additional medical notes</div>`
      }
    </div>
  `;
}

function formatTimestamp(timestamp) {
  if (!timestamp?.seconds) return "—";
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Expand all / collapse all helpers
function expandAllBookings() {
  document.querySelectorAll(".booking-card").forEach(card => {
    card.classList.add("expanded");

    const toggle = card.querySelector(".booking-toggle");
    const summary = card.querySelector(".booking-summary");

    if (toggle) toggle.textContent = "Hide details";
    if (summary) summary.setAttribute("aria-expanded", "true");
  });
}

function collapseAllBookings() {
  document.querySelectorAll(".booking-card").forEach(card => {
    card.classList.remove("expanded");

    const toggle = card.querySelector(".booking-toggle");
    const summary = card.querySelector(".booking-summary");

    if (toggle) toggle.textContent = "View details";
    if (summary) summary.setAttribute("aria-expanded", "false");
  });
}

// Page setup
window.addEventListener("load", function () {
  populateDayFilter();

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      applyFilters(allBookings);
    });
  }

  const expandAllBtn = document.getElementById("expandAllBookings");
  const collapseAllBtn = document.getElementById("collapseAllBookings");

  if (expandAllBtn) {
    expandAllBtn.addEventListener("click", expandAllBookings);
  }

  if (collapseAllBtn) {
    collapseAllBtn.addEventListener("click", collapseAllBookings);
  }
});