/**
 * Файл: admin.js
 * Логика для Админ-панели Jastar Apartments.
 * Включает: Аутентификацию, загрузку, отображение и управление статусами заявок, а также график Chart.js.
 */

// ===================================================================
// --- 1. НАСТРОЙКА SUPABASE ---
// ВАЖНО: Замените эти значения на ваши реальные ключи Supabase!
// ===================================================================
const SUPABASE_URL = "https://vfignoxzqjjmghzsyyqr.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmaWdub3h6cWpqbWdoenN5eXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU4MTIsImV4cCI6MjA3NzQyMTgxMn0.1sRa8C4vnwYs3ll9CwExBJ6aoLwG924CUpKRWs7B_ww"; 
const TABLE_NAME = 'applications';

const { createClient } = window.supabase; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// ===================================================================

// Элементы DOM 
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const loginMessage = document.getElementById('login-message');
const tableBody = document.getElementById('applications-table-body');
const adminInfo = document.getElementById('admin-info');

let applicationsChart = null; // Переменная для хранения экземпляра Chart.js

// Настройки статусов (Цвета адаптированы под ТЕМНЫЙ фон)
const STATUS_COLORS = {
    'Новая': 'bg-secondary/20 text-secondary', // Желтый текст на полупрозрачном фоне
    'В обработке': 'bg-primary/20 text-primary',
    'Одобрена': 'bg-success/20 text-success',
    'Отклонена': 'bg-error/20 text-error',
};
const STATUS_OPTIONS = ["Новая", "В обработке", "Одобрена", "Отклонена"];


// --- 2. ЛОГИКА АВТОРИЗАЦИИ И ПЕРЕКЛЮЧЕНИЯ ЭКРАНОВ ---

async function checkAuth() {
    // Проверяем, есть ли активная сессия пользователя
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
    adminInfo.textContent = `Вход как: ${email}`;
}

function showLoginScreen() {
    adminPanel.classList.add('hidden');
    loginScreen.classList.remove('hidden');
}

// Обработчик формы входа
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
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
    }
});

// Обработчик кнопки выхода
logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut();
});

// Слушатель для автоматического обновления при входе/выходе
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        showAdminPanel(session.user.email);
        loadApplications();
    } else if (event === 'SIGNED_OUT') {
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
    // Очищает номер и добавляет код страны 7, если необходимо (для Казахстана/РФ)
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
    tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-500">Загрузка заявок...</td></tr>`;
    
    try {
        // Загружаем все заявки, сортируем по дате создания
        const { data: applications, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Обновление статистики и рендеринг
        updateStatistics(applications);
        renderTable(applications);

        // Обновление графика
        updateChart(applications);

    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-error">Не удалось загрузить данные: ${error.message}. Проверьте RLS.</td></tr>`;
    }
}

function updateStatistics(applications) {
    const total = applications.length;
    const newApps = applications.filter(a => a.status === 'Новая').length;
    // Считаем "Обработанными" все, кроме "Новая"
    const processedApps = applications.filter(a => a.status !== 'Новая').length; 

    document.getElementById('total-applications').textContent = total;
    document.getElementById('new-applications').textContent = newApps;
    document.getElementById('processed-applications').textContent = processedApps;
}

function renderTable(applications) {
    tableBody.innerHTML = '';

    if (applications.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-500">Нет активных заявок.</td></tr>`;
        return;
    }

    applications.forEach(app => {
        const row = document.createElement('tr');
        // Используем dark_bg для hover эффекта (чуть темнее, чем card_bg)
        row.className = 'hover:bg-dark_bg transition duration-150'; 
        
        // Создаем опции для выпадающего списка статусов
        const statusSelectOptions = STATUS_OPTIONS.map(status => 
            `<option value="${status}" ${app.status === status ? 'selected' : ''}>${status}</option>`
        ).join('');

        const waNumber = formatPhoneNumberForWhatsApp(app.phone);
        const waLink = `https://wa.me/${waNumber}`;

        const statusClasses = STATUS_COLORS[app.status] || 'bg-gray-700 text-gray-300';
        const comment = app.comment || '—';


        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-400">${formatTimestamp(app.created_at)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">${app.name}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                <a href="${waLink}" target="_blank" class="text-success hover:text-green-400 font-semibold flex items-center space-x-1 transition duration-300">
                    ${app.phone} 
                    <!-- Иконка WhatsApp SVG -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.77.56 3.44 1.55 4.88l-1.63 5.97 6.13-1.61c1.37.75 2.95 1.15 4.02 1.15h.06c5.46 0 9.9-4.44 9.9-9.9.01-5.46-4.43-9.9-9.89-9.9zm4.78 13.92s-.6.28-1.74.8c-.14.07-.38.16-.62.25-.83.29-1.92.35-3.05-.09-1.25-.49-2.2-1.42-2.82-2.58-.61-1.15-1.04-2.67-.18-3.79.6-.74 1.25-1.07 1.87-1.4.15-.08.3-.12.44-.12.5.01.81.09 1.05.37.28.32.74 1.84.81 1.96.06.12.1.26.02.43-.09.18-.14.26-.26.38-.1.1-.19.19-.28.28-.27.27-.6.54-.5.86.13.43.51.84.85 1.22.37.41.69.75 1.11 1.01.44.27.76.43 1.03.54.34.13.72.06 1.05-.25.32-.3.6-.68.86-.92.27-.24.52-.3.84-.1.32.18 1.92.89 2.22 1.05.3.16.5.24.43.43-.09.21-.4.8-.46.89z"/>
                    </svg>
                </a>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-secondary">${app.room_type || 'Не указан'}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusClasses}" id="status-${app.id}">
                    ${app.status}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title="${comment}">${comment}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                <select data-id="${app.id}" onchange="updateApplicationStatus(this)"
                        class="bg-card_bg border border-border_light text-white p-1 rounded-lg text-sm focus:ring-primary focus:border-primary">
                    ${statusSelectOptions}
                </select>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// --- 5. ОБНОВЛЕНИЕ СТАТУСА ---

/**
 * Обновляет статус заявки и перезагружает данные для обновления статистики и графика.
 */
async function updateApplicationStatus(selectElement) {
    const id = selectElement.getAttribute('data-id');
    const newStatus = selectElement.value;
    const statusSpan = document.getElementById(`status-${id}`);

    selectElement.disabled = true;
    
    // Визуальный индикатор обновления
    const originalText = statusSpan.textContent;
    const originalClasses = statusSpan.className;
    statusSpan.textContent = 'Обновление...';
    statusSpan.className = 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-700 text-white';

    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ status: newStatus })
            .eq('id', id)
            .select();

        if (error) throw error;

        // После успешного обновления, перезагружаем всю таблицу, чтобы обновить статистику и график
        loadApplications();
        console.log(`Статус заявки ${id} обновлен на: ${newStatus}`);
        
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        alert('Ошибка при обновлении статуса. См. консоль.'); 
        
        // Откат UI на случай ошибки
        statusSpan.textContent = originalText;
        statusSpan.className = originalClasses;
        
        // Перезагрузка для синхронизации с базой
        loadApplications(); 
    } finally {
        selectElement.disabled = false;
    }
}


// --- 6. ЛОГИКА ГРАФИКА CHART.JS ---

function setupChart() {
    // Уничтожаем предыдущий экземпляр, если он существует
    if (applicationsChart) {
        applicationsChart.destroy();
    }
    const ctx = document.getElementById('applicationsChart').getContext('2d');
    applicationsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [], 
            datasets: [{
                label: 'Заявки за день',
                data: [], 
                backgroundColor: 'rgba(59, 130, 246, 0.7)', // Primary color
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    // Настройки для темной темы
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#E5E7EB' }
                },
                x: {
                    // Настройки для темной темы
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#E5E7EB' }
                }
            },
            plugins: {
                legend: {
                    display: false // Скрываем легенду, так как набор данных один
                }
            }
        }
    });
}

function updateChart(applications) {
    if (!applicationsChart) {
        setupChart();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const counts = {};
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const labels = [];
    const data = [];

    // Инициализируем 7 последних дней
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateKey = date.toISOString().slice(0, 10);
        
        labels.push(dayNames[date.getDay()] + ' ' + (date.getMonth() + 1) + '/' + date.getDate());
        counts[dateKey] = 0;
    }

    // Подсчитываем заявки
    applications.forEach(app => {
        const appDate = new Date(app.created_at);
        const dateKey = appDate.toISOString().slice(0, 10);
        if (counts.hasOwnProperty(dateKey)) {
            counts[dateKey]++;
        }
    });

    // Заполняем массив данных в правильном порядке (от самого старого дня к текущему)
    Object.keys(counts).sort().forEach(key => {
        data.push(counts[key]);
    });

    // Обновляем Chart.js
    applicationsChart.data.labels = labels;
    applicationsChart.data.datasets[0].data = data;
    applicationsChart.update();
}

// --- 7. ЗАПУСК ПРИЛОЖЕНИЯ ---

window.onload = function() {
    setupChart(); // Сначала настраиваем график
    checkAuth();  // Затем проверяем авторизацию и загружаем данные
};

// Глобальная функция для использования в onchange в HTML
window.updateApplicationStatus = updateApplicationStatus;
