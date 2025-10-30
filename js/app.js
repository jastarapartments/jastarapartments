// Файл: js/app.js

// ===================================================================
// --- 1. НАСТРОЙКА SUPABASE (ВАШИ РЕАЛЬНЫЕ ДАННЫЕ) ---
// ===================================================================
const SUPABASE_URL = "https://vfignoxzqjjmghzsyyqr.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmaWdub3h6cWpqbWdoenN5eXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU4MTIsImV4cCI6MjA3NzQyMTgxMn0.1sRa8C4vnwYs3ll9CwExBJ6aoLwG924CUpKRWs7B_ww"; 

// Инициализация клиента Supabase (с исправлением ошибки ReferenceError)
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// ===================================================================

// Элементы DOM
const modal = document.getElementById('application-modal');
const form = document.getElementById('application-form');
const roomTypeSelect = document.getElementById('room_type');
const formMessage = document.getElementById('form-message');
const submitButton = document.getElementById('submit-button');


// --- 2. ЛОГИКА МОДАЛЬНОГО ОКНА ---

function openModal(room) {
    form.reset();
    formMessage.classList.add('hidden');
    submitButton.disabled = false;
    submitButton.textContent = 'Отправить заявку';
    
    if (room) {
        roomTypeSelect.value = room;
    }

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeModal() {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}


// --- 3. ЛОГИКА ОТПРАВКИ ЗАЯВКИ (В SUPABASE) ---

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
        formMessage.classList.add('text-success');
        form.reset(); 
        setTimeout(closeModal, 3000); 

    } else {
        formMessage.textContent = '❌ Произошла ошибка. Пожалуйста, попробуйте еще раз.';
        formMessage.classList.remove('hidden');
        formMessage.classList.add('text-error');
        submitButton.disabled = false;
        submitButton.textContent = 'Отправить заявку';
    }
});

// Глобальные функции
window.openModal = openModal;
window.closeModal = closeModal;

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', toggleMobileMenu);
});

modal.addEventListener('click', (e) => {
    if (e.target.id === 'application-modal') {
        closeModal();
    }
});
