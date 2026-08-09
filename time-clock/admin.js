const TOKEN_KEY = "mmha_admin_token";

let selectedPeriodDate = null;
let displayedPeriod = null;
let currentPayrollData = null;
let currentEmployeesData = null;

let selectedTimeRecordsEmployeeId = null;

/* ==========================================================
   ELEMENTS
========================================================== */

const loginSection =
  document.getElementById("loginSection");

const dashboardSection =
  document.getElementById("dashboardSection");

const payrollView =
  document.getElementById("payrollView");

const employeesView =
  document.getElementById("employeesView");

const payrollNavButton =
  document.getElementById("payrollNavButton");

const employeesNavButton =
  document.getElementById("employeesNavButton");

const loginForm =
  document.getElementById("adminLoginForm");

const usernameInput =
  document.getElementById("adminUsername");

const passwordInput =
  document.getElementById("adminPassword");

const loginButton =
  document.getElementById("adminLoginButton");

const loginMessage =
  document.getElementById("loginMessage");

const logoutButton =
  document.getElementById("logoutButton");

const refreshButton =
  document.getElementById("refreshPayrollButton");

const refreshEmployeesButton =
  document.getElementById("refreshEmployeesButton");

const previousPeriodButton =
  document.getElementById("previousPeriodButton");

const currentPeriodButton =
  document.getElementById("currentPeriodButton");

const nextPeriodButton =
  document.getElementById("nextPeriodButton");

const printButton =
  document.getElementById("printPayrollButton");

const exportButton =
  document.getElementById("exportExcelButton");

const addManualShiftButton =
  document.getElementById("addManualShiftButton");
const addManualShiftModal = document.getElementById("addManualShiftModal");
const closeAddManualShiftModalButton = document.getElementById("closeAddManualShiftModalButton");
const cancelAddManualShiftButton = document.getElementById("cancelAddManualShiftButton");
const addManualShiftForm = document.getElementById("addManualShiftForm");
const manualShiftEmployee = document.getElementById("manualShiftEmployee");
const manualShiftClinic = document.getElementById("manualShiftClinic");
const manualShiftDate = document.getElementById("manualShiftDate");
const manualShiftClockIn = document.getElementById("manualShiftClockIn");
const manualShiftClockOut = document.getElementById("manualShiftClockOut");
const manualShiftNotes = document.getElementById("manualShiftNotes");
const manualShiftPeriodText = document.getElementById("manualShiftPeriodText");
const saveManualShiftButton = document.getElementById("saveManualShiftButton");
const addManualShiftMessage = document.getElementById("addManualShiftMessage");

const payPeriodText =
  document.getElementById("payPeriodText");

const payDateText =
  document.getElementById("payDateText");

const employeeCount =
  document.getElementById("totalEmployees");

const totalHours =
  document.getElementById("totalHours");

const grossPayroll =
  document.getElementById("totalGrossPay");

const missingPunchCount =
  document.getElementById("missingPunchCount");

const payrollTableBody =
  document.getElementById("payrollTableBody");

const footerTotalHours =
  document.getElementById("footerTotalHours");

const footerTotalGross =
  document.getElementById("footerTotalGross");

const missingPunchList =
  document.getElementById("missingPunchList");

const dashboardMessage =
  document.getElementById("dashboardMessage");

const employeesTableBody =
  document.getElementById("employeesTableBody");

const employeesTotalCount =
  document.getElementById("employeesTotalCount");

const activeEmployeesCount =
  document.getElementById("activeEmployeesCount");

const inactiveEmployeesCount =
  document.getElementById("inactiveEmployeesCount");

const employeesMessage =
  document.getElementById("employeesMessage");

/* TIME RECORDS MODAL */

const timeRecordsModal =
  document.getElementById("timeRecordsModal");

const closeTimeRecordsModalButton =
  document.getElementById(
    "closeTimeRecordsModalButton"
  );

const timeRecordsEmployeeText =
  document.getElementById(
    "timeRecordsEmployeeText"
  );

const timeRecordsTableBody =
  document.getElementById(
    "timeRecordsTableBody"
  );

const timeRecordsMessage =
  document.getElementById(
    "timeRecordsMessage"
  );

const exportTimeRecordsButton =
  document.getElementById(
    "exportTimeRecordsButton"
  );

const printTimeRecordsButton =
  document.getElementById(
    "printTimeRecordsButton"
  );

/* ADD EMPLOYEE MODAL */

const addEmployeeButton =
document.getElementById(
"addEmployeeButton"
);

const addEmployeeModal =
document.getElementById(
"addEmployeeModal"
);

const closeAddEmployeeModalButton =
document.getElementById(
"closeAddEmployeeModalButton"
);

const cancelAddEmployeeButton =
document.getElementById(
"cancelAddEmployeeButton"
);

const addEmployeeForm =
document.getElementById(
"addEmployeeForm"
);

const addEmployeeMessage =
document.getElementById(
"addEmployeeMessage"
);

const newEmployeeId =
document.getElementById(
"newEmployeeId"
);

const newEmployeeName =
document.getElementById(
"newEmployeeName"
);

const newEmployeePassword =
document.getElementById(
"newEmployeePassword"
);

const newEmployeeHourlyRate =
document.getElementById(
"newEmployeeHourlyRate"
);

const newEmployeeHireDate =
document.getElementById(
"newEmployeeHireDate"
);

const saveEmployeeButton =
document.getElementById(
"saveEmployeeButton"
);
const newEmployeeActive =
  document.getElementById(
    "newEmployeeActive"
  );

const newEmployeeMustChangePassword =
  document.getElementById(
    "newEmployeeMustChangePassword"
  );

const newEmployeeNotes =
  document.getElementById(
    "newEmployeeNotes"
  );
/* EDIT TIME RECORD MODAL */

const editTimeRecordModal =
  document.getElementById(
    "editTimeRecordModal"
  );

const closeEditTimeRecordModalButton =
  document.getElementById(
    "closeEditTimeRecordModalButton"
  );

const cancelEditTimeRecordButton =
  document.getElementById(
    "cancelEditTimeRecordButton"
  );

const editTimeRecordForm =
  document.getElementById(
    "editTimeRecordForm"
  );

const editTimeRecordPageId =
  document.getElementById(
    "editTimeRecordPageId"
  );

const editTimeRecordEmployeeText =
  document.getElementById(
    "editTimeRecordEmployeeText"
  );

const editWorkClinic =
  document.getElementById("editWorkClinic");

const editClockIn =
  document.getElementById("editClockIn");

const editClockOut =
  document.getElementById("editClockOut");

const editTimeRecordNotes =
  document.getElementById(
    "editTimeRecordNotes"
  );

const saveTimeRecordButton =
  document.getElementById(
    "saveTimeRecordButton"
  );

const editTimeRecordMessage =
  document.getElementById(
    "editTimeRecordMessage"
  );

/* ==========================================================
   TOKEN
========================================================== */

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {
  localStorage.setItem(
    TOKEN_KEY,
    token
  );
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/* ==========================================================
   VIEWS
========================================================== */

function showLogin() {
  closeAllModals();

  loginSection.hidden = false;
  loginSection.classList.remove(
    "hidden"
  );

  dashboardSection.hidden = true;
  dashboardSection.classList.add(
    "hidden"
  );

  passwordInput.value = "";
  loginMessage.textContent = "";
}

function showDashboard() {
  loginSection.hidden = true;
  loginSection.classList.add(
    "hidden"
  );

  dashboardSection.hidden = false;
  dashboardSection.classList.remove(
    "hidden"
  );
}

function showPayrollView() {
  payrollView.classList.remove(
    "hidden"
  );

  employeesView.classList.add(
    "hidden"
  );

  payrollNavButton.classList.add(
    "active"
  );

  employeesNavButton.classList.remove(
    "active"
  );
}

function showEmployeesView() {
  payrollView.classList.add(
    "hidden"
  );

  employeesView.classList.remove(
    "hidden"
  );

  payrollNavButton.classList.remove(
    "active"
  );

  employeesNavButton.classList.add(
    "active"
  );
}

/* ==========================================================
   MESSAGES
========================================================== */

function setLoginMessage(
  message,
  isError = false
) {
  loginMessage.textContent = message;

  loginMessage.classList.toggle(
    "error",
    isError
  );
}

function setDashboardMessage(
  message,
  isError = false
) {
  dashboardMessage.textContent =
    message;

  dashboardMessage.classList.toggle(
    "error",
    isError
  );
}

function setEmployeesMessage(
  message,
  isError = false
) {
  employeesMessage.textContent =
    message;

  employeesMessage.classList.toggle(
    "error",
    isError
  );
}

function setTimeRecordsMessage(
  message,
  isError = false
) {
  timeRecordsMessage.textContent =
    message;

  timeRecordsMessage.classList.toggle(
    "error",
    isError
  );
}

function setEditTimeRecordMessage(
  message,
  isError = false
) {
  editTimeRecordMessage.textContent =
    message;

  editTimeRecordMessage.classList.toggle(
    "error",
    isError
  );
}

/* ==========================================================
   FORMATTING
========================================================== */

function formatCurrency(value) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD"
    }
  ).format(
    Number(value || 0)
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(
    Number(value || 0)
  );
}

function formatDate(dateString) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(
    `${dateString}T12:00:00`
  );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  ).format(date);
}

function formatDateTime(dateString) {
  if (!dateString) {
    return "—";
  }

  const date =
    new Date(dateString);

  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "America/Chicago",

      month: "short",
      day: "numeric",
      year: "numeric",

      hour: "numeric",
      minute: "2-digit"
    }
  ).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
Converts an ISO timestamp into the format required by
<input type="datetime-local">, displayed in Central Time.
*/

function isoToCentralInputValue(
  isoString
) {
  if (!isoString) {
    return "";
  }

  const date =
    new Date(isoString);

  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    return "";
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Chicago",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit",

        hour12: false
      }
    ).formatToParts(date);

  const values = {};

  parts.forEach((part) => {
    if (
      part.type !== "literal"
    ) {
      values[part.type] =
        part.value;
    }
  });

  /*
  Some browsers may represent midnight as hour 24.
  datetime-local requires hour 00.
  */

  const hour =
    values.hour === "24"
      ? "00"
      : values.hour;

  return (
    `${values.year}-` +
    `${values.month}-` +
    `${values.day}T` +
    `${hour}:` +
    `${values.minute}`
  );
}

function localInputToIso(
  localValue
) {
  if (!localValue) {
    return null;
  }

  const date =
    new Date(localValue);

  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

/* ==========================================================
   DATE HELPERS
========================================================== */

function addDaysToDate(
  dateString,
  numberOfDays
) {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  date.setDate(
    date.getDate() +
      numberOfDays
  );

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function setPeriodButtonsDisabled(
  disabled
) {
  previousPeriodButton.disabled =
    disabled;

  currentPeriodButton.disabled =
    disabled;

  nextPeriodButton.disabled =
    disabled;

  refreshButton.disabled =
    disabled;
}

/* ==========================================================
   API
========================================================== */

async function adminLogin(
  username,
  password
) {
  const response = await fetch(
    "/api/admin-login",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        username,
        password
      })
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to sign in"
    );
  }

  return data;
}

async function fetchPayroll(
  requestedDate = null
) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  let endpoint =
    "/api/payroll";

  if (requestedDate) {
    endpoint +=
      `?date=${encodeURIComponent(
        requestedDate
      )}`;
  }

  const response = await fetch(
    endpoint,
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`
      }
    }
  );

  const data =
    await response.json();

  if (
    response.status === 401
  ) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to load payroll"
    );
  }

  return data;
}

async function fetchEmployees() {
  const token = getToken();

  if (!token) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  const response = await fetch(
    "/api/employees",
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`
      }
    }
  );

  const data =
    await response.json();

  if (
    response.status === 401
  ) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to load employees"
    );
  }

  return data;
}
async function updateEmployeeStatus(
  payload
) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  const response = await fetch(
    "/api/employee-status",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`
      },

      body:
        JSON.stringify(payload)
    }
  );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const data =
    contentType.includes(
      "application/json"
    )
      ? await response.json()
      : {
          error:
            await response.text()
        };

  if (response.status === 401) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to update employee status."
    );
  }

  return data;
}
async function resetEmployeePassword(
  payload
) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  const response = await fetch(
    "/api/employee-password-reset",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`
      },

      body:
        JSON.stringify(payload)
    }
  );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const data =
    contentType.includes(
      "application/json"
    )
      ? await response.json()
      : {
          error:
            await response.text()
        };

  if (
    response.status === 401
  ) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to reset password."
    );
  }

  return data;
}
async function createEmployee(
  payload
) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  const response = await fetch(
    "/api/employee-save",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`
      },

      body:
        JSON.stringify(payload)
    }
  );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const data =
    contentType.includes(
      "application/json"
    )
      ? await response.json()
      : {
          error:
            await response.text()
        };

  if (
    response.status === 401
  ) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to create employee."
    );
  }

  return data;
}
async function updateTimeRecord(
  payload
) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  const response = await fetch(
    "/api/time-record-update",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`
      },

      body:
        JSON.stringify(payload)
    }
  );

  const data =
    await response.json();

  if (
    response.status === 401
  ) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to correct the time record"
    );
  }

  return data;
}

async function createManualShift(payload) {
  const token = getToken();
  if (!token) throw new Error("UNAUTHORIZED");
  const response = await fetch("/api/time-record-update", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...payload, action: "createManual" })
  });
  const data = await response.json();
  if (response.status === 401) throw new Error("UNAUTHORIZED");
  if (!response.ok) throw new Error(data.error || "Unable to add the manual shift.");
  return data;
}

function openAddManualShiftModal() {
  const employees = Array.isArray(currentPayrollData?.employees) ? currentPayrollData.employees : [];
  if (!displayedPeriod.start || !displayedPeriod.end) {
    setDashboardMessage("Load a payroll period before adding a manual shift.", true);
    return;
  }
  manualShiftEmployee.innerHTML = employees
    .map((e) => `<option value="${escapeHtml(String(e.employeeId))}">${escapeHtml(e.employeeName)} — ${escapeHtml(String(e.employeeId))}</option>`)
    .join("");
  manualShiftClinic.value = "Goliad";
  manualShiftDate.min = displayedPeriod.start;
  manualShiftDate.max = displayedPeriod.end;
  manualShiftDate.value = displayedPeriod.start;
  manualShiftClockIn.value = "09:00";
  manualShiftClockOut.value = "19:00";
  manualShiftNotes.value = "Pre-Time Clock / Manual Entry";
  manualShiftPeriodText.textContent = `${formatDate(displayedPeriod.start)} – ${formatDate(displayedPeriod.end)}`;
  addManualShiftMessage.textContent = "";
  addManualShiftMessage.classList.remove("error");
  addManualShiftModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeAddManualShiftModal() {
  addManualShiftModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

/* ==========================================================
   PAYROLL RENDERING
========================================================== */

function renderPayrollRows(
  employees
) {
  payrollTableBody.innerHTML = "";

  if (
    !Array.isArray(employees) ||
    employees.length === 0
  ) {
    payrollTableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="empty-state"
        >
          No employees found.
        </td>
      </tr>
    `;

    return;
  }

  employees.forEach(
    (employee) => {
      const row =
        document.createElement("tr");

      const recordCount =
        Array.isArray(
          employee.records
        )
          ? employee.records.length
          : 0;

      row.innerHTML = `
        <td>
          ${escapeHtml(
            employee.employeeName
          )}
        </td>

        <td>
          ${escapeHtml(
            employee.employeeId
          )}
        </td>

        <td>
          ${formatNumber(
            employee.totalHours
          )}
        </td>

        <td>
          ${formatCurrency(
            employee.hourlyRate
          )}
        </td>

        <td>
          ${formatCurrency(
            employee.grossPay
          )}
        </td>

        <td>
          <button
            type="button"
            class="secondary-button view-records-button"
            data-employee-id="${escapeHtml(
              employee.employeeId
            )}"
          >
            View Records (${recordCount})
          </button>
        </td>
      `;

      payrollTableBody.appendChild(
        row
      );
    }
  );
}

function renderMissingPunches(
  employees
) {
  missingPunchList.innerHTML = "";

  const punches = [];

  employees.forEach(
    (employee) => {
      const employeePunches =
        Array.isArray(
          employee.missingPunches
        )
          ? employee.missingPunches
          : [];

      employeePunches.forEach(
        (record) => {
          punches.push({
            employeeId:
              employee.employeeId,

            employeeName:
              employee.employeeName,

            ...record
          });
        }
      );
    }
  );

  if (punches.length === 0) {
    missingPunchList.innerHTML = `
      <p class="empty-state">
        No missing punches found.
      </p>
    `;

    return;
  }

  punches.forEach(
    (record) => {
      const item =
        document.createElement("div");

      item.className =
        "missing-punch-item";

      item.innerHTML = `
        <div>
          <strong>
            ${escapeHtml(
              record.employeeName
            )}
          </strong>

          <span>
            Employee ID:
            ${escapeHtml(
              record.employeeId
            )}
          </span>
        </div>

        <div>
          <span>
            Work Date:
            ${formatDate(
              record.workDate
            )}
          </span>

          <span>
            Clock In:
            ${formatDateTime(
              record.clockIn
            )}
          </span>

          <span>
            Clock Out:
            ${formatDateTime(
              record.clockOut
            )}
          </span>
        </div>
      `;

      missingPunchList.appendChild(
        item
      );
    }
  );
}

function renderPayroll(data) {
  currentPayrollData = data;

  const period =
    data.period || {};

  const totals =
    data.totals || {};

  const employees =
    Array.isArray(data.employees)
      ? data.employees
      : [];

  displayedPeriod = {
    start: period.start,
    end: period.end,
    payDate: period.payDate
  };

  payPeriodText.textContent =
    `${formatDate(
      period.start
    )} – ${formatDate(
      period.end
    )}`;

  payDateText.textContent =
    `Pay Date: ${formatDate(
      period.payDate
    )}`;

  employeeCount.textContent =
    totals.employees || 0;

  totalHours.textContent =
    formatNumber(
      totals.totalHours
    );

  grossPayroll.textContent =
    formatCurrency(
      totals.grossPayroll
    );

  missingPunchCount.textContent =
    totals.missingPunches || 0;

  footerTotalHours.textContent =
    formatNumber(
      totals.totalHours
    );

  footerTotalGross.textContent =
    formatCurrency(
      totals.grossPayroll
    );

  renderPayrollRows(employees);
  renderMissingPunches(employees);
}

/* ==========================================================
   EMPLOYEE DIRECTORY
========================================================== */

function renderEmployees(data) {
  currentEmployeesData = data;

  const employees =
    Array.isArray(data.employees)
      ? data.employees
      : [];

  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.active === true
    );

  const inactiveEmployees =
    employees.filter(
      (employee) =>
        employee.active !== true
    );

  employeesTotalCount.textContent =
    employees.length;

  activeEmployeesCount.textContent =
    activeEmployees.length;

  inactiveEmployeesCount.textContent =
    inactiveEmployees.length;

  employeesTableBody.innerHTML = "";

  if (employees.length === 0) {
    employeesTableBody.innerHTML = `
      <tr>
        <td
          colspan="8"
          class="empty-state"
        >
          No employees have been added yet.
        </td>
      </tr>
    `;

    return;
  }

  employees.forEach(
    (employee) => {
      const row =
        document.createElement("tr");

      const statusClass =
        employee.active
          ? "status-active"
          : "status-inactive";

      const statusText =
        employee.active
          ? "Active"
          : "Inactive";

      const passwordClass =
        employee.mustChangePassword
          ? "password-pending"
          : "password-current";

      const passwordText =
        employee.mustChangePassword
          ? "Change Required"
          : "Current";

     row.innerHTML = `
  <td>
    ${escapeHtml(employee.id)}
  </td>

  <td>
    ${escapeHtml(employee.name)}
  </td>

  <td>
    ${formatCurrency(employee.rate)}
  </td>

  <td>
    ${formatDate(employee.hireDate)}
  </td>

  <td>
    <span class="status-badge ${statusClass}">
      ${statusText}
    </span>
  </td>

  <td>
    <span class="status-badge ${passwordClass}">
      ${passwordText}
    </span>
  </td>

<td>
  <div class="employee-actions">

    <button
      type="button"
      class="secondary-button reset-password-button"
      data-page-id="${escapeHtml(
        employee.pageId
      )}"
      data-name="${escapeHtml(
        employee.name
      )}"
    >
      Reset Password
    </button>

    <button
      type="button"
      class="secondary-button employee-status-button ${
        employee.active
          ? "deactivate-button"
          : "activate-button"
      }"
      data-page-id="${escapeHtml(
        employee.pageId
      )}"
      data-name="${escapeHtml(
        employee.name
      )}"
      data-active="${
        employee.active
          ? "true"
          : "false"
      }"
    >
      ${
        employee.active
          ? "Deactivate Employee"
          : "Activate Employee"
      }
    </button>

  </div>
</td>
 
`;

      employeesTableBody.appendChild(
        row
      );
    }
  );
}

/* ==========================================================
   ADD EMPLOYEE MODAL
========================================================== */

function openAddEmployeeModal() {

  addEmployeeForm.reset();

  addEmployeeMessage.textContent = "";

  newEmployeeHireDate.value =
    new Date()
      .toISOString()
      .slice(0,10);

  addEmployeeModal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );
}

function closeAddEmployeeModal() {
  addEmployeeModal.classList.add(
    "hidden"
  );

  addEmployeeForm.reset();

  addEmployeeMessage.textContent = "";

  if (
    resetPasswordModal.classList.contains(
      "hidden"
    ) &&
    timeRecordsModal.classList.contains(
      "hidden"
    ) &&
    editTimeRecordModal.classList.contains(
      "hidden"
    )
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

function openResetPasswordModal(
  pageId,
  employeeName
) {
  resetPasswordForm.reset();

  resetPasswordPageId.value =
    pageId;

  resetPasswordEmployeeText.textContent =
    employeeName;

  requirePasswordChange.checked =
    true;

  resetPasswordMessage.textContent =
    "";

  resetPasswordModal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );

  resetPasswordValue.focus();
}

function closeResetPasswordModal() {
  resetPasswordModal.classList.add(
    "hidden"
  );

  resetPasswordForm.reset();

  resetPasswordPageId.value = "";

  resetPasswordEmployeeText.textContent =
    "";

  resetPasswordMessage.textContent =
    "";

  if (
    addEmployeeModal.classList.contains(
      "hidden"
    ) &&
    timeRecordsModal.classList.contains(
      "hidden"
    ) &&
    editTimeRecordModal.classList.contains(
      "hidden"
    )
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

/* ==========================================================
   TIME RECORD MODALS
========================================================== */

function findPayrollEmployee(
  employeeId
) {
  const employees =
    Array.isArray(
      currentPayrollData?.employees
    )
      ? currentPayrollData.employees
      : [];

  return employees.find(
    (employee) =>
      String(employee.employeeId) ===
      String(employeeId)
  );
}

function findTimeRecord(
  pageId
) {
  const employee =
    findPayrollEmployee(
      selectedTimeRecordsEmployeeId
    );

  const records =
    Array.isArray(employee?.records)
      ? employee.records
      : [];

  return records.find(
    (record) =>
      String(record.id) ===
      String(pageId)
  );
}

function openTimeRecordsModal(
  employeeId
) {
  const employee =
    findPayrollEmployee(employeeId);

  if (!employee) {
    setDashboardMessage(
      "Employee payroll records could not be found.",
      true
    );

    return;
  }

  selectedTimeRecordsEmployeeId =
    String(employee.employeeId);

  timeRecordsEmployeeText.textContent =
    `${employee.employeeName} — Employee ID: ${employee.employeeId}`;

  setTimeRecordsMessage("");

  renderTimeRecordsTable(
    employee
  );

  timeRecordsModal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );
}

function closeTimeRecordsModal() {
  timeRecordsModal.classList.add(
    "hidden"
  );

  if (
    editTimeRecordModal.classList.contains(
      "hidden"
    )
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

function renderTimeRecordsTable(
  employee
) {
  timeRecordsTableBody.innerHTML = "";

  const records =
    Array.isArray(employee.records)
      ? [...employee.records]
      : [];

  records.sort((a, b) =>
    String(b.workDate || "")
      .localeCompare(
        String(a.workDate || "")
      )
  );

  if (records.length === 0) {
    timeRecordsTableBody.innerHTML = `
      <tr>
        <td
          colspan="8"
          class="empty-state"
        >
          No time records were found for this employee
          in the selected pay period.
        </td>
      </tr>
    `;

    return;
  }

  records.forEach((record) => {
    const row =
      document.createElement("tr");

    row.innerHTML = `
      <td>
        ${formatDate(
          record.workDate
        )}
      </td>

      <td>
        ${escapeHtml(record.workClinic || "Unassigned")}
      </td>

      <td>
        ${formatDateTime(
          record.clockIn
        )}
      </td>

      <td>
        ${formatDateTime(
          record.clockOut
        )}
      </td>

      <td>
        ${
          record.hoursWorked === null ||
          record.hoursWorked === undefined
            ? "—"
            : formatNumber(
                record.hoursWorked
              )
        }
      </td>

      <td>
  ${
    record.grossPay === null ||
    record.grossPay === undefined
      ? "—"
      : formatCurrency(
          record.grossPay
        )
  }
</td>

<td class="correction-notes-cell">
  ${record.employeeNote ? escapeHtml(record.employeeNote) : "—"}
</td>

<td class="correction-notes-cell">
  ${
    record.notes
      ? escapeHtml(record.notes)
      : "—"
  }
</td>

<td>
  <button
    type="button"
    class="secondary-button edit-record-button"
    data-page-id="${escapeHtml(
      record.id
    )}"
  >
    Edit
  </button>
</td>
    `;

    timeRecordsTableBody.appendChild(
      row
    );
  });
}

function getSelectedTimeRecordsEmployee() {
  return findPayrollEmployee(
    selectedTimeRecordsEmployeeId
  );
}

function getSortedTimeRecords(employee) {
  const records =
    Array.isArray(employee?.records)
      ? [...employee.records]
      : [];

  return records.sort((a, b) =>
    String(b.workDate || "").localeCompare(
      String(a.workDate || "")
    )
  );
}

function timeRecordCsvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportSelectedTimeRecords() {
  const employee = getSelectedTimeRecordsEmployee();

  if (!employee) {
    setTimeRecordsMessage(
      "Employee time records could not be found.",
      true
    );
    return;
  }

  const rows = [[
    "Work Date",
    "Clinic",
    "Clock In",
    "Clock Out",
    "Hours",
    "Gross Pay",
    "Employee Note",
    "Correction Notes"
  ]];

  getSortedTimeRecords(employee).forEach((record) => {
    rows.push([
      formatDate(record.workDate),
      record.workClinic || "Unassigned",
      formatDateTime(record.clockIn),
      formatDateTime(record.clockOut),
      record.hoursWorked ?? "",
      record.grossPay ?? "",
      record.employeeNote || "",
      record.notes || ""
    ]);
  });

  const csv = rows
    .map((row) => row.map(timeRecordCsvValue).join(","))
    .join("\r\n");
  const blob = new Blob(
    ["\uFEFF", csv],
    { type: "text/csv;charset=utf-8" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeEmployeeId = String(employee.employeeId)
    .replace(/[^a-z0-9_-]+/gi, "-");
  const startDate = displayedPeriod?.start || "records";
  const endDate = displayedPeriod?.end || "";

  link.href = url;
  link.download =
    `employee-${safeEmployeeId}-time-records-${startDate}-${endDate}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  setTimeRecordsMessage("CSV file downloaded successfully.");
}

function printSelectedTimeRecords() {
  const employee = getSelectedTimeRecordsEmployee();

  if (!employee) {
    setTimeRecordsMessage(
      "Employee time records could not be found.",
      true
    );
    return;
  }

  const records = getSortedTimeRecords(employee);
  const tableRows = records.length
    ? records.map((record) => `
        <tr>
          <td>${formatDate(record.workDate)}</td>
          <td>${escapeHtml(record.workClinic || "Unassigned")}</td>
          <td>${formatDateTime(record.clockIn)}</td>
          <td>${formatDateTime(record.clockOut)}</td>
          <td>${record.hoursWorked == null ? "—" : formatNumber(record.hoursWorked)}</td>
          <td>${record.grossPay == null ? "—" : formatCurrency(record.grossPay)}</td>
          <td>${escapeHtml(record.employeeNote || "—")}</td>
          <td>${escapeHtml(record.notes || "—")}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="8">No time records available.</td></tr>';
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    setTimeRecordsMessage(
      "Please allow pop-ups to print these records.",
      true
    );
    return;
  }

  printWindow.document.write(`<!doctype html>
    <html><head><meta charset="utf-8"><title>Employee Time Records</title>
    <style>
      body{font-family:Arial,sans-serif;color:#172033;margin:32px}h1{margin:0 0 6px;font-size:24px}
      p{margin:0 0 24px;color:#52627a}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{padding:10px 8px;border:1px solid #dbe3ef;text-align:left;vertical-align:top}
      th{background:#eef5ff;color:#173b85}@page{size:landscape;margin:12mm}
    </style></head><body>
    <h1>Employee Time Records</h1>
    <p>${escapeHtml(employee.employeeName)} — Employee ID: ${escapeHtml(employee.employeeId)}</p>
    <table><thead><tr><th>Work Date</th><th>Clinic</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Gross Pay</th><th>Employee Note</th><th>Correction Notes</th></tr></thead>
    <tbody>${tableRows}</tbody></table></body></html>`);
  printWindow.document.close();
  printWindow.addEventListener("load", () => {
    printWindow.focus();
    printWindow.print();
  });
}

function openEditTimeRecordModal(
  pageId
) {
  const employee =
    findPayrollEmployee(
      selectedTimeRecordsEmployeeId
    );

  const record =
    findTimeRecord(pageId);

  if (!employee || !record) {
    setTimeRecordsMessage(
      "The selected time record could not be found.",
      true
    );

    return;
  }

  editTimeRecordPageId.value =
    record.id;

  editTimeRecordEmployeeText.textContent =
    `${employee.employeeName} — ${formatDate(
      record.workDate
    )}`;

  editWorkClinic.value =
    record.workClinic || "";

  editClockIn.value =
    isoToCentralInputValue(
      record.clockIn
    );

  editClockOut.value =
    isoToCentralInputValue(
      record.clockOut
    );

  editTimeRecordNotes.value =
    record.notes || "";

  setEditTimeRecordMessage("");

  editTimeRecordModal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );
}

function closeEditTimeRecordModal() {
  editTimeRecordModal.classList.add(
    "hidden"
  );

  editTimeRecordForm.reset();

  editTimeRecordPageId.value = "";

  setEditTimeRecordMessage("");

  if (
    timeRecordsModal.classList.contains(
      "hidden"
    )
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

function closeAllModals() {
  timeRecordsModal.classList.add(
    "hidden"
  );

  editTimeRecordModal.classList.add(
    "hidden"
  );

  document.body.classList.remove(
    "modal-open"
  );

  selectedTimeRecordsEmployeeId =
    null;
}

/* ==========================================================
   LOADERS
========================================================== */

async function loadDashboard(
  requestedDate = selectedPeriodDate
) {
  setDashboardMessage(
    "Loading payroll..."
  );

  setPeriodButtonsDisabled(true);

  try {
    const data =
      await fetchPayroll(
        requestedDate
      );

    selectedPeriodDate =
      requestedDate;

    renderPayroll(data);

    setDashboardMessage(
      "Payroll updated."
    );
  } catch (error) {
    console.error(error);

    if (
      error.message ===
      "UNAUTHORIZED"
    ) {
      handleExpiredSession();
      return;
    }

    setDashboardMessage(
      error.message,
      true
    );
  } finally {
    setPeriodButtonsDisabled(false);
  }
}

async function loadEmployees() {
  setEmployeesMessage(
    "Loading employees..."
  );

  refreshEmployeesButton.disabled =
    true;

  try {
    const data =
      await fetchEmployees();

    renderEmployees(data);

    setEmployeesMessage(
      "Employee directory updated."
    );
  } catch (error) {
    console.error(error);

    if (
      error.message ===
      "UNAUTHORIZED"
    ) {
      handleExpiredSession();
      return;
    }

    setEmployeesMessage(
      error.message,
      true
    );
  } finally {
    refreshEmployeesButton.disabled =
      false;
  }
}

function handleExpiredSession() {
  removeToken();

  selectedPeriodDate = null;
  displayedPeriod = null;
  currentPayrollData = null;
  currentEmployeesData = null;
  selectedTimeRecordsEmployeeId = null;

  showLogin();

  setLoginMessage(
    "Your session expired. Please sign in again.",
    true
  );
}

/* ==========================================================
   LOGIN
========================================================== */

loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const username =
      usernameInput.value.trim();

    const password =
      passwordInput.value;

    if (
      !username ||
      !password
    ) {
      setLoginMessage(
        "Enter the username and password.",
        true
      );

      return;
    }

    setLoginMessage(
      "Signing in..."
    );

    loginButton.disabled = true;

    try {
      const data =
        await adminLogin(
          username,
          password
        );

      saveToken(data.token);

      selectedPeriodDate = null;
      displayedPeriod = null;
      currentEmployeesData = null;

      showDashboard();
      showPayrollView();

      await loadDashboard(null);
    } catch (error) {
      console.error(error);

      setLoginMessage(
        error.message,
        true
      );
    } finally {
      loginButton.disabled = false;
    }
  }
);

/* ==========================================================
   NAVIGATION
========================================================== */

payrollNavButton.addEventListener(
  "click",
  () => {
    showPayrollView();

    if (!currentPayrollData) {
      loadDashboard(
        selectedPeriodDate
      );
    }
  }
);

employeesNavButton.addEventListener(
  "click",
  () => {
    showEmployeesView();

    if (!currentEmployeesData) {
      loadEmployees();
    }
  }
);

logoutButton.addEventListener(
  "click",
  () => {
    removeToken();

    selectedPeriodDate = null;
    displayedPeriod = null;
    currentPayrollData = null;
    currentEmployeesData = null;
    selectedTimeRecordsEmployeeId = null;

    showLogin();
  }
);

/* ==========================================================
   PAYROLL BUTTONS
========================================================== */

refreshButton.addEventListener(
  "click",
  () => {
    loadDashboard(
      selectedPeriodDate
    );
  }
);

refreshEmployeesButton.addEventListener(
  "click",
  () => {
    loadEmployees();
  }
);

previousPeriodButton.addEventListener(
  "click",
  () => {
    if (!displayedPeriod?.start) {
      return;
    }

    const previousDate =
      addDaysToDate(
        displayedPeriod.start,
        -1
      );

    selectedPeriodDate =
      previousDate;

    loadDashboard(
      previousDate
    );
  }
);

nextPeriodButton.addEventListener(
  "click",
  () => {
    if (!displayedPeriod?.end) {
      return;
    }

    const nextDate =
      addDaysToDate(
        displayedPeriod.end,
        1
      );

    selectedPeriodDate =
      nextDate;

    loadDashboard(
      nextDate
    );
  }
);

currentPeriodButton.addEventListener(
  "click",
  () => {
    selectedPeriodDate = null;

    loadDashboard(null);
  }
);

/* ==========================================================
   ADD EMPLOYEE BUTTONS
========================================================== */

addEmployeeButton.addEventListener(
  "click",
  openAddEmployeeModal
);

closeAddEmployeeModalButton.addEventListener(
  "click",
  closeAddEmployeeModal
);

cancelAddEmployeeButton.addEventListener(
  "click",
  closeAddEmployeeModal
);

addEmployeeModal.addEventListener(
  "click",
  (event) => {

    if (event.target === addEmployeeModal) {

      closeAddEmployeeModal();

    }

  }
);
/* ==========================================================
   RESET PASSWORD BUTTONS
========================================================== */

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        ".reset-password-button"
      );

    if (!button) {
      return;
    }

    openResetPasswordModal(
      button.dataset.pageId,
      button.dataset.name
    );

  }
);

closeResetPasswordModalButton.addEventListener(
  "click",
  closeResetPasswordModal
);

cancelResetPasswordButton.addEventListener(
  "click",
  closeResetPasswordModal
);

resetPasswordModal.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
      resetPasswordModal
    ) {
      closeResetPasswordModal();
    }

  }
);




/* ==========================================================

   EMPLOYEE STATUS BUTTONS

========================================================== */

document.addEventListener(

  "click",

  async (event) => {

    const button =

      event.target.closest(

        ".employee-status-button"

      );

    if (!button) {

      return;

    }

    const pageId =

      button.dataset.pageId;

    const employeeName =

      button.dataset.name;

    const isCurrentlyActive =

      button.dataset.active === "true";

    const newActiveStatus =

      !isCurrentlyActive;

    const actionText =

      newActiveStatus

        ? "activate"

        : "deactivate";

    const confirmed =

      window.confirm(

        `Are you sure you want to ${actionText} ${employeeName}?`

      );

    if (!confirmed) {

      return;

    }

    button.disabled = true;

    setEmployeesMessage(

      newActiveStatus

        ? "Activating employee..."

        : "Deactivating employee..."

    );

    try {

      const data =

        await updateEmployeeStatus({

          pageId,

          active: newActiveStatus

        });

      currentEmployeesData = null;

      await loadEmployees();

      setEmployeesMessage(

        data.message ||

          (

            newActiveStatus

              ? "Employee activated successfully."

              : "Employee deactivated successfully."

          )

      );

    } catch (error) {

      console.error(error);

      if (

        error.message ===

        "UNAUTHORIZED"

      ) {

        handleExpiredSession();

        return;

      }

      setEmployeesMessage(

        error.message,

        true

      );

    } finally {

      button.disabled = false;

    }

  }

);
/* ==========================================================
   TIME RECORD BUTTONS
========================================================== */

payrollTableBody.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        ".view-records-button"
      );

    if (!button) {
      return;
    }

    openTimeRecordsModal(
      button.dataset.employeeId
    );
  }
);

timeRecordsTableBody.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        ".edit-record-button"
      );

    if (!button) {
      return;
    }

    openEditTimeRecordModal(
      button.dataset.pageId
    );
  }
);

closeTimeRecordsModalButton.addEventListener(
  "click",
  closeTimeRecordsModal
);

exportTimeRecordsButton.addEventListener(
  "click",
  exportSelectedTimeRecords
);

printTimeRecordsButton.addEventListener(
  "click",
  printSelectedTimeRecords
);

closeEditTimeRecordModalButton.addEventListener(
  "click",
  closeEditTimeRecordModal
);

cancelEditTimeRecordButton.addEventListener(
  "click",
  closeEditTimeRecordModal
);

timeRecordsModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      timeRecordsModal
    ) {
      closeTimeRecordsModal();
    }
  }
);

editTimeRecordModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      editTimeRecordModal
    ) {
      closeEditTimeRecordModal();
    }
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (
      !editTimeRecordModal.classList.contains(
        "hidden"
      )
    ) {
      closeEditTimeRecordModal();
      return;
    }

    if (
      !timeRecordsModal.classList.contains(
        "hidden"
      )
    ) {
      closeTimeRecordsModal();
    }
  }
);

/* ==========================================================
   SAVE RESET PASSWORD
========================================================== */

resetPasswordForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const pageId =
      resetPasswordPageId.value.trim();

    const newPassword =
      resetPasswordValue.value;

    const requirePasswordChangeValue =
      requirePasswordChange.checked;

    if (!pageId) {
      resetPasswordMessage.textContent =
        "Employee page ID is missing.";

      resetPasswordMessage.classList.add(
        "error"
      );

      return;
    }

    if (newPassword.length < 8) {
      resetPasswordMessage.textContent =
        "The new password must contain at least 8 characters.";

      resetPasswordMessage.classList.add(
        "error"
      );

      return;
    }

    saveResetPasswordButton.disabled =
      true;

    resetPasswordMessage.textContent =
      "Saving password...";

    resetPasswordMessage.classList.remove(
      "error"
    );

    try {
      await resetEmployeePassword({
        pageId,
        newPassword,
        requirePasswordChange:
          requirePasswordChangeValue
      });

      closeResetPasswordModal();

      currentEmployeesData = null;

      await loadEmployees();

      setEmployeesMessage(
        "Employee password reset successfully."
      );
    } catch (error) {
      console.error(error);

      if (
        error.message ===
        "UNAUTHORIZED"
      ) {
        handleExpiredSession();
        return;
      }

      resetPasswordMessage.textContent =
        error.message;

      resetPasswordMessage.classList.add(
        "error"
      );
    } finally {
      saveResetPasswordButton.disabled =
        false;
    }
  }
);
/* ==========================================================
   SAVE NEW EMPLOYEE
========================================================== */

addEmployeeForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const employeeId =
      newEmployeeId.value.trim();

    const name =
      newEmployeeName.value.trim();

    const hourlyRate =
      Number(
        newEmployeeHourlyRate.value
      );

    const hireDate =
      newEmployeeHireDate.value;

    const password =
      newEmployeePassword.value;

    const active =
      newEmployeeActive.checked;

    const mustChangePassword =
      newEmployeeMustChangePassword.checked;

    const notes =
      newEmployeeNotes.value.trim();

    if (
      !employeeId ||
      !name ||
      !Number.isFinite(hourlyRate) ||
      hourlyRate <= 0 ||
      password.length < 8
    ) {
      addEmployeeMessage.textContent =
        "Complete all required fields. The password must contain at least 8 characters.";

      addEmployeeMessage.classList.add(
        "error"
      );

      return;
    }

    saveEmployeeButton.disabled =
      true;

    addEmployeeMessage.textContent =
      "Creating employee...";

    addEmployeeMessage.classList.remove(
      "error"
    );

    try {
      await createEmployee({
        employeeId,
        name,
        hourlyRate,
        hireDate,
        password,
        active,
        mustChangePassword,
        notes
      });

      closeAddEmployeeModal();

      currentEmployeesData = null;

      await loadEmployees();

      setEmployeesMessage(
        "Employee created successfully."
      );
    } catch (error) {
      console.error(error);

      if (
        error.message ===
        "UNAUTHORIZED"
      ) {
        handleExpiredSession();
        return;
      }

      addEmployeeMessage.textContent =
        error.message;

      addEmployeeMessage.classList.add(
        "error"
      );
    } finally {
      saveEmployeeButton.disabled =
        false;
    }
  }
);
addManualShiftButton.addEventListener("click", openAddManualShiftModal);
closeAddManualShiftModalButton.addEventListener("click", closeAddManualShiftModal);
cancelAddManualShiftButton.addEventListener("click", closeAddManualShiftModal);
addManualShiftModal.addEventListener("click", (event) => {
  if (event.target === addManualShiftModal) closeAddManualShiftModal();
});

addManualShiftForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const workDate = manualShiftDate.value;
  if (!workDate || workDate < displayedPeriod.start || workDate > displayedPeriod.end) {
    addManualShiftMessage.textContent = "Work Date must be inside the displayed pay period.";
    addManualShiftMessage.classList.add("error");
    return;
  }
  const clockIn = localInputToIso(`${workDate}T${manualShiftClockIn.value}`);
  const clockOut = localInputToIso(`${workDate}T${manualShiftClockOut.value}`);
  if (!clockIn || !clockOut) {
    addManualShiftMessage.textContent = "Enter valid Clock In and Clock Out times.";
    addManualShiftMessage.classList.add("error");
    return;
  }
  saveManualShiftButton.disabled = true;
  addManualShiftMessage.textContent = "Saving manual shift...";
  addManualShiftMessage.classList.remove("error");
  try {
    await createManualShift({
      employeeId: manualShiftEmployee.value,
      workClinic: manualShiftClinic.value,
      workDate,
      clockIn,
      clockOut,
      notes: manualShiftNotes.value.trim()
    });
    closeAddManualShiftModal();
    await loadDashboard(selectedPeriodDate);
    setDashboardMessage("Manual shift added successfully.");
  } catch (error) {
    if (error.message === "UNAUTHORIZED") { handleExpiredSession(); return; }
    addManualShiftMessage.textContent = error.message;
    addManualShiftMessage.classList.add("error");
  } finally {
    saveManualShiftButton.disabled = false;
  }
});

/* ==========================================================
   SAVE TIME CORRECTION
========================================================== */

editTimeRecordForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const pageId =
      editTimeRecordPageId.value.trim();

    const clockIn =
      localInputToIso(
        editClockIn.value
      );

    const clockOut =
      editClockOut.value
        ? localInputToIso(
            editClockOut.value
          )
        : null;

    const notes =
      editTimeRecordNotes.value.trim();

    if (!pageId) {
      setEditTimeRecordMessage(
        "The time record ID is missing.",
        true
      );

      return;
    }

    if (!clockIn) {
      setEditTimeRecordMessage(
        "Enter a valid Clock In date and time.",
        true
      );

      return;
    }

    if (
      editClockOut.value &&
      !clockOut
    ) {
      setEditTimeRecordMessage(
        "Enter a valid Clock Out date and time.",
        true
      );

      return;
    }

    if (
      clockOut &&
      new Date(clockOut).getTime() <
        new Date(clockIn).getTime()
    ) {
      setEditTimeRecordMessage(
        "Clock Out cannot be before Clock In.",
        true
      );

      return;
    }

    saveTimeRecordButton.disabled =
      true;

    setEditTimeRecordMessage(
      "Saving correction..."
    );

    try {
      const workClinic =
        editWorkClinic.value.trim();

      if (!workClinic) {
        setEditTimeRecordMessage(
          "Select the clinic where this shift was worked.",
          true
        );

        return;
      }

      await updateTimeRecord({
        pageId,
        clockIn,
        clockOut,
        notes,
        workClinic
      });

      closeEditTimeRecordModal();

      await loadDashboard(
        selectedPeriodDate
      );

      const employee =
        findPayrollEmployee(
          selectedTimeRecordsEmployeeId
        );

      if (employee) {
        renderTimeRecordsTable(
          employee
        );

        setTimeRecordsMessage(
          "Time record corrected successfully."
        );
      } else {
        closeTimeRecordsModal();

        setDashboardMessage(
          "Time record corrected successfully."
        );
      }
    } catch (error) {
      console.error(error);

      if (
        error.message ===
        "UNAUTHORIZED"
      ) {
        handleExpiredSession();
        return;
      }

      setEditTimeRecordMessage(
        error.message,
        true
      );
    } finally {
      saveTimeRecordButton.disabled =
        false;
    }
  }
);

/* ==========================================================
   PRINT AND EXPORT
========================================================== */

printButton.addEventListener(
  "click",
  () => {
    window.print();
  }
);

exportButton.addEventListener(
  "click",
  () => {
    const rows = [
      [
        "Employee",
        "Employee ID",
        "Clinic",
        "Hours",
        "Hourly Rate",
        "Gross Pay"
      ]
    ];

    const employees =
      Array.isArray(
        currentPayrollData?.employees
      )
        ? currentPayrollData.employees
        : [];

    employees.forEach(
      (employee) => {
        const grouped = new Map();

        const records = Array.isArray(employee.records)
          ? employee.records
          : [];

        records.forEach((record) => {
          const clinic = record.workClinic || "Unassigned";
          const current = grouped.get(clinic) || { hours: 0, gross: 0 };
          current.hours += Number(record.hoursWorked || 0);
          current.gross += Number(record.grossPay || 0);
          grouped.set(clinic, current);
        });

        if (grouped.size === 0) {
          grouped.set("Unassigned", { hours: 0, gross: 0 });
        }

        grouped.forEach((totals, clinic) => {
          rows.push([
            employee.employeeName,
            employee.employeeId,
            clinic,
            formatNumber(Math.round(totals.hours * 100) / 100),
            formatCurrency(employee.hourlyRate),
            formatCurrency(Math.round(totals.gross * 100) / 100)
          ]);
        });
      }
    );

    const csv = rows
      .map(
        (row) =>
          row
            .map(
              (value) =>
                `"${String(value)
                  .replaceAll(
                    '"',
                    '""'
                  )}"`
            )
            .join(",")
      )
      .join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8"
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const startDate =
      displayedPeriod?.start ||
      "payroll";

    const endDate =
      displayedPeriod?.end ||
      "";

    link.href = url;

    link.download =
      `mmha-payroll-${startDate}-${endDate}.csv`;

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }
);

/* ==========================================================
   INITIALIZATION
========================================================== */

if (getToken()) {
  showDashboard();
  showPayrollView();
  loadDashboard(null);
} else {
  showLogin();
}
