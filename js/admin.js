/**
 * Файл: js/admin.js
 * Логика для Админ-панели Jastar Apartments.
 * Включает: Аутентификацию, загрузку, отображение и управление статусами заявок.
 */

// ===================================================================
// --- 1. НАСТРОЙКА SUPABASE (ВАШИ РЕАЛЬНЫЕ ДАННЫЕ) ---
// ===================================================================
const SUPABASE_URL = "https://vfignoxzqjjmghzsyyqr.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmaWdub3h6cWpqbWdoenN5eXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU4MTIsImV4cCI6MjA3NzQyMTgxMn0.1sRa8C4vnwYs3ll9CwExBJ6aoLwG924CUpKRWs7B_ww"; 
const TABLE_NAME = 'applications';

// Инициализация клиента Supabase
const { createClient } = window.supabase; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// ===================================================================


// Элементы DOM (Обновлены под новую структуру admin.html)
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const loginMessage = document.getElementById('login-message');
const tableBody = document.getElementById('applications-table-body');

// Настройки статусов
const STATUS_COLORS = {
    'Новая': 'bg-secondary/30 text-text_dark', // Используем secondary (желтый) для "Новая"
    'В обработке': 'bg-primary/30 text-primary',
    'Одобрена': 'bg-success/30 text-success',
    'Отклонена': 'bg-error/30 text-error',
};
const STATUS_OPTIONS = ["Новая", "В обработке", "Одобрена", "Отклонена"];


// --- 2. ЛОГИКА АВТОРИЗАЦИИ И ПЕРЕКЛЮЧЕНИЯ ЭКРАНОВ ---

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        showAdminPanel(session.user.email);
        loadApplications();
    } else {
        showLoginScreen();
    }
}

function showAdminPanel(email) {
    loginScreen.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    document.getElementById('admin-info').textContent = email; // Обновление email в хедере
}

function showLoginScreen() {
    adminPanel.classList.add('hidden');
    loginScreen.classList.remove('hidden');
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Используем 'email' и 'password' из нового admin.html
    const email = document.getElementById('email').value; 
    const password = document.getElementById('password').value;

    loginMessage.classList.add('hidden');
    const submitBtn = document.getElementById('login-button');
    submitBtn.textContent = 'Вход...';
    submitBtn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    submitBtn.textContent = 'Войти';
    submitBtn.disabled = false;

    if (error) {
        console.error('Ошибка входа Supabase:', error);
        loginMessage.textContent = '❌ Неверный email или пароль.';
        loginMessage.classList.remove('hidden');
    } else {
        // checkAuth вызовется через onAuthStateChange
    }
});

logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut();
    // checkAuth вызовется через onAuthStateChange
});

// Слушатель для автоматического обновления при входе/выходе
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        showAdminPanel(session.user.email);
        loadApplications();
    } else {
        showLoginScreen();
    }
});


// --- 3. ФУНКЦИИ ФОРМАТИРОВАНИЯ ---

function formatTimestamp(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function formatPhoneNumberForWhatsApp(phone) {
    let cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('8')) {
        cleanPhone = '7' + cleanPhone.substring(1);
    }
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('7')) {
         cleanPhone = '7' + cleanPhone;
    }
    return cleanPhone;
}


// --- 4. РАБОТА С ЗАЯВКАМИ И СТАТИСТИКОЙ ---

async function loadApplications() {
    tableBody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-500">Загрузка заявок...</td></tr>`;
    
    try {
        const { data: applications, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 1. Обновление статистики
        updateStatistics(applications);
        
        // 2. Рендеринг таблицы
        renderTable(applications);

    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        tableBody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-error">Не удалось загрузить данные: ${error.message}. Проверьте RLS.</td></tr>`;
    }
}

function updateStatistics(applications) {
    const total = applications.length;
    const newApps = applications.filter(a => a.status === 'Новая').length;
    const processedApps = applications.filter(a => a.status !== 'Новая').length; // Все, кроме "Новая"

    document.getElementById('total-applications').textContent = total;
    document.getElementById('new-applications').textContent = newApps;
    document.getElementById('processed-applications').textContent = processedApps;
}

function renderTable(applications) {
    tableBody.innerHTML = '';

    if (applications.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-500">Нет активных заявок.</td></tr>`;
        return;
    }

    applications.forEach(app => {
        const row = document.createElement('tr');
        // Обновлен класс для лучшей совместимости с новым темным admin.html
        row.className = 'hover:bg-gray-100 transition duration-150'; 
        
        const statusSelectOptions = STATUS_OPTIONS.map(status => 
            `<option value="${status}" ${app.status === status ? 'selected' : ''}>${status}</option>`
        ).join('');

        const waNumber = formatPhoneNumberForWhatsApp(app.phone);
        const waLink = `https://wa.me/${waNumber}`;

        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm text-text_dark">${formatTimestamp(app.created_at)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-text_dark">${app.name}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-text_dark">
                <a href="${waLink}" target="_blank" class="text-success hover:text-green-600 font-semibold flex items-center space-x-1 transition duration-300">
                    ${app.phone} 
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.77.56 3.44 1.55 4.88l-1.63 5.97 6.13-1.61c1.37.75 2.95 1.15 4.02 1.15h.06c5.46 0 9.9-4.44 9.9-9.9.01-5.46-4.43-9.9-9.89-9.9zm4.78 13.92s-.6.28-1.74.8c-.14.07-.38.16-.62.25-.83.29-1.92.35-3.05-.09-1.25-.49-2.2-1.42-2.82-2.58-.61-1.15-1.04-2.67-.18-3.79.6-.74 1.25-1.07 1.87-1.4.15-.08.3-.12.44-.12h.02c.38 0 .61.02.82.02.13 0 .33.02.66.86.33.84.85 2.11 1.05 2.53.2.42.33.51.57.87.24.36.4.38.64.18.91-.73 1.76-1.57 2.45-2.22.68-.65 1.34-1.27 1.8-1.55.45-.27.7-.42.94-.42.23 0 .38.07.47.11.23.11.49.25.68.42.19.16.29.35.34.46.04.1.08.21.08.34s-.1.4-.23.63c-.12.23-.74.84-.96 1.05-.22.2-.47.45-.47.88 0 .44.29.9.52 1.13.23.23.49.46.73.7.23.24.46.46.68.75.22.28.43.58.58.84.14.26.2.53.2.8 0 .3-.07.64-.19.92-.12.28-.27.5-.47.67s-.44.3-.76.43c-.32.13-.67.19-1.05.19z"/>
                        </svg>
                </a>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-text_dark">${app.room_type}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span id="status-${app.id}" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[app.status]}">
                    ${app.status}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 max-w-xs overflow-hidden truncate">${app.comment || '—'}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                <select data-id="${app.id}" onchange="updateApplicationStatus(this)" class="bg-gray-100 border border-border_light text-text_dark p-1 rounded-lg focus:ring-primary focus:border-primary">
                    ${statusSelectOptions}
                </select>
            </td>
        `;
        tableBody.appendChild(row);
    });
}


/**
 * Обновляет статус заявки.
 */
async function updateApplicationStatus(selectElement) {
    const id = selectElement.getAttribute('data-id');
    const newStatus = selectElement.value;
    const statusSpan = document.getElementById(`status-${id}`);

    selectElement.disabled = true;
    const originalStatusClass = statusSpan.className;
    statusSpan.textContent = 'Обновление...';
    statusSpan.className = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-500 text-white';

    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ status: newStatus })
            .eq('id', id)
            .select(); // Добавляем .select() для возврата данных и правильной работы RLS

        if (error) throw error;

        // После успешного обновления, перезагружаем всю таблицу, чтобы обновить статистику
        loadApplications();
        
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        alert('Ошибка при обновлении статуса. См. консоль.');
        statusSpan.className = originalStatusClass; 
        // Откатить выпадающее меню на предыдущее значение
        // Это сложнее без запоминания, поэтому лучше просто перезагрузить данные
        loadApplications(); 
    }
    
    selectElement.disabled = false;
}

// Запуск проверки авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', checkAuth);

// Глобальная функция для использования в onchange в HTML
window.updateApplicationStatus = updateApplicationStatus;
