// js/admin.js
const supabase = window.supabaseClient;
const TABLE_NAME = "applications";

// Элементы DOM
const loginScreen = document.getElementById("login-screen");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const loginMessage = document.getElementById("login-message");
const tableBody = document.getElementById("applications-table-body");
const adminInfo = document.getElementById("admin-info");

let applicationsChart = null;

// Проверка входа
async function checkAuth() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    showAdminPanel(data.session.user.email);
    loadApplications();
  } else {
    showLoginScreen();
  }
}

// Показ панелей
function showLoginScreen() {
  loginScreen.classList.remove("hidden");
  adminPanel.classList.add("hidden");
}
function showAdminPanel(email) {
  loginScreen.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  adminInfo.textContent = `Вход как: ${email}`;
}

// Авторизация
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  loginMessage.classList.add("hidden");

  const btn = document.getElementById("login-button");
  btn.textContent = "Вход...";
  btn.disabled = true;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  btn.textContent = "Войти";
  btn.disabled = false;

  if (error) {
    loginMessage.textContent = "❌ Неверный email или пароль.";
    loginMessage.classList.remove("hidden");
  }
});

// Выход
logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

// Отслеживание состояния входа
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN") {
    showAdminPanel(session.user.email);
    loadApplications();
  } else if (event === "SIGNED_OUT") {
    showLoginScreen();
  }
});

// === Заявки ===
async function loadApplications() {
  tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-500">Загрузка...</td></tr>`;
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-red-400">Ошибка загрузки</td></tr>`;
    return;
  }
  renderTable(data);
  updateStats(data);
  updateChart(data);
}

function renderTable(applications) {
  tableBody.innerHTML = "";
  if (applications.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-500">Нет заявок.</td></tr>`;
    return;
  }

  applications.forEach((app) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-[#1f2937] transition";
    row.innerHTML = `
      <td class="px-4 py-3 text-sm text-gray-400">${new Date(app.created_at).toLocaleString("ru-RU")}</td>
      <td class="px-4 py-3 text-sm">${app.name}</td>
      <td class="px-4 py-3 text-sm text-green-400"><a href="https://wa.me/${app.phone}" target="_blank">${app.phone}</a></td>
      <td class="px-4 py-3 text-sm text-gray-400">${app.room_type || "—"}</td>
      <td class="px-4 py-3 text-sm">${app.status}</td>
      <td class="px-4 py-3 text-sm text-gray-400">${app.comment || "—"}</td>
      <td class="px-4 py-3 text-sm">
        <select onchange="updateStatus('${app.id}', this.value)" class="bg-[#0d1117] border border-gray-700 text-white rounded px-2 py-1">
          <option${app.status === "Новая" ? " selected" : ""}>Новая</option>
          <option${app.status === "В обработке" ? " selected" : ""}>В обработке</option>
          <option${app.status === "Одобрена" ? " selected" : ""}>Одобрена</option>
          <option${app.status === "Отклонена" ? " selected" : ""}>Отклонена</option>
        </select>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function updateStatus(id, status) {
  const { error } = await supabase.from(TABLE_NAME).update({ status }).eq("id", id);
  if (error) console.error(error);
  else loadApplications();
}

function updateStats(applications) {
  document.getElementById("total-applications").textContent = applications.length;
  document.getElementById("new-applications").textContent = applications.filter(a => a.status === "Новая").length;
  document.getElementById("processed-applications").textContent = applications.filter(a => a.status !== "Новая").length;
}

// === График ===
function setupChart() {
  if (applicationsChart) applicationsChart.destroy();
  const ctx = document.getElementById("applicationsChart").getContext("2d");
  applicationsChart = new Chart(ctx, {
    type: "bar",
    data: { labels: [], datasets: [{ label: "Заявки", data: [], backgroundColor: "rgba(59,130,246,0.7)" }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
}

function updateChart(applications) {
  if (!applicationsChart) setupChart();
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    days[key] = 0;
  }
  applications.forEach(a => {
    const key = a.created_at.slice(0, 10);
    if (days[key] !== undefined) days[key]++;
  });
  applicationsChart.data.labels = Object.keys(days);
  applicationsChart.data.datasets[0].data = Object.values(days);
  applicationsChart.update();
}

// === Запуск ===
window.onload = function () {
  setupChart();
  checkAuth();
};
