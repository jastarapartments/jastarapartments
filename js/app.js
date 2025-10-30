// Файл: js/app.js

// --- 1. НАСТРОЙКА SUPABASE (ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ ЭТИ КЛЮЧИ!) ---
const SUPABASE_URL = "https://vfignoxzqjjmghzsyyqr.supabase.co"; // <-- Вставьте свой URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmaWdub3h6cWpqbWdoenN5eXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU4MTIsImV4cCI6MjA3NzQyMTgxMn0.1sRa8C4vnwYs3ll9CwExBJ6aoLwG924CUpKRWs7B_ww"; // <-- Вставьте свой публичный ANON KEY
// Файл: js/app.js

// Инициализация клиента Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// ------------------------------------------------------------------

// Элементы DOM
const modal = document.getElementById('application-modal');
const form = document.getElementById('application-form');
const roomTypeSelect = document.getElementById('room_type');
const formMessage = document.getElementById('form-message');
const submitButton = document.getElementById('submit-button');


// --- 2. ЛОГИКА МОДАЛЬНОГО ОКНА ---

/**
 * Открывает модальное окно и предустанавливает тип комнаты.
 * @param {string} room - Тип комнаты для предустановки.
 */
function openModal(room) {
    // Сбрасываем форму и сообщения
    form.reset();
    formMessage.classList.add('hidden');
    submitButton.disabled = false;
    submitButton.textContent = 'Отправить заявку';
    
    // Предустановка выбранной комнаты
    if (room) {
        roomTypeSelect.value = room;
    }

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden'); // Блокировка прокрутки
}

/**
 * Закрывает модальное окно.
 */
function closeModal() {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}


// --- 3. ЛОГИКА ОТПРАВКИ ЗАЯВКИ (В SUPABASE) ---

/**
 * Отправляет данные заявки в таблицу 'applications' Supabase.
 * @param {object} formData - Объект с данными формы.
 */
async function sendApplication(formData) {
    const { error } = await supabase
        .from('applications')
        .insert([
            {
                name: formData.name,
                phone: formData.phone,
                room_type: formData.room_type,
                comment: formData.comment || null,
            },
        ]);

    if (error) {
        console.error('Ошибка при отправке заявки в Supabase:', error);
        return false;
    }
    return true;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Блокировка кнопки
    submitButton.disabled = true;
    submitButton.textContent = 'Отправка...';
    formMessage.classList.add('hidden');

    const data = new FormData(form);
    const applicationData = {
        name: data.get('name'),
        phone: data.get('phone'),
        room_type: data.get('room_type'),
        comment: data.get('comment'),
    };

    const success = await sendApplication(applicationData);

    if (success) {
        formMessage.textContent = '✅ Заявка успешно отправлена! Скоро мы с вами свяжемся.';
        formMessage.classList.remove('hidden');
        formMessage.classList.remove('text-error');
        formMessage.classList.add('text-success');
        form.reset(); // Сброс формы после успеха
        
        // Опционально: закрыть модальное окно через 3 секунды
        setTimeout(closeModal, 3000); 

    } else {
        formMessage.textContent = '❌ Произошла ошибка. Пожалуйста, попробуйте еще раз.';
        formMessage.classList.remove('hidden');
        formMessage.classList.remove('text-success');
        formMessage.classList.add('text-error');
    }

    // Возврат кнопки в исходное состояние, если не было успеха
    if (!success) {
        submitButton.disabled = false;
        submitButton.textContent = 'Отправить заявку';
    }
});

// Глобальные функции для доступа из HTML
window.openModal = openModal;
window.closeModal = closeModal;

// Логика для мобильного меню
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

// Закрытие мобильного меню при клике на ссылку
document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', toggleMobileMenu);
});

// Закрытие модального окна по клику вне его
modal.addEventListener('click', (e) => {
    if (e.target.id === 'application-modal') {
        closeModal();
    }
});
