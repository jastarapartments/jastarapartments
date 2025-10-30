// Файл: js/app.js

// --- 1. НАСТРОЙКА SUPABASE (ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ ЭТИ КЛЮЧИ!) ---
const SUPABASE_URL = "https://vfignoxzqjjmghzsyyqr.supabase.co"; // <-- Вставьте свой URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmaWdub3h6cWpqbWdoenN5eXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU4MTIsImV4cCI6MjA3NzQyMTgxMn0.1sRa8C4vnwYs3ll9CwExBJ6aoLwG924CUpKRWs7B_ww"; // <-- Вставьте свой публичный ANON KEY

// Убедитесь, что вы подключили библиотеку Supabase в HTML перед этим скриптом!
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// ------------------------------------------------------------------

const modal = document.getElementById('application-modal');
const form = document.getElementById('application-form');
const roomSelect = document.getElementById('room_type');
const formMessage = document.getElementById('form-message');
const submitButton = document.getElementById('submit-button');
const mobileMenu = document.getElementById('mobile-menu');


// --- 2. ФУНКЦИИ ИНТЕРФЕЙСА (УЛУЧШЕНЫ) ---

/**
 * Открывает модальное окно и предзаполняет тип комнаты.
 */
function openModal(roomType) {
    // Сброс и подготовка формы
    form.reset();
    formMessage.classList.add('hidden');
    formMessage.textContent = '';
    submitButton.disabled = false;
    submitButton.textContent = 'Отправить заявку';
    submitButton.className = 'w-full bg-primary text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition duration-300';
    
    // Предзаполнение поля выбора комнаты
    if (roomType) {
        roomSelect.value = roomType;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Запрет прокрутки фона
}

/**
 * Закрывает модальное окно.
 */
function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = ''; // Возобновление прокрутки фона
}

/**
 * Переключает видимость мобильного меню (бургер).
 * Управляет прокруткой фона.
 */
function toggleMobileMenu() {
    mobileMenu.classList.toggle('hidden');
    if (!mobileMenu.classList.contains('hidden')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}


// --- 3. ОБРАБОТЧИКИ СОБЫТИЙ ---

// 3.1. Отправка формы в Supabase
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
            .from('applications')
            .insert([
                { 
                    name, 
                    phone, 
                    room_type, 
                    comment, 
                    status: 'Новая' 
                },
            ]);

        if (error) throw error;

        // Успех
        form.reset();
        formMessage.textContent = '✅ Спасибо! Мы свяжемся с вами в ближайшее время.';
        formMessage.className = 'mt-4 text-center font-semibold text-success';
        submitButton.textContent = 'Успешно отправлено!';
        submitButton.className = 'w-full bg-success text-white py-3 rounded-xl font-bold text-lg opacity-80 cursor-not-allowed';
        
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


// 3.2. Закрытие модалки по клику вне формы
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// 3.3. Закрытие модалки по клавише ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
    }
});

// 3.4. Закрытие мобильного меню при клике на якорь (для лучшей адаптивности)
document.querySelectorAll('#mobile-menu a').forEach(link => {
    if (link.getAttribute('href').startsWith('#')) {
        link.addEventListener('click', () => {
            if (!mobileMenu.classList.contains('hidden')) {
                toggleMobileMenu();
            }
        });
    }
});


// Добавляем глобальные функции для доступа из HTML
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleMobileMenu = toggleMobileMenu;
