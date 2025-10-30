// Файл: js/admin.js

// --- 1. НАСТРОЙКА SUPABASE (Используем те же ключи) ---
const SUPABASE_URL = "https://vfignoxzqjjmghzsyyqr.supabase.co"; // <-- Вставьте свой URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmaWdub3h6cWpqbWdoenN5eXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU4MTIsImV4cCI6MjA3NzQyMTgxMn0.1sRa8C4vnwYs3ll9CwExBJ6aoLwG924CUpKRWs7B_ww"; // <-- Вставьте свой публичный ANON KEY
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// ------------------------------------------------------------------

// Элементы DOM
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const loginMessage = document.getElementById('login-message');
const tableBody = document.getElementById('applications-table-body');
const noApplicationsMessage = document.getElementById('no-applications-message');

// Фиктивные данные для входа (для демо-версии)
const ADMIN_EMAIL = 'admin@jastar.kz';
const ADMIN_PASSWORD = 'admin123';
const AUTH_KEY = 'jastar_admin_logged_in';

const STATUS_COLORS = {
    'Новая': 'bg-primary text-white',
    'В обработке': 'bg-secondary text-text_dark',
    'Одобрена': 'bg-success text-white',
    'Отклонена': 'bg-error text-white',
};
const STATUS_OPTIONS = ["Новая", "В обработке", "Одобрена", "Отклонена"];


// --- 2. ЛОГИКА АВТОРИЗАЦИИ ---

/**
 * Проверяет, авторизован ли пользователь.
 */
function checkAuth() {
    if (localStorage.getItem(AUTH_KEY) === 'true') {
        showDashboard();
        loadApplications();
    } else {
        showLogin();
    }
}

/**
 * Отображает дашборд и скрывает форму входа.
 */
function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
}

/**
 * Отображает форму входа и скрывает дашборд.
 */
function showLogin() {
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    // Простая проверка (ТОЛЬКО ДЛЯ ДЕМО-ПРОЕКТА)
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        localStorage.setItem(AUTH_KEY, 'true');
        loginMessage.classList.add('hidden');
        checkAuth();
    } else {
        loginMessage.textContent = 'Неверный логин или пароль.';
        loginMessage.classList.remove('hidden');
    }
});

logoutButton.addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    checkAuth();
});

// --- 3. РАБОТА С ЗАЯВКАМИ (SUPABASE) ---

/**
 * Форматирует дату.
 * @param {string} isoDate - Дата в формате ISO.
 * @returns {string} - Отформатированная дата.
 */
function formatTimestamp(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/**
 * Загружает все заявки из Supabase и отображает их.
 */
async function loadApplications() {
    tableBody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-gray-500">Загрузка заявок...</td></tr>`;
    
    try {
        const { data: applications, error } = await supabase
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        tableBody.innerHTML = ''; // Очистка
        noApplicationsMessage.classList.add('hidden');

        if (applications.length === 0) {
            noApplicationsMessage.classList.remove('hidden');
            return;
        }

        applications.forEach(app => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-800 transition duration-150';
            
            // Выпадающий список для статуса
            const statusSelect = STATUS_OPTIONS.map(status => 
                `<option value="${status}" ${app.status === status ? 'selected' : ''}>${status}</option>`
            ).join('');

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${formatTimestamp(app.created_at)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">${app.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300"><a href="tel:${app.phone}" class="text-primary hover:text-secondary">${app.phone}</a></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">${app.room_type}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span id="status-${app.id}" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[app.status]}">
                        ${app.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-400 max-w-xs overflow-hidden truncate">${app.comment || '—'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <select data-id="${app.id}" onchange="updateApplicationStatus(this)" class="bg-gray-700 border border-gray-600 text-white p-1 rounded-lg focus:ring-secondary focus:border-secondary">
                        ${statusSelect}
                    </select>
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-error">Не удалось загрузить данные: ${error.message}</td></tr>`;
    }
}

/**
 * Обновляет статус заявки в Supabase.
 * @param {HTMLSelectElement} selectElement - Выпадающий список, вызвавший изменение.
 */
async function updateApplicationStatus(selectElement) {
    const id = selectElement.getAttribute('data-id');
    const newStatus = selectElement.value;
    const statusSpan = document.getElementById(`status-${id}`);

    // Блокировка и визуальный фидбек
    selectElement.disabled = true;
    const originalStatusClass = statusSpan.className;
    statusSpan.textContent = 'Обновление...';
    statusSpan.className = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-500 text-white';

    try {
        const { error } = await supabase
            .from('applications')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;

        // Успех
        statusSpan.textContent = newStatus;
        statusSpan.className = `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[newStatus]}`;
        
    } catch (error) {
        // Ошибка
        console.error('Ошибка обновления статуса:', error);
        alert('Ошибка при обновлении статуса. См. консоль.');
        statusSpan.className = originalStatusClass; // Возвращаем старый класс
        statusSpan.textContent = selectElement.options[selectElement.selectedIndex].text; // Оставляем старый статус
        selectElement.value = selectElement.options[0].value; // Сброс выбора
    }
    
    selectElement.disabled = false;
}

// Запуск проверки авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', checkAuth);

// Глобальная функция для доступа из HTML
window.updateApplicationStatus = updateApplicationStatus;
