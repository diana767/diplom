// Связь с администратором через авторизованный личный кабинет.
// На странице «Контакты» клиент оставляет первое обращение, затем переходит в кабинет.
// Переписка доступна только после входа по номеру телефона.
(function() {
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
    }[ch]));

    function normalizePhone(phone) {
        return String(phone || '').replace(/\D+/g, '');
    }

    function showAuthNotice() {
        const form = document.getElementById('contact-form');
        if (!form || document.getElementById('auth-chat-notice')) return;
        const notice = document.createElement('div');
        notice.id = 'auth-chat-notice';
        notice.className = 'auth-chat-notice soft-fade-in';
        notice.innerHTML = `
            <div class="auth-chat-icon"><i class="fas fa-lock"></i></div>
            <div>
                <h3>Чат доступен после входа в личный кабинет</h3>
                <p>Отправьте первое сообщение здесь. После этого мы перенаправим вас в кабинет, где можно войти по телефону и продолжить переписку с администратором.</p>
            </div>
        `;
        form.insertAdjacentElement('beforebegin', notice);
    }

    document.addEventListener('DOMContentLoaded', () => {
        showAuthNotice();
        const form = document.getElementById('contact-form');
        if (!form) return;

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            const resultDiv = document.getElementById('contact-message-result');
            const payload = {
                name: document.getElementById('contact-name').value.trim(),
                phone: document.getElementById('contact-phone').value.trim(),
                email: document.getElementById('contact-email').value.trim(),
                message: document.getElementById('contact-message').value.trim()
            };

            if (!payload.name || !payload.phone || !payload.message) {
                resultDiv.innerHTML = `<div class="notification" style="position:static;animation:none;background:#8b1e2d;"><p style="color:white;margin:0;"><i class="fas fa-exclamation-circle"></i> Заполните имя, телефон и сообщение</p></div>`;
                return;
            }

            try {
                const response = await salonAPI.request('php/api/save_contact_message.php', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (!response.success) throw new Error(response.error || 'Не удалось отправить сообщение');

                localStorage.setItem('salon_pending_chat_contact_id', response.contact_id || response.conversation_id);
                localStorage.setItem('salon_pending_chat_phone', payload.phone);
                localStorage.setItem('salon_pending_chat_phone_clean', normalizePhone(payload.phone));
                localStorage.setItem('salon_pending_chat_name', payload.name);
                sessionStorage.setItem('pending_phone', payload.phone);

                resultDiv.innerHTML = `
                    <div class="notification" style="position:static;animation:none;background:#2d6a4f;">
                        <p style="color:white;margin:0;"><i class="fas fa-check-circle"></i> Обращение создано. Сейчас откроется личный кабинет для продолжения чата.</p>
                    </div>`;

                setTimeout(() => {
                    window.location.href = 'client-login.html?chat=1';
                }, 900);
            } catch (error) {
                resultDiv.innerHTML = `<div class="notification" style="position:static;animation:none;background:#8b1e2d;"><p style="color:white;margin:0;"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(error.message)}</p></div>`;
            }
        }, true);
    });
})();
