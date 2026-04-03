// 🔧 CONFIG (EDIT THIS EACH CAMP)
const CAMP = {
  pricePerDay: 20,
  fullWeekPrice: 60,
  wrapPrice: 5,
  fullWeekDays: 4,
  dates: [
    { id: "tue", label: "Tuesday 7th April" },
    { id: "wed", label: "Wednesday 8th April" },
    { id: "thu", label: "Thursday 9th April" },
    { id: "fri", label: "Friday 10th April" }
  ]
};

// 👶 All children
let children = [];

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

      // Reset previous highlighting
      if (nameInput) nameInput.style.border = "none";
      if (ageInput) ageInput.style.border = "none";
      dayCards?.forEach(card => {
        card.style.border = "";
      });

      // Child name required
      if (!child.name.trim()) {
        valid = false;
        errorMessages.push(`Please enter a name for Child ${index + 1}`);
        if (nameInput) nameInput.style.border = "2px solid red";
      }

      // Child age required
      if (!child.age || Number(child.age) <= 0) {
        valid = false;
        errorMessages.push(`Please enter a valid age for Child ${index + 1}`);
        if (ageInput) ageInput.style.border = "2px solid red";
      }

      // At least one day required for each child
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
    renderChildDetailsForm({ children });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

  // Back to booking button
  const backBtn = document.getElementById("backToBooking");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      document.getElementById("childDetailsPage").style.display = "none";
      document.querySelector(".container").style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    const phonePattern = /^\+?\d+$/;
    if (phonePattern.test(this.value.trim())) this.style.border = "none";
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


// ✅ Parent field validation
function validateParentDetails() {
  const parentName = document.getElementById("parentName");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");

  let isValid = true;

  [parentName, email, phone].forEach(field => {
    if (field) field.style.border = "none";
  });

  if (!parentName.value.trim()) {
    parentName.style.border = "2px solid red";
    isValid = false;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.value.trim())) {
    email.style.border = "2px solid red";
    isValid = false;
  }

  const phonePattern = /^\+?\d+$/;
  if (!phonePattern.test(phone.value.trim())) {
    phone.style.border = "2px solid red";
    isValid = false;
  }

const messages = [];

if (!parentName.value.trim()) messages.push("Enter parent/guardian name.");
if (!emailPattern.test(email.value.trim())) messages.push("Enter a valid email address.");
if (!phonePattern.test(phone.value.trim())) messages.push("Enter a valid phone number.");

showErrors("bookingErrors", messages);

clearErrors("bookingErrors");

  return isValid;
}

// ➕ Add Child
function addChild() {
  children.push({
    name: "",
    age: "",
    selectedDays: new Set(),
    wrapDays: new Set()
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
        oninput="updateChildAge(${index}, this.value)"
      >

      <div class="child-days" id="days-${index}"></div>
    `;

    container.appendChild(div);
    renderDays(index);
  });

  // Attach remove handlers AFTER rendering
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
        Select Day (£${CAMP.pricePerDay})
      </label><br>
      <label>
        <input 
          type="checkbox" 
          ${wrapSelected ? "checked" : ""}
          ${daySelected ? "" : "disabled"}
          onchange="toggleWrap(${childIndex}, '${day.id}', this)"
        >
        Wrap Around (+£${CAMP.wrapPrice})
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
    const base =
      child.selectedDays.size === CAMP.fullWeekDays
        ? CAMP.fullWeekPrice
        : child.selectedDays.size * CAMP.pricePerDay;

    const wrap = child.wrapDays.size * CAMP.wrapPrice;
    total += base + wrap;
  });

  return total;
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
        <option value="">Select</option>
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>
      <textarea id="dietaryDetails-${index}" placeholder="Please provide full details" style="display:none;"></textarea>

      <label>Does your child have any known allergies or medical conditions?</label>
      <select id="allergies-${index}">
        <option value="">Select</option>
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>
      <textarea id="allergiesDetails-${index}" placeholder="Please provide full details" style="display:none;"></textarea>

      <label>Is there anything else we need to know about your child? (e.g. Behavioural, SEN, Disabilities)</label>
      <select id="other-${index}">
        <option value="">Select</option>
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>
      <textarea id="otherDetails-${index}" placeholder="Please provide full details" style="display:none;"></textarea>

      <label>Is there anything we need to know about your child in relation to safeguarding?</label>
      <select id="safeguarding-${index}">
        <option value="">Select</option>
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>
      <textarea id="safeguardingDetails-${index}" placeholder="Please provide full details" style="display:none;"></textarea>

      <hr>
    `;

    container.appendChild(div);

    ["dietary", "allergies", "other", "safeguarding"].forEach(field => {
      setupConditionalTextarea(index, field);
    });
  });
}

// Show/hide textarea if Yes selected
function setupConditionalTextarea(index, field) {
  const selectEl = document.getElementById(`${field}-${index}`);
  const textEl = document.getElementById(`${field}Details-${index}`);

  if (!selectEl || !textEl) return;

  selectEl.addEventListener("change", (e) => {
    if (e.target.value === "Yes") {
      textEl.style.display = "block";
    } else {
      textEl.style.display = "none";
      textEl.value = "";
      textEl.style.border = "none";
    }

    selectEl.style.border = "none";
  });

  textEl.addEventListener("input", () => {
    if (textEl.value.trim()) {
      textEl.style.border = "none";
    }
  });
}

// ✅ Final child details submit
function handleChildDetailsSubmit() {
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

    if (!dietary.value) {
      valid = false;
      dietary.style.border = "2px solid red";
      errorMessages.push(`Please answer dietary info for Child ${index + 1}`);
    } else if (dietary.value === "Yes" && !dietaryDetails.value.trim()) {
      valid = false;
      dietaryDetails.style.border = "2px solid red";
      errorMessages.push(`Please provide dietary details for Child ${index + 1}`);
    }

    if (!allergies.value) {
      valid = false;
      allergies.style.border = "2px solid red";
      errorMessages.push(`Please answer allergies/medical info for Child ${index + 1}`);
    } else if (allergies.value === "Yes" && !allergiesDetails.value.trim()) {
      valid = false;
      allergiesDetails.style.border = "2px solid red";
      errorMessages.push(`Please provide allergy/medical details for Child ${index + 1}`);
    }

    if (!other.value) {
      valid = false;
      other.style.border = "2px solid red";
      errorMessages.push(`Please answer additional needs info for Child ${index + 1}`);
    } else if (other.value === "Yes" && !otherDetails.value.trim()) {
      valid = false;
      otherDetails.style.border = "2px solid red";
      errorMessages.push(`Please provide additional needs details for Child ${index + 1}`);
    }

    if (!safeguarding.value) {
      valid = false;
      safeguarding.style.border = "2px solid red";
      errorMessages.push(`Please answer safeguarding info for Child ${index + 1}`);
    } else if (safeguarding.value === "Yes" && !safeguardingDetails.value.trim()) {
      valid = false;
      safeguardingDetails.style.border = "2px solid red";
      errorMessages.push(`Please provide safeguarding details for Child ${index + 1}`);
    }
  });

  const selectedConsent = document.querySelector('input[name="mediaConsent"]:checked');
  if (!selectedConsent) {
    valid = false;
    errorMessages.push("Please select Yes or No for media consent.");
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
    children: children.map((child, index) => ({
      name: child.name,
      age: child.age,
      selectedDays: Array.from(child.selectedDays),
      wrapDays: Array.from(child.wrapDays),
      dietary: document.getElementById(`dietary-${index}`)?.value || "",
      dietaryDetails: document.getElementById(`dietaryDetails-${index}`)?.value || "",
      allergies: document.getElementById(`allergies-${index}`)?.value || "",
      allergiesDetails: document.getElementById(`allergiesDetails-${index}`)?.value || "",
      other: document.getElementById(`other-${index}`)?.value || "",
      otherDetails: document.getElementById(`otherDetails-${index}`)?.value || "",
      safeguarding: document.getElementById(`safeguarding-${index}`)?.value || "",
      safeguardingDetails: document.getElementById(`safeguardingDetails-${index}`)?.value || ""
    })),
    mediaConsent: selectedConsent.value,
    totalPrice: calculateTotal()
  };

  console.log("Final Booking:", finalBooking);
  alert("All details completed! Proceeding to payment...");
}