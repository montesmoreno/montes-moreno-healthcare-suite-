const $ = (id) => document.getElementById(id);
const state = { token: sessionStorage.getItem("mmha_token"), employee: null, records: [], current: null, period: null };

const IDLE_LIMIT_MS = 5 * 60 * 1000;
const ACTIVITY_KEY = "mmha_employee_last_activity";
let idleTimer;
let sessionVersion = 0;

function requireActiveSession() {
  const lastActivity = Number(sessionStorage.getItem(ACTIVITY_KEY));
  const now = Date.now();
  if (!state.token || sessionStorage.getItem("mmha_token") !== state.token ||
      !Number.isFinite(lastActivity) || lastActivity <= 0 ||
      now < lastActivity || now - lastActivity >= IDLE_LIMIT_MS) {
    signOut();
    message($("loginMessage"), "Your session expired. Please sign in again. Your recorded work time has not changed.", "error");
    return false;
  }
  return true;
}

function scheduleIdleCheck() {
  clearTimeout(idleTimer);
  if (!state.token) return;
  const remaining = IDLE_LIMIT_MS - (Date.now() - Number(sessionStorage.getItem(ACTIVITY_KEY)));
  idleTimer = setTimeout(() => {
    if (requireActiveSession()) scheduleIdleCheck();
  }, Math.max(0, remaining));
}

function userActivity(event) {
  if (!event.isTrusted || !state.token) return;
  // Check the old deadline first: a late click must never revive a session.
  if (!requireActiveSession()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  scheduleIdleCheck();
}

for (const type of ["click", "touchstart", "keydown"]) {
  window.addEventListener(type, userActivity, { capture: true, passive: false });
}
function checkOnReturn() {
  if (state.token && requireActiveSession()) scheduleIdleCheck();
}
window.addEventListener("focus", checkOnReturn);
document.addEventListener("visibilitychange", checkOnReturn);

function message(el, text, type="") {
  el.className = `message ${type}`.trim();
  el.textContent = text;
}

function authHeaders() {
  if (!requireActiveSession()) throw new Error("Please sign in again.");
  return { "Content-Type": "application/json", "Authorization": `Bearer ${state.token}` };
}

async function api(path, options={}) {
  const authenticated = Boolean(options.headers?.Authorization);
  const version = sessionVersion;
  if (authenticated && !requireActiveSession()) throw new Error("Please sign in again.");
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  // A response from a signed-out employee must not restore the dashboard.
  if (authenticated && (version !== sessionVersion || !requireActiveSession())) {
    throw new Error("Session ended. Please sign in again.");
  }
  if (authenticated && response.status === 401) signOut();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" });
}
function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

function tick() {
  const now = new Date();
  $("currentDate").textContent = now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  $("currentTime").textContent = now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit"});
}

function render() {
  const r = state.current;
  $("welcomeName").textContent = `Welcome, ${state.employee?.name || ""}`;

  if (!r) {
    $("statusBadge").className = "badge out";
    $("statusBadge").textContent = "Clocked Out";
    $("clockInButton").disabled = false;
    $("clockOutButton").disabled = true;
    $("summaryArrival").textContent = "—";
    $("summaryIn").textContent = "—";
    $("summaryOut").textContent = "—";
    $("summaryHours").textContent = "0.00";
    $("lastAction").textContent = "No activity recorded today.";
  } else if (r.clockIn && !r.clockOut) {
    $("statusBadge").className = "badge in";
    $("statusBadge").textContent = "Clocked In";
    $("clockInButton").disabled = true;
    $("clockOutButton").disabled = false;
    $("summaryArrival").textContent = formatTime(r.actualClockIn);
    $("summaryIn").textContent = formatTime(r.clockIn);
    $("summaryOut").textContent = "—";
    $("summaryHours").textContent = "In progress";
    $("lastAction").textContent = `Arrived at ${formatTime(r.actualClockIn)}. Paid time starts at ${formatTime(r.clockIn)}.`;
  } else {
    $("statusBadge").className = "badge out";
    $("statusBadge").textContent = "Clocked Out";
    $("clockInButton").disabled = true;
    $("clockOutButton").disabled = true;
    $("summaryArrival").textContent = formatTime(r.actualClockIn);
    $("summaryIn").textContent = formatTime(r.clockIn);
    $("summaryOut").textContent = formatTime(r.clockOut);
    $("summaryHours").textContent = Number(r.hoursWorked || 0).toFixed(2);
    $("lastAction").textContent = `Clocked out at ${formatTime(r.clockOut)}`;
  }
  $("employeeNote").disabled = Boolean(r?.clockOut);
  if (r?.clockOut) $("employeeNote").value = "";

  if (state.period) {
    $("employeePayPeriod").textContent =
      `${formatDate(state.period.start)} – ${formatDate(state.period.end)}`;
    $("employeePayDate").textContent =
      `Payday: ${formatDate(state.period.payDate)}`;
  }

  $("recordsBody").innerHTML = state.records.length
    ? state.records.map(r => `<tr><td>${formatDate(r.workDate)}</td><td>${escapeHtml(r.workClinic || "Unassigned")}</td><td>${formatTime(r.actualClockIn)}</td><td>${formatTime(r.clockIn)}</td><td>${formatTime(r.clockOut)}</td><td>${r.hoursWorked == null ? "In progress" : Number(r.hoursWorked).toFixed(2)}</td><td>${escapeHtml(r.employeeNote || "—")}</td></tr>`).join("")
    : '<tr><td colspan="7">No records in this pay period.</td></tr>';
}

function showPasswordChange(employee) {
  state.employee = employee || state.employee;
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.add("hidden");
  $("passwordChangeView").classList.remove("hidden");
  $("newPassword").value = "";
  $("confirmNewPassword").value = "";
  message($("passwordChangeMessage"), "");
  $("newPassword").focus();
}

function signOut() {
  clearTimeout(idleTimer);
  sessionVersion += 1;
  sessionStorage.removeItem(ACTIVITY_KEY);
  sessionStorage.removeItem("mmha_token");
  state.token = null;
  state.employee = null;
  state.records = [];
  state.current = null;
  state.period = null;
  $("clockInButton").disabled = true;
  $("clockOutButton").disabled = true;
  $("employeeNote").value = "";
  $("newPassword").value = "";
  $("confirmNewPassword").value = "";
  $("recordsBody").innerHTML = "";
  $("clinicOptions").innerHTML = "";
  $("welcomeName").textContent = "";
  message($("actionMessage"), "");
  $("employeeId").value = "";
  $("password").value = "";
  $("passwordChangeView").classList.add("hidden");
  $("dashboardView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
  $("employeeId").focus();
}

async function loadDashboard() {
  const data = await api("/api/status", { headers: authHeaders() });
  state.employee = data.employee;
  if (data.mustChangePassword || data.employee?.mustChangePassword) {
    showPasswordChange(data.employee);
    return;
  }
  state.current = data.current;
  state.records = data.records;
  state.period = data.period || null;
  $("clinicOptions").innerHTML = (data.locations || []).map(c => `<label class="clinic-option"><input type="radio" name="workClinic" value="${escapeHtml(c.name)}" /><span>${escapeHtml(c.name)}</span></label>`).join("");
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  render();
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  message($("loginMessage"), "Signing in...");
  try {
    const data = await api("/api/login", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ employeeId:$("employeeId").value.trim(), password:$("password").value })
    });
    sessionVersion += 1;
    state.token = data.token;
    sessionStorage.setItem("mmha_token", data.token);
    sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    $("password").value = "";
    scheduleIdleCheck();
    if (data.employee?.mustChangePassword) showPasswordChange(data.employee);
    else await loadDashboard();
  } catch (error) {
    message($("loginMessage"), error.message, "error");
  }
});

$("passwordChangeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const newPassword = $("newPassword").value;
  const confirmPassword = $("confirmNewPassword").value;
  if (newPassword.length < 8) return message($("passwordChangeMessage"), "Password must contain at least 8 characters.", "error");
  if (newPassword !== confirmPassword) return message($("passwordChangeMessage"), "Passwords do not match.", "error");
  message($("passwordChangeMessage"), "Saving new password...");
  try {
    await api("/api/employee-password-reset", { method:"POST", headers:authHeaders(), body:JSON.stringify({ newPassword }) });
    message($("passwordChangeMessage"), "Password changed successfully.", "success");
    $("passwordChangeView").classList.add("hidden");
    await loadDashboard();
  } catch (error) {
    message($("passwordChangeMessage"), error.message, "error");
  }
});

$("passwordChangeLogoutButton").addEventListener("click", signOut);

$("clockInButton").addEventListener("click", async () => {

  const selectedClinic =
    document.querySelector(
      'input[name="workClinic"]:checked'
    );

  if (!selectedClinic) {
    message(
      $("actionMessage"),
      "Please select your work clinic.",
      "error"
    );
    return;
  }

  message(
    $("actionMessage"),
    "Recording clock-in..."
  );

  try {

    await api(
      "/api/clock-in",
      {
        method: "POST",

        headers: authHeaders(),

        body: JSON.stringify({
          workClinic:
            selectedClinic.value,
          employeeNote: $("employeeNote").value.trim()
        })
      }
    );

    await loadDashboard();
    $("employeeNote").value = "";

    message(
      $("actionMessage"),
      "Clock-in recorded.",
      "success"
    );

  } catch (error) {

    message(
      $("actionMessage"),
      error.message,
      "error"
    );

  }

});

$("clockOutButton").addEventListener("click", async () => {
  message($("actionMessage"), "Recording clock-out...");
  try {
    await api("/api/clock-out", { method:"POST", headers:authHeaders(), body:JSON.stringify({ employeeNote: $("employeeNote").value.trim() }) });
    await loadDashboard();
    $("employeeNote").value = "";
    message($("actionMessage"), "Clock-out recorded.", "success");
  } catch (error) { message($("actionMessage"), error.message, "error"); }
});

$("logoutButton").addEventListener("click", signOut);

tick();
setInterval(tick, 1000);
if (state.token && requireActiveSession()) {
  scheduleIdleCheck();
  loadDashboard().catch(() => signOut());
}

window.addEventListener(
  "pageshow",
  (event) => {
    /*
    If the browser restores this page from
    Back/Forward Cache, force a real reload.
    */

    if (event.persisted) {
      window.location.reload();
      return;
    }

    checkOnReturn();

    const savedToken =
      sessionStorage.getItem(
        "mmha_token"
      );

    if (!savedToken) {
      state.token = null;

      $("employeeId").value = "";
      $("password").value = "";

      $("dashboardView").classList.add(
        "hidden"
      );
      $("passwordChangeView").classList.add("hidden");

      $("loginView").classList.remove(
        "hidden"
      );

      $("employeeId").focus();
    }
  }
);
