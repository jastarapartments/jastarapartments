import { supabase } from "./supabase.js";

// Модалки
window.openModal = (roomType = "") => {
  document.getElementById("applicationModal")?.classList.add("show");
  if (roomType) document.getElementById("roomType").value = roomType;
};

window.closeModal = () => {
  document.getElementById("applicationModal")?.classList.remove("show");
};

// Заявка
window.submitApplication = async (e) => {
  e.preventDefault();
  const data = {
    name: e.target.name.value,
    phone: e.target.phone.value,
    room_type: e.target.roomType.value,
    comment: e.target.comment.value,
    created_at: new Date(),
    status: "Новая"
  };
  const { error } = await supabase.from("applications").insert(data);
  if (error) alert("Ошибка: " + error.message);
  else {
    alert("✅ Заявка отправлена!");
    e.target.reset();
    closeModal();
  }
};

// Админка
window.adminLogin = async (e) => {
  e.preventDefault();
  const email = e.target.adminEmail.value;
  const password = e.target.adminPassword.value;
  if (email === "admin@jastar.kz" && password === "admin123") {
    loadApplications();
    document.getElementById("adminPanel").classList.add("show");
    document.getElementById("mainContent").classList.add("hide");
  } else alert("Неверный логин или пароль");
};

async function loadApplications() {
  const { data, error } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
  const tbody = document.getElementById("applicationsTable");
  if (error || !data?.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-400">Нет заявок</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(a => `
    <tr class="border-b border-gray-600">
      <td class="py-3 px-4">${a.name}</td>
      <td class="py-3 px-4">${a.phone}</td>
      <td class="py-3 px-4">${a.room_type}</td>
      <td class="py-3 px-4">${a.comment}</td>
      <td class="py-3 px-4">${new Date(a.created_at).toLocaleDateString()}</td>
      <td class="py-3 px-4 text-green-400">${a.status}</td>
    </tr>
  `).join("");
}

