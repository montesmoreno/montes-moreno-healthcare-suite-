const $ = (id) => document.getElementById(id);
const state = { token: sessionStorage.getItem("mmha_token"), employee: null, records: [], current: null, period: null };

function message(el, text, type="") {
  el.className = `message ${type}`.trim();
  el.textContent = text;
}

function authHeaders() {
  return { "Content-Type": "application/json", "Authorization": `Bearer ${state.token}` };
}

async function api(path, options={}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
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
    $("summaryIn").textContent = "—";
    $("summaryOut").textContent = "—";
    $("summaryHours").textContent = "0.00";
    $("lastAction").textContent = "No activity recorded today.";
  } else if (r.clockIn && !r.clockOut) {
    $("statusBadge").className = "badge in";
    $("statusBadge").textContent = "Clocked In";
    $("clockInButton").disabled = true;
    $("clockOutButton").disabled = false;
    $("summaryIn").textContent = formatTime(r.clockIn);
    $("summaryOut").textContent = "—";
    $("summaryHours").textContent = "In progress";
    $("lastAction").textContent = `Clocked in at ${formatTime(r.clockIn)}`;
  } else {
    $("statusBadge").className = "badge out";
    $("statusBadge").textContent = "Clocked Out";
    $("clockInButton").disabled = true;
    $("clockOutButton").disabled = true;
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
    ? state.records.map(r => `<tr><td>${formatDate(r.workDate)}</td><td>${escapeHtml(r.workClinic || "Unassigned")}</td><td>${formatTime(r.clockIn)}</td><td>${formatTime(r.clockOut)}</td><td>${r.hoursWorked == null ? "In progress" : Number(r.hoursWorked).toFixed(2)}</td><td>${escapeHtml(r.employeeNote || "—")}</td></tr>`).join("")
    : '<tr><td colspan="6">No records in this pay period.</td></tr>';
}

async function loadDashboard() {
  const [data, locationData] = await Promise.all([api("/api/status", { headers: authHeaders() }), api("/api/locations", { headers: authHeaders() })]);
  state.employee = data.employee;
  state.current = data.current;
  state.records = data.records;
  state.period = data.period || null;
  $("clinicOptions").innerHTML = (locationData.locations || []).map(c => `<label class="clinic-option"><input type="radio" name="workClinic" value="${escapeHtml(c.name)}" /><span>${escapeHtml(c.name)}</span></label>`).join("");
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
    state.token = data.token;
    sessionStorage.setItem("mmha_token", data.token);
    await loadDashboard();
  } catch (error) {
    message($("loginMessage"), error.message, "error");
  }
});

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

$("logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem("mmha_token");

  state.token = null;

  $("employeeId").value = "";
  $("password").value = "";

  $("dashboardView").classList.add("hidden");
  $("loginView").classList.remove("hidden");

  $("employeeId").focus();
});

tick();
setInterval(tick, 1000);
if (state.token) loadDashboard().catch(() => sessionStorage.removeItem("mmha_token"));

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

      $("loginView").classList.remove(
        "hidden"
      );

      $("employeeId").focus();
    }
  }
);
