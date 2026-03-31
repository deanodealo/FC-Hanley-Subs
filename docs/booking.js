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

    // 1️⃣ Validate parent fields first
    if (!validateParentDetails()) return;

    // 2️⃣ Check at least one child and one selected day
    if (children.length === 0 || !children.some(c => c.selectedDays.size > 0)) {
      alert("Please add at least one child and select a day.");
      return;
    }

    // 3️⃣ Hide booking form
    document.querySelector(".container").style.display = "none";

    // 4️⃣ Show child details section
    document.getElementById("childDetailsPage").style.display = "block";

    // 5️⃣ Render the child details form dynamically
    renderChildDetailsForm({ children });
  });
}

// ✅ Parent field validation function with inline highlighting + live feedback
function validateParentDetails() {
  const parentName = document.getElementById("parentName");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");

  let isValid = true;

  // Reset previous error styles
  [parentName, email, phone].forEach(field => {
    field.style.border = "none";
  });

  // Parent name validation
  if (!parentName.value.trim()) {
    parentName.style.border = "2px solid red";
    isValid = false;
  }

  // Email validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.value.trim())) {
    email.style.border = "2px solid red";
    isValid = false;
  }

  // Phone validation (numbers only)
  const phonePattern = /^\+?\d+$/;
  if (!phonePattern.test(phone.value.trim())) {
    phone.style.border = "2px solid red";
    isValid = false;
  }

  if (!isValid) {
    alert("Please fix the highlighted fields.");
  }

  return isValid;
}

// 💻 Real-time feedback on fields while typing
document.getElementById("parentName").addEventListener("input", function() {
  if (this.value.trim()) {
    this.style.border = "none"; // Remove border once valid
  }
});

document.getElementById("email").addEventListener("input", function() {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailPattern.test(this.value.trim())) {
    this.style.border = "none"; // Remove border once valid
  }
});

document.getElementById("phone").addEventListener("input", function() {
  const phonePattern = /^\+?\d+$/;
  if (phonePattern.test(this.value.trim())) {
    this.style.border = "none"; // Remove border once valid
  }
});

  // Submit child details
  const submitBtn = document.getElementById("submitChildDetails");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      const finalBooking = {
        parent: {
          name: document.getElementById("parentName")?.value || "",
          email: document.getElementById("email")?.value || "",
          phone: document.getElementById("phone")?.value || ""
        },
        children: [],
        mediaConsent: document.getElementById("mediaConsent")?.checked || false
      };

      children.forEach((child, index) => {
        finalBooking.children.push({
          name: child.name,
          age: child.age,
          selectedDays: Array.from(child.selectedDays),
          wrapDays: Array.from(child.wrapDays),
          dietary: document.getElementById(`dietary-${index}`)?.value || "",
          dietaryDetails: document.getElementById(`dietaryDetails-${index}`)?.value || "",
          allergies: document.getElementById(`allergies-${index}`)?.value || "",
          allergiesDetails: document.getElementById(`allergiesDetails-${index}`)?.value || "",
          otherDetails: document.getElementById(`otherDetails-${index}`)?.value || "",
          safeguarding: document.getElementById(`safeguarding-${index}`)?.value || ""
        });
      });

      console.log("Final Booking:", finalBooking);
      alert("Booking data ready! Check console for full object.");
    });
  }
});

// ➕ Add Child
function addChild() {
  children.push({
    name: "",
    age: "",
    selectedDays: new Set(),
    wrapDays: new Set()
  });
  renderChildren();
}

// ❌ Remove Child
function removeChildBooking(index) {
  if (children.length <= 1) return; // always keep at least one child
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
        ${children.length > 1 ? `<button class="remove-child" data-index="${index}">✖</button>` : ""}
      </div>

      <input type="text" placeholder="Child Name" oninput="updateChildName(${index}, this.value)">
      <input type="number" placeholder="Age" oninput="updateChildAge(${index}, this.value)">

      <div class="child-days" id="days-${index}"></div>
    `;

    container.appendChild(div);
    renderDays(index);
  });

  // 🔔 Attach remove handlers AFTER rendering
  document.querySelectorAll(".remove-child").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
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
    const div = document.createElement("div");
    div.className = "day-card";

    div.innerHTML = `
      <strong>${day.label}</strong><br>
      <label>
        <input type="checkbox" onchange="toggleDay(${childIndex}, '${day.id}', this, this.closest('.day-card'))">
        Select Day (£${CAMP.pricePerDay})
      </label><br>
      <label>
        <input type="checkbox" onchange="toggleWrap(${childIndex}, '${day.id}', this)">
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

// 📅 Toggle day
function toggleDay(childIndex, dayId, checkbox, element) {
  const child = children[childIndex];

  if (checkbox.checked) {
    child.selectedDays.add(dayId);
    element.classList.add("selected");
  } else {
    child.selectedDays.delete(dayId);
    element.classList.remove("selected");

    child.wrapDays.delete(dayId);
    const wrapCheckbox = element.querySelectorAll("input")[1];
    if (wrapCheckbox) wrapCheckbox.checked = false;
  }

  updateSummary();
}

// 🕒 Toggle wrap
function toggleWrap(childIndex, dayId, checkbox) {
  const child = children[childIndex];

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
    let base = child.selectedDays.size === CAMP.fullWeekDays ? CAMP.fullWeekPrice : child.selectedDays.size * CAMP.pricePerDay;
    let wrap = child.wrapDays.size * CAMP.wrapPrice;
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

    div.innerHTML = `<strong>${child.name || "Child " + (index + 1)}</strong><br>
                     Days: ${child.selectedDays.size} | Wrap: ${child.wrapDays.size}`;

    summaryDiv.appendChild(div);
  });

  const totalEl = document.getElementById("totalPrice");
  if (totalEl) totalEl.innerText = `Total: £${calculateTotal()}`;
}

// 🧾 Child Details Form
function renderChildDetailsForm(bookingData) {
  const container = document.getElementById("childDetailsContainer");
  container.innerHTML = ""; // clear previous

  bookingData.children.forEach((child, index) => {
    const div = document.createElement("div");
    div.className = "child-details-card";

    div.innerHTML = `
      <h3>Child ${index + 1}: ${child.name || ""}</h3>

      <!-- Dietary Info -->
      <label>Is there any dietary information we should be aware of?</label>
      <select id="dietary-${index}">
        <option value="">Select</option>
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>
      <textarea id="dietaryDetails-${index}" placeholder="Please provide full details" style="display:none;"></textarea>

      <!-- Allergies / Medical Conditions -->
      <label>Does your child have any known allergies or medical conditions?</label>
      <select id="allergies-${index}">
        <option value="">Select</option>
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>
      <textarea id="allergiesDetails-${index}" placeholder="Please provide full details" style="display:none;"></textarea>

      <!-- Behaviour / SEN / Disabilities -->
      <label>Is there anything else we need to know about your child? (e.g., Behavioural, SEN, Disabilities)</label>
      <select id="other-${index}">
        <option value="">Select</option>
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>
      <textarea id="otherDetails-${index}" placeholder="Please provide full details" style="display:none;"></textarea>

      <!-- Safeguarding -->
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

    // Conditional textareas
    ["dietary", "allergies", "other", "safeguarding"].forEach(field => {
      setupConditionalTextarea(index, field);
    });
  });
}

// Show/hide textarea if Yes selected
function setupConditionalTextarea(index, field) {
  const selectEl = document.getElementById(`${field}-${index}`);
  const textEl = document.getElementById(`${field}Details-${index}`);

  selectEl.addEventListener("change", (e) => {
    if (e.target.value === "Yes") {
      textEl.style.display = "block";
    } else {
      textEl.style.display = "none";
      textEl.value = "";
    }
  });

document.getElementById("submitChildDetails").addEventListener("click", () => {
  let valid = true;
  let errorMessages = [];

  children.forEach((child, index) => {
    const name = child.name.trim();
    const age = child.age;
    
    // Check child name
    if (!name) {
      valid = false;
      errorMessages.push(`Please enter a name for Child ${index + 1}`);
    }

    // Check age
    if (!age) {
      valid = false;
      errorMessages.push(`Please enter an age for Child ${index + 1}`);
    }

    // Check dietary select
    const dietary = document.getElementById(`dietary-${index}`).value;
    const dietaryDetails = document.getElementById(`dietaryDetails-${index}`).value.trim();
    if (!dietary) {
      valid = false;
      errorMessages.push(`Please answer dietary info for Child ${index + 1}`);
    } else if (dietary === "Yes" && !dietaryDetails) {
      valid = false;
      errorMessages.push(`Please provide dietary details for Child ${index + 1}`);
    }

    // Check allergies select
    const allergies = document.getElementById(`allergies-${index}`).value;
    const allergiesDetails = document.getElementById(`allergiesDetails-${index}`).value.trim();
    if (!allergies) {
      valid = false;
      errorMessages.push(`Please answer allergies/medical info for Child ${index + 1}`);
    } else if (allergies === "Yes" && !allergiesDetails) {
      valid = false;
      errorMessages.push(`Please provide allergy/medical details for Child ${index + 1}`);
    }

    // Check behavioural/SEN details (only if Yes is selected)
    const other = document.getElementById(`other-${index}`).value;
    const otherDetails = document.getElementById(`otherDetails-${index}`).value.trim();
    if (other === "Yes" && !otherDetails) {
      valid = false;
      errorMessages.push(`Please provide behavioural/SEN info for Child ${index + 1}`);
    }

    // Check safeguarding details (only if Yes is selected)
    const safeguarding = document.getElementById(`safeguarding-${index}`).value;
    const safeguardingDetails = document.getElementById(`safeguardingDetails-${index}`).value.trim();
    if (safeguarding === "Yes" && !safeguardingDetails) {
      valid = false;
      errorMessages.push(`Please provide safeguarding info for Child ${index + 1}`);
    }
  });

  // Check media consent checkbox
  const consent = document.getElementById("mediaConsent").checked;
  if (!consent) {
    valid = false;
    errorMessages.push("Please agree to the media consent");
  }

  if (!valid) {
    alert(errorMessages.join("\n"));
    return;
  }

  // ✅ If all valid, proceed
  console.log("All child details validated, ready to submit!");
  alert("All details completed! Proceeding to payment...");
});
}