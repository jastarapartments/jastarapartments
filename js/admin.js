// Файл: js/admin.js

// ===================================================================
// --- 1. НАСТРОЙКА SUPABASE (ВАШИ РЕАЛЬНЫЕ ДАННЫЕ) ---
// ===================================================================
const SUPABASE_URL = "https://vfignoxzqjjmghzsyyqr.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmaWdub3h6cWpqbWdoenN5eXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU4MTIsImV4cCI6MjA3NzQyMTgxMn0.1sRa8C4vnwYs3ll9CwExBJ6aoLwG924CUpKRWs7B_ww"; 

// Инициализация клиента Supabase (ИСПРАВЛЕННЫЙ СИНТАКСИС)
const { createClient } = window.supabase; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// ===================================================================


// Элементы DOM
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const loginMessage = document.getElementById('login-message');
const tableBody = document.getElementById('applications-table-body');
const noApplicationsMessage = document.getElementById('no-applications-message');

const STATUS_COLORS = {
    'Новая': 'bg-primary text-white',
    'В обработке': 'bg-secondary text-text_dark',
    'Одобрена': 'bg-success text-white',
    'Отклонена': 'bg-error text-white',
};
const STATUS_OPTIONS = ["Новая", "В обработке", "Одобрена", "Отклонена"];


// --- 2. ЛОГИКА АВТОРИЗАЦИИ (ТОЛЬКО ЧЕРЕЗ SUPABASE) ---

/**
 * Проверяет активную сессию Supabase.
 */
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        showDashboard();
        loadApplications();
    } else {
        showLogin();
    }
}

function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
}

function showLogin() {
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    loginMessage.classList.add('hidden');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Вход...';
    submitBtn.disabled = true;

    // РЕАЛЬНЫЙ ВХОД ЧЕРЕЗ SUPABASE.AUTH
    const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    submitBtn.textContent = 'Войти';
    submitBtn.disabled = false;

    if (error) {
        console.error('Ошибка входа Supabase:', error);
        loginMessage.textContent = '❌ Неверный email или пароль. Проверьте учетные данные и настройки Site URL.';
        loginMessage.classList.remove('hidden');
    } else {
        checkAuth(); 
    }
});

logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut();
    checkAuth();
});

// --- 3. РАБОТА С ЗАЯВКАМИ (SUPABASE) ---

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
 * Очищает номер телефона, оставляя только цифры, для ссылки WhatsApp.
 */
function formatPhoneNumberForWhatsApp(phone) {
    // Удаляем все, кроме цифр
    let cleanPhone = phone.replace(/[^\d]/g, '');
    
    // Если номер начинается с "8", меняем на "7" для международного формата
    if (cleanPhone.startsWith('8')) {
        cleanPhone = '7' + cleanPhone.substring(1);
    }
    
    // Если номер имеет длину 10 (например, 7071234567), добавляем 7, если его нет
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('7')) {
         cleanPhone = '7' + cleanPhone;
    }
    
    return cleanPhone;
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

        tableBody.innerHTML = ''; 
        noApplicationsMessage.classList.add('hidden');

        if (applications.length === 0) {
            noApplicationsMessage.classList.remove('hidden');
            return;
        }

        applications.forEach(app => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-800 transition duration-150';
            
            const statusSelect = STATUS_OPTIONS.map(status => 
                `<option value="${status}" ${app.status === status ? 'selected' : ''}>${status}</option>`
            ).join('');

            // --- ФОРМИРОВАНИЕ WHATSAPP ССЫЛКИ ---
            const waNumber = formatPhoneNumberForWhatsApp(app.phone);
            const waLink = `https://wa.me/${waNumber}`;

            // ИЗМЕНЕНИЕ ЗДЕСЬ: text-secondary (белый) по умолчанию, hover:text-success (зеленый) при наведении.
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${formatTimestamp(app.created_at)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">${app.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <a href="${waLink}" target="_blank" class="text-secondary hover:text-success font-bold flex items-center space-x-1 transition duration-300" title="Открыть в WhatsApp">
                        ${app.phone} 
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.77.56 3.44 1.55 4.88l-1.63 5.97 6.13-1.61c1.37.75 2.95 1.15 4.02 1.15h.06c5.46 0 9.9-4.44 9.9-9.9.01-5.46-4.43-9.9-9.89-9.9zm4.78 13.92s-.6.28-1.74.8c-.14.07-.38.16-.62.25-.83.29-1.92.35-3.05-.09-1.25-.49-2.2-1.42-2.82-2.58-.61-1.15-1.04-2.67-.18-3.79.6-.74 1.25-1.07 1.87-1.4.15-.08.3-.12.44-.12h.02c.38 0 .61.02.82.02.13 0 .33.02.66.86.33.84.85 2.11 1.05 2.53.2.42.33.51.57.87.24.36.4.38.64.18.91-.73 1.76-1.57 2.45-2.22.68-.65 1.34-1.27 1.8-1.55.45-.27.7-.42.94-.42.23 0 .38.07.47.11.23.11.49.25.68.42.19.16.29.35.34.46.04.1.08.21.08.34s-.1.4-.23.63c-.12.23-.74.84-.96 1.05-.22.2-.47.45-.47.88 0 .44.29.9.52 1.13.23.23.49.46.73.7.23.24.46.46.68.75.22.28.43.58.58.84.14.26.2.53.2.8 0 .3-.07.64-.19.92-.12.28-.27.5-.47.67s-.44.3-.76.43c-.32.13-.67.19-1.05.19z"/>
                        </svg>
                    </a>
                </td>
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
        tableBody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-error">Не удалось загрузить данные: ${error.message}. Проверьте RLS.</td></tr>`;
    }
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
            .from('applications')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;

        statusSpan.textContent = newStatus;
        statusSpan.className = `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[newStatus]}`;
        
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        alert('Ошибка при обновлении статуса. См. консоль.');
        statusSpan.className = originalStatusClass; 
        selectElement.value = selectElement.options[selectElement.selectedIndex].value;
    }
    
    selectElement.disabled = false;
}

// Запуск проверки авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', checkAuth);

// Глобальная функция
window.updateApplicationStatus = updateApplicationStatus;
