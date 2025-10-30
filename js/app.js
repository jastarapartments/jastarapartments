// Файл: js/app.js

// --- 1. НАСТРОЙКА SUPABASE (ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ ЭТИ КЛЮЧИ!) ---
const SUPABASE_URL = "https://your-project-id.supabase.co"; // <-- Вставьте свой URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // <-- Вставьте свой публичный ANON KEY

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// ------------------------------------------------------------------

const modal = document.getElementById('application-modal');
const form = document.getElementById('application-form');
const roomSelect = document.getElementById('room_type');
const formMessage = document.getElementById('form-message');
const submitButton = document.getElementById('submit-button');
const mobileMenu = document.getElementById('mobile-menu');


// --- 2. ФУНКЦИИ ИНТЕРФЕЙСА ---

/**
 * Открывает модальное окно и предзаполняет тип комнаты.
 * @param {string} roomType - Тип комнаты (2-местная, 3-местная, Общая).
 */
function openModal(roomType) {
    // Сбрасываем форму и сообщение
    form.reset();
    formMessage.classList.add('hidden');
    formMessage.textContent = '';
    submitButton.disabled = false;
    submitButton.textContent = 'Отправить заявку';
    submitButton.classList.remove('bg-success', 'bg-error', 'opacity-50');
    submitButton.classList.add('bg-primary', 'hover:bg-blue-700');
    
    // Предзаполнение поля выбора комнаты
    if (roomType) {
        roomSelect.value = roomType;
    }

    modal.classList.remove('hidden');
    // Небольшая задержка для анимации
    setTimeout(() => {
        modal.classList.add('opacity-100');
    }, 10);
    document.body.style.overflow = 'hidden'; // Запрет прокрутки фона
}

/**
 * Закрывает модальное окно.
 */
function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('opacity-100');
    document.body.style.overflow = ''; // Возобновление прокрутки фона
}

/**
 * Переключает видимость мобильного меню (бургер).
 */
function toggleMobileMenu() {
    mobileMenu.classList.toggle('hidden');
}

/**
 * Плавный скролл к секции комнат.
 */
function scrollToRooms() {
    document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' });
}


// --- 3. ЛОГИКА ОТПРАВКИ ЗАЯВКИ (SUPABASE) ---

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const room_type = document.getElementById('room_type').value;
    const comment = document.getElementById('comment').value;

    submitButton.disabled = true;
    submitButton.textContent = 'Отправка...';
    submitButton.classList.add('opacity-50');

    try {
        const { error } = await supabase
            .from('applications') // Название таблицы из ТЗ
            .insert([
                { 
                    name, 
                    phone, 
                    room_type, 
                    comment, 
                    status: 'Новая' // Статус по умолчанию
                },
            ]);

        if (error) throw error;

        // Успех
        form.reset();
        formMessage.textContent = '✅ Спасибо! Мы свяжемся с вами в ближайшее время.';
        formMessage.className = 'mt-4 text-center font-semibold text-success';
        submitButton.textContent = 'Успешно отправлено!';
        submitButton.classList.remove('bg-primary', 'hover:bg-blue-700', 'opacity-50');
        submitButton.classList.add('bg-success');
        
        // Автоматически закрыть модалку через 3 секунды
        setTimeout(closeModal, 3000);

    } catch (error) {
        // Ошибка
        console.error('Ошибка при отправке заявки:', error);
        formMessage.textContent = '❌ Ошибка отправки: Попробуйте позже.';
        formMessage.className = 'mt-4 text-center font-semibold text-error';
        submitButton.textContent = 'Повторить попытку';
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-50');
    }
    
    formMessage.classList.remove('hidden');
});

// Добавляем глобальные функции для доступа из HTML
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleMobileMenu = toggleMobileMenu;
window.scrollToRooms = scrollToRooms;

// Закрытие модалки по клику вне формы
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});
