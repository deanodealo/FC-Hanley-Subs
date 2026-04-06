
// Firebase configuration (ensure it's declared only once in bookingadmin.js)
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
loginButton.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    // Firebase Authentication login
    await firebase.auth().signInWithEmailAndPassword(email, password);

    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      throw new Error("No user is logged in.");
    }

    // Log the current user's UID
    console.log("Current User UID:", currentUser.uid);

    // Query the user document in Firestore using the UID
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User document not found in Firestore.");
    }

    // Log the user document data
    console.log("User Doc Data:", userDoc.data());

    // Check if the user is an admin
    if (userDoc.exists && userDoc.data().isAdmin) {
      // If the user is an admin, show the admin section
      loginSection.style.display = "none";
      adminSection.style.display = "block";

      // Load bookings
      loadBookings();
    } else {
      // If not admin, show an error
      errorMessage.textContent = "You do not have permission to access this page.";
      errorMessage.style.display = "block";
    }
  } catch (error) {
    // Handle login errors
    console.error("Login error: ", error);
    errorMessage.textContent = error.message;
    errorMessage.style.display = "block";
  }
});

// Function to load bookings from Firestore
async function loadBookings() {
  try {
    const snapshot = await db.collection("bookings").get();
    allBookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort the bookings by the time they were created
    allBookings.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    // Apply filters to the loaded bookings
    applyFilters(allBookings); // Now passing allBookings to applyFilters
  } catch (error) {
    console.error("Error loading bookings:", error);
    document.getElementById("noBookingsMessage").style.display = "block";
    document.getElementById("noBookingsMessage").textContent = "Could not load bookings.";
  }
}

// Function to apply filters on bookings
function applyFilters(bookings) {
  const searchValue = document.getElementById("searchInput")?.value.trim().toLowerCase() || "";
  const selectedDay = document.getElementById("dayFilter")?.value || "all";

  console.log("Selected Day:", selectedDay); // Log selected day value
  console.log("Search Term:", searchValue); // Log search term
  console.log("Total Bookings:", bookings.length); // Log total number of bookings

  const filtered = bookings.filter(booking => {
    const parentName = booking.parent?.name?.toLowerCase() || "";
    const childNames = (booking.children || []).map(child => child.name?.toLowerCase() || "").join(" ");

    const matchesSearch = !searchValue || parentName.includes(searchValue) || childNames.includes(searchValue);
    console.log("Matches Search:", matchesSearch); // Log search match status

    let matchesDay = false;
    if (selectedDay === "all") {
      matchesDay = true; // No filtering on day when "All Days" is selected
    } else {
      // Check if any of the children have the selected day in their selectedDays
      matchesDay = (booking.children || []).some(child => {
        const mappedSelectedDays = child.selectedDays?.map(day => mapFullDayToShort(day));
        return Array.isArray(mappedSelectedDays) && mappedSelectedDays.includes(selectedDay);
      });
    }

    return matchesSearch && matchesDay; // Filter by both search and day
  });

  console.log("Filtered Bookings:", filtered.length); // Log number of filtered bookings

  renderDashboard(filtered, selectedDay); // Render the filtered dashboard
  renderBookings(filtered); // Render the filtered bookings
}

// Helper function to map full day names (e.g., "Tuesday 7th April") to short day IDs (e.g., "tue")
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

  const dayName = fullDay.split(" ")[0]; // Get the day of the week (e.g., "Tuesday")
  return dayMapping[dayName] || fullDay; // Return the short day ID or the full day string if not found
}

// Call this function to populate the dropdown when the admin page is loaded
function populateDayFilter() {
  const dayFilter = document.getElementById("dayFilter");

  // Clear existing options (in case the filter is populated before)
  dayFilter.innerHTML = "";

  // Add an "All" option at the top
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All Days";
  dayFilter.appendChild(allOption);

  // Add each day from CAMP.dates
  CAMP.dates.forEach(day => {
    const option = document.createElement("option");
    option.value = day.id;
    option.textContent = day.label;
    dayFilter.appendChild(option);
  });

  // Add event listener to re-apply the filter when a day is selected
  dayFilter.addEventListener("change", () => {
    const selectedDay = dayFilter.value;
    applyFilters(allBookings); // Pass the stored allBookings array to applyFilters
  });
}

// Ensure this function is called when the page has fully loaded
window.addEventListener('load', function () {
  populateDayFilter();  // Populate the day filter dropdown

  // Load bookings after populating the filter
  loadBookings();
});

// Function to render dashboard stats
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

  bookings.forEach(booking => {
    totalIncome += Number(booking.totalPrice || 0);

    (booking.children || []).forEach(child => {
      totalChildren += 1;
    });
  });

  totalBookingsElement.innerHTML = totalBookings;
  totalChildrenElement.innerHTML = totalChildren;
  totalIncomeElement.innerHTML = `£${totalIncome}`;
}

// Function to render bookings
function renderBookings(bookings) {
  const list = document.getElementById("bookingsList");
  const noBookingsMessage = document.getElementById("noBookingsMessage");

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

    card.innerHTML = `
      <div class="booking-top">
        <div>
          <div class="booking-name">${parentName}</div>
          <div class="booking-meta">
            <div><strong>Email:</strong> ${parentEmail}</div>
            <div><strong>Phone:</strong> ${parentPhone}</div>
            <div><strong>Booked:</strong> ${createdAt}</div>
            <div><strong>Media Consent:</strong> ${mediaConsent}</div>
          </div>
        </div>

        <div class="booking-total">£${totalPrice}</div>
      </div>

      <div class="booking-section">
        <h3>Children</h3>
        ${(booking.children || []).map(child => renderChildBlock(child)).join("")}
      </div>
    `;

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