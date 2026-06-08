// js/client.js
class ClientCabinet {
    constructor() {
        this.verificationCode = null;
        this.codeExpiry = null;
        this.resendTimerInterval = null;
        this.currentBookings = [];
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkSavedSession();
    }
    
    setupEventListeners() {
        // Переключение вкладок
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
        
        // Отправка кода подтверждения
        const sendCodeBtn = document.getElementById('sendCodeBtn');
        if (sendCodeBtn) {
            sendCodeBtn.addEventListener('click', () => {
                const phone = document.getElementById('clientPhone').value;
                if (this.validatePhone(phone)) {
                    this.requestVerificationCode(phone);
                } else {
                    this.showError('Введите корректный номер телефона (10-11 цифр)');
                }
            });
        }
        
        // Проверка кода
        const verifyCodeBtn = document.getElementById('verifyCodeBtn');
        if (verifyCodeBtn) {
            verifyCodeBtn.addEventListener('click', () => {
                this.verifyCode();
            });
        }
        
        // Обработка ввода цифр кода
        for (let i = 1; i <= 6; i++) {
            const input = document.getElementById(`code${i}`);
            if (input) {
                input.addEventListener('keyup', (e) => {
                    this.handleCodeInput(e, i);
                });
                input.addEventListener('paste', (e) => {
                    this.handleCodePaste(e);
                });
            }
        }
        
        // Возврат к вводу номера
        const backToPhoneBtn = document.getElementById('backToPhoneBtn');
        if (backToPhoneBtn) {
            backToPhoneBtn.addEventListener('click', () => {
                this.showPhoneStep();
            });
        }
        
        // Повторная отправка кода
        const resendCodeBtn = document.getElementById('resendCodeBtn');
        if (resendCodeBtn) {
            resendCodeBtn.addEventListener('click', () => {
                const phone = sessionStorage.getItem('pending_phone') || document.getElementById('clientPhone').value;
                if (phone) {
                    this.requestVerificationCode(phone, true);
                }
            });
        }
        
        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
        
        // Ввод номера по Enter
        const clientPhone = document.getElementById('clientPhone');
        if (clientPhone) {
            clientPhone.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const phone = clientPhone.value;
                    if (this.validatePhone(phone)) {
                        this.requestVerificationCode(phone);
                    } else {
                        this.showError('Введите корректный номер телефона');
                    }
                }
            });
        }
    }
    
    async requestVerificationCode(phone, isResend = false) {
        try {
            this.showLoader(isResend ? 'resendCodeBtn' : 'sendCodeBtn');
            this.hideError();
            
            const response = await salonAPI.sendVerificationCode(phone);
            
            if (!response.success) {
                throw new Error(response.error || 'Ошибка отправки SMS');
            }
            
            this.verificationCode = response.code;
            this.codeExpiry = Date.now() + 300000; // 5 минут
            
            const phoneDisplay = document.getElementById('phoneDisplay');
            if (phoneDisplay) {
                phoneDisplay.textContent = this.formatPhoneNumber(phone);
            }
            
            sessionStorage.setItem('pending_phone', phone);
            
            this.showCodeStep();
            const demoBox = document.getElementById('demoCodeBox');
            const demoValue = document.getElementById('demoCodeValue');
            if (demoBox && demoValue) {
                demoValue.textContent = this.verificationCode;
                demoBox.style.display = 'block';
            }
            this.startResendTimer();
            
            this.hideLoader(isResend ? 'resendCodeBtn' : 'sendCodeBtn');
            
        } catch (error) {
            this.hideLoader(isResend ? 'resendCodeBtn' : 'sendCodeBtn');
            this.showError(error.message || 'Ошибка отправки SMS. Пожалуйста, попробуйте позже.');
        }
    }
    
    async verifyCode() {
        let enteredCode = '';
        for (let i = 1; i <= 6; i++) {
            const input = document.getElementById(`code${i}`);
            if (input) {
                enteredCode += input.value;
            }
        }
        
        if (enteredCode.length !== 6) {
            this.showError('Введите полный код подтверждения');
            return;
        }
        
        if (Date.now() > this.codeExpiry) {
            this.showError('Срок действия кода истек. Запросите новый код.');
            return;
        }
        
        if (enteredCode !== this.verificationCode) {
            this.showError('Неверный код подтверждения');
            
            for (let i = 1; i <= 6; i++) {
                const input = document.getElementById(`code${i}`);
                if (input) {
                    input.style.borderColor = '#9a6a6a';
                    setTimeout(() => {
                        input.style.borderColor = '#e0e0e0';
                    }, 1000);
                }
            }
            return;
        }
        
        const phone = sessionStorage.getItem('pending_phone') || document.getElementById('clientPhone').value;
        await this.completeLogin(phone);
    }
    
    async completeLogin(phone) {
        try {
            this.showLoader('verifyCodeBtn');
            
            const response = await salonAPI.getClientBookings(phone);
            const bookings = (response && response.success) ? (response.data || []) : [];
            
            localStorage.setItem('client_phone', phone);
            localStorage.setItem('client_session_token', this.generateSessionToken());
            localStorage.setItem('client_session_expiry', Date.now() + 86400000);
            
            sessionStorage.removeItem('pending_phone');
            
            this.setLoggedIn(phone, bookings);
            this.hideLoader('verifyCodeBtn');
            
            for (let i = 1; i <= 6; i++) {
                const input = document.getElementById(`code${i}`);
                if (input) input.value = '';
            }
            
            this.showNotification('Вход выполнен успешно', 'success');
            
        } catch (error) {
            this.hideLoader('verifyCodeBtn');
            this.showError('Ошибка загрузки данных');
        }
    }
    
    checkSavedSession() {
        const savedPhone = localStorage.getItem('client_phone');
        const sessionToken = localStorage.getItem('client_session_token');
        const sessionExpiry = localStorage.getItem('client_session_expiry');
        
        if (savedPhone && sessionToken && sessionExpiry) {
            if (Date.now() < parseInt(sessionExpiry)) {
                this.loadClientBookings(savedPhone);
            } else {
                this.clearSession();
            }
        }
    }
    
    generateSessionToken() {
        return 'session_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
    }
    
    clearSession() {
        localStorage.removeItem('client_phone');
        localStorage.removeItem('client_session_token');
        localStorage.removeItem('client_session_expiry');
    }
    
    handleCodeInput(e, index) {
        const input = e.target;
        input.value = input.value.replace(/[^0-9]/g, '');
        
        if (input.value.length === 1 && index < 6) {
            document.getElementById(`code${index + 1}`).focus();
        }
        
        if (index === 6) {
            const allFilled = this.checkAllCodeFieldsFilled();
            if (allFilled) {
                this.verifyCode();
            }
        }
    }
    
    handleCodePaste(e) {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text');
        const code = pasteData.replace(/[^0-9]/g, '').slice(0, 6);
        
        for (let i = 0; i < code.length; i++) {
            const input = document.getElementById(`code${i + 1}`);
            if (input) {
                input.value = code[i];
            }
        }
        
        if (code.length < 6) {
            document.getElementById(`code${code.length + 1}`).focus();
        } else {
            this.verifyCode();
        }
    }
    
    checkAllCodeFieldsFilled() {
        for (let i = 1; i <= 6; i++) {
            const input = document.getElementById(`code${i}`);
            if (!input || !input.value) {
                return false;
            }
        }
        return true;
    }
    
    showPhoneStep() {
        document.getElementById('stepPhone').style.display = 'block';
        document.getElementById('stepCode').style.display = 'none';
        const demoBox = document.getElementById('demoCodeBox');
        if (demoBox) demoBox.style.display = 'none';
        this.hideError();
        this.stopResendTimer();
        
        this.verificationCode = null;
        this.codeExpiry = null;
    }
    
    showCodeStep() {
        document.getElementById('stepPhone').style.display = 'none';
        document.getElementById('stepCode').style.display = 'block';
        this.hideError();
        
        setTimeout(() => {
            document.getElementById('code1').focus();
        }, 100);
    }
    
    startResendTimer() {
        this.stopResendTimer();
        
        const resendBtn = document.getElementById('resendCodeBtn');
        
        if (resendBtn) {
            resendBtn.disabled = true;
            resendBtn.innerHTML = 'Отправить код повторно через <span id="resendTimer">60</span> сек';
        }
        
        let seconds = 60;
        this.resendTimerInterval = setInterval(() => {
            seconds--;
            
            const timerSpan = document.getElementById('resendTimer');
            if (timerSpan) {
                timerSpan.textContent = seconds;
            }
            
            if (seconds <= 0) {
                this.stopResendTimer();
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.innerHTML = '<i class="fas fa-redo-alt"></i> Отправить код повторно';
                }
            }
        }, 1000);
    }
    
    stopResendTimer() {
        if (this.resendTimerInterval) {
            clearInterval(this.resendTimerInterval);
            this.resendTimerInterval = null;
        }
    }
    
    async loadClientBookings(phone) {
        try {
            const response = await salonAPI.getClientBookings(phone);
            const bookings = (response && response.success) ? (response.data || []) : [];
            
            this.setLoggedIn(phone, bookings);
            
            if (bookings.length === 0) {
                this.showNoBookings();
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.setLoggedOut('Ошибка соединения с сервером');
        }
    }
    
    setLoggedIn(phone, bookings) {
        const loginSection = document.getElementById('loginSection');
        const clientContent = document.getElementById('clientContent');
        
        if (loginSection) loginSection.style.display = 'none';
        if (clientContent) clientContent.style.display = 'block';
        
        const clientPhoneDisplay = document.getElementById('clientPhoneDisplay');
        if (clientPhoneDisplay) {
            clientPhoneDisplay.textContent = this.formatPhoneNumber(phone);
        }
        
        const welcomeMessage = document.getElementById('welcomeMessage');
        const nameFromBooking = bookings && bookings.length > 0 ? bookings[0]?.client_name : null;
        
        if (welcomeMessage) {
            welcomeMessage.textContent = nameFromBooking ? 
                `Добро пожаловать, ${nameFromBooking}!` : 
                'Добро пожаловать!';
        }
        
        this.currentBookings = bookings || [];
        this.loadNotifications(phone);
        
        if (bookings && bookings.length > 0) {
            this.renderBookings(bookings, 'myBookingsList');
        } else {
            this.showNoBookings();
        }
    }
    
    setLoggedOut(message = '') {
        const loginSection = document.getElementById('loginSection');
        const clientContent = document.getElementById('clientContent');
        const loginError = document.getElementById('loginError');
        const errorMessage = document.getElementById('errorMessage');
        
        if (clientContent) clientContent.style.display = 'none';
        if (loginSection) loginSection.style.display = 'block';
        
        this.showPhoneStep();
        
        if (message && loginError) {
            if (errorMessage) errorMessage.textContent = message;
            loginError.style.display = 'block';
        }
        
        this.clearSession();
    }
    
    logout() {
        this.setLoggedOut();
        this.showNotification('Вы успешно вышли из системы', 'info');
    }
    
    switchTab(tabId) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        const activeTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(tabId);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
        
        const phone = localStorage.getItem('client_phone');
        if (phone) {
            switch(tabId) {
                case 'notifications':
                    this.loadNotifications(phone);
                    break;
                case 'my-bookings':
                    this.refreshBookingsOnly(phone);
                    break;
            }
        }
    }
    
    async refreshBookingsOnly(phone) {
        try {
            const response = await salonAPI.getClientBookings(phone);
            const bookings = (response && response.success) ? (response.data || []) : [];
            this.currentBookings = bookings;
            if (bookings.length > 0) {
                this.renderBookings(bookings, 'myBookingsList');
            } else {
                this.showNoBookings();
            }
        } catch (error) {
            console.error('Error refreshing client bookings:', error);
            const container = document.getElementById('myBookingsList');
            if (container) {
                container.innerHTML = '<div class="booking-item"><p>Не удалось обновить список записей.</p></div>';
            }
        }
    }

    async loadNotifications(phone) {
        try {
            const response = await salonAPI.getClientNotifications(phone);
            const notificationsList = document.getElementById('notificationsList');
            
            if (!notificationsList) return;
            
            if (!response.success || !response.data || response.data.length === 0) {
                notificationsList.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #667171;">
                        <i class="fas fa-bell" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p>Нет новых уведомлений</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            response.data.forEach(notification => {
                const bgColor = notification.type === 'admin' ? '#7a9b8d' : 
                              notification.type === 'cancellation' ? '#9a6a6a' : '#7a97a8';
                const icon = notification.type === 'admin' ? 'fas fa-user-shield' : 
                           notification.type === 'cancellation' ? 'fas fa-times-circle' : 'fas fa-info-circle';
                
                html += `
                    <div class="notification-item" style="border-left: 4px solid ${bgColor};">
                        <div style="display: flex; align-items: flex-start; gap: 1rem;">
                            <div style="background: ${bgColor}; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <i class="${icon}"></i>
                            </div>
                            <div style="flex: 1;">
                                <p style="margin: 0; color: #667171;">
                                    ${notification.message}
                                </p>
                                <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #7b8686;">
                                    <i class="fas fa-clock"></i> ${notification.formatted_date}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            notificationsList.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    renderBookings(bookings, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!bookings || bookings.length === 0) {
            this.showNoBookings();
            return;
        }
        
        let html = '<div class="bookings-list">';
        
        bookings.forEach(booking => {
            const statusInfo = this.getBookingStatusInfo(booking.status);
            const cancelInfo = this.canCancelBooking(booking);
            
            html += `
                <div class="booking-item">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #2f3b3d;">
                                ${booking.service_name || 'Услуга'}
                                <span class="booking-status ${statusInfo.statusClass}">
                                    <i class="${statusInfo.statusIcon}"></i> ${statusInfo.statusText}
                                </span>
                            </h4>
                            
                            <div style="margin-bottom: 0.5rem;">
                                <p style="margin: 0.3rem 0;">
                                    <i class="fas fa-calendar"></i> <strong>${booking.formatted_date}</strong> в ${booking.desired_time}
                                </p>
                                <p style="margin: 0.3rem 0;">
                                    <i class="fas fa-user-tie"></i> ${booking.master_name || 'Любой мастер'}
                                </p>
                                <p style="margin: 0.3rem 0;">
                                    <i class="fas fa-phone"></i> ${this.formatPhoneNumber(booking.phone)}
                                </p>
                            </div>
                            
                            ${booking.comment ? `
                                <div style="margin: 0.5rem 0; padding: 0.5rem; background: var(--light); border-radius: 4px;">
                                    <i class="fas fa-comment" style="color: var(--gray);"></i>
                                    <span style="color: var(--gray);">${booking.comment}</span>
                                </div>
                            ` : ''}
                            
                            <p style="margin: 0.3rem 0; font-size: 0.9rem; color: #667171;">
                                <i class="fas fa-hashtag"></i> Номер заявки: ${booking.booking_number}
                            </p>
                        </div>
                        
                        <div style="text-align: right; margin-left: 1rem; min-width: 120px;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #ff4081;">
                                ${booking.service_price ? booking.service_price + ' ₽' : ''}
                            </div>
                        </div>
                    </div>
                    
                    ${cancelInfo.canCancel ? `
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #dfe5e0;">
                            <button onclick="cancelClientBooking(${booking.id})" style="background: #9a6a6a; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-times"></i> Отменить запись
                            </button>
                        </div>
                    ` : cancelInfo.reason ? `
                        <p style="margin: 0.5rem 0; font-size: 0.85rem; color: #9a6a6a;">
                            <i class="fas fa-info-circle"></i> ${cancelInfo.reason}
                        </p>
                    ` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    showNoBookings() {
        const container = document.getElementById('myBookingsList');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #667171;">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>У вас нет активных записей</p>
                    <a href="book.html" class="btn" style="margin-top: 1rem;">
                        <i class="fas fa-plus"></i> Создать новую запись
                    </a>
                </div>
            `;
        }
    }
    
    validatePhone(phone) {
        if (!phone) return false;
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 11;
    }
    
    formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `+${cleaned[0]} (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
        }
        return phone;
    }
    
    getBookingStatusInfo(status) {
        switch(status) {
            case 'confirmed':
                return {
                    statusClass: 'status-confirmed',
                    statusText: 'Подтверждена',
                    statusIcon: 'fas fa-check-circle'
                };
            case 'cancelled':
                return {
                    statusClass: 'status-cancelled',
                    statusText: 'Отменена',
                    statusIcon: 'fas fa-times-circle'
                };
            case 'new':
            default:
                return {
                    statusClass: 'status-new',
                    statusText: 'Новая',
                    statusIcon: 'fas fa-clock'
                };
        }
    }
    
    canCancelBooking(booking) {
        if (booking.status === 'cancelled') {
            return { canCancel: false, reason: 'Запись уже отменена' };
        }
        
        const bookingDate = new Date(booking.desired_date + ' ' + booking.desired_time);
        const currentDate = new Date();
        
        if (bookingDate < currentDate) {
            return { canCancel: false, reason: 'Нельзя отменить прошедшую запись' };
        }
        
        if (booking.status === 'new') {
            return { canCancel: true, reason: '' };
        }
        
        if (booking.status === 'confirmed') {
            const timeDiff = bookingDate - currentDate;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff >= 24) {
                return { canCancel: true, reason: '' };
            } else {
                return { canCancel: false, reason: 'Отмена возможна не позднее чем за 24 часа до записи' };
            }
        }
        
        return { canCancel: false, reason: '' };
    }
    
    showError(message) {
        const loginError = document.getElementById('loginError');
        const errorMessage = document.getElementById('errorMessage');
        
        if (loginError && errorMessage) {
            errorMessage.textContent = message;
            loginError.style.display = 'block';
            
            setTimeout(() => {
                loginError.style.display = 'none';
            }, 5000);
        }
    }
    
    hideError() {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.style.display = 'none';
        }
    }
    
    showLoader(buttonId) {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.disabled = true;
            if (buttonId === 'sendCodeBtn') {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            } else if (buttonId === 'verifyCodeBtn') {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверка...';
            } else if (buttonId === 'resendCodeBtn') {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            }
        }
    }
    
    hideLoader(buttonId) {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.disabled = false;
            if (buttonId === 'sendCodeBtn') {
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить код';
            } else if (buttonId === 'verifyCodeBtn') {
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Подтвердить вход';
            } else if (buttonId === 'resendCodeBtn') {
                btn.innerHTML = '<i class="fas fa-redo-alt"></i> Отправить код повторно';
            }
        }
    }
    
    showNotification(message, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Глобальная функция для отмены записи
window.cancelClientBooking = async function(bookingId) {
    const phone = localStorage.getItem('client_phone');
    if (!phone) {
        alert('Не найден номер телефона');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите отменить эту запись?')) return;
    
    try {
        const response = await salonAPI.cancelClientBooking(bookingId, phone);
        
        if (response.success) {
            if (typeof window.showNotification === 'function') {
                window.showNotification('Запись успешно отменена!', 'success');
            } else {
                alert('Запись успешно отменена!');
            }
            
            const clientCabinet = window.clientCabinet || new ClientCabinet();
            window.clientCabinet = clientCabinet;
            clientCabinet.loadClientBookings(phone);
        } else {
            alert(response.error || 'Ошибка при отмене записи');
        }
    } catch (error) {
        alert('Ошибка соединения с сервером');
    }
};

// Инициализация личного кабинета
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('clientPhone')) {
        window.clientCabinet = new ClientCabinet();
    }
});


// ===== ДОРАБОТКА: клиент отвечает на предложение переноса записи =====
(function() {
    const oldStatus = ClientCabinet.prototype.getBookingStatusInfo;
    ClientCabinet.prototype.getBookingStatusInfo = function(status) {
        if (status === 'transfer_proposed') {
            return { statusClass: 'status-new', statusText: 'Предложен перенос', statusIcon: 'fas fa-calendar-alt' };
        }
        return oldStatus.call(this, status);
    };

    const oldLoadNotifications = ClientCabinet.prototype.loadNotifications;
    ClientCabinet.prototype.loadNotifications = async function(phone) {
        try {
            const response = await salonAPI.getClientNotifications(phone);
            const notificationsList = document.getElementById('notificationsList');
            if (!notificationsList) return;

            if (!response.success || !response.data || response.data.length === 0) {
                notificationsList.innerHTML = `<div style="text-align:center;padding:2rem;color:#667171;"><i class="fas fa-bell" style="font-size:3rem;margin-bottom:1rem;"></i><p>Нет новых уведомлений</p></div>`;
                return;
            }

            let html = '';
            response.data.forEach(notification => {
                const isTransfer = notification.type === 'transfer' && notification.transfer_request_id && notification.transfer_status === 'pending';
                const bgColor = isTransfer ? '#a77c56' : (notification.type === 'admin' ? '#7a9b8d' : notification.type === 'cancellation' ? '#9a6a6a' : '#7a97a8');
                const icon = isTransfer ? 'fas fa-calendar-alt' : (notification.type === 'admin' ? 'fas fa-user-shield' : notification.type === 'cancellation' ? 'fas fa-times-circle' : 'fas fa-info-circle');
                html += `
                    <div class="notification-item" style="border-left:4px solid ${bgColor};">
                        <div style="display:flex;align-items:flex-start;gap:1rem;">
                            <div style="background:${bgColor};color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;"><i class="${icon}"></i></div>
                            <div style="flex:1;">
                                <p style="margin:0;color:#667171;">${notification.message}</p>
                                ${isTransfer ? `
                                    <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap;">
                                        <button class="btn" onclick="respondTransferRequest(${notification.transfer_request_id}, 'accept')"><i class="fas fa-check"></i> Согласиться</button>
                                        <button class="btn" style="background:#9a6a6a;" onclick="respondTransferRequest(${notification.transfer_request_id}, 'decline')"><i class="fas fa-times"></i> Отказаться</button>
                                    </div>` : ''}
                                <div style="margin-top:.5rem;font-size:.85rem;color:#7b8686;"><i class="fas fa-clock"></i> ${notification.formatted_date || ''}</div>
                            </div>
                        </div>
                    </div>`;
            });
            notificationsList.innerHTML = html;
        } catch (error) {
            console.error('Error loading notifications:', error);
            await oldLoadNotifications.call(this, phone);
        }
    };

    window.respondTransferRequest = async function(transferRequestId, action) {
        const phone = localStorage.getItem('client_phone');
        if (!phone) return alert('Сначала войдите в личный кабинет');
        const text = action === 'accept' ? 'согласиться на перенос' : 'отказаться от переноса';
        if (!confirm(`Вы уверены, что хотите ${text}?`)) return;
        try {
            const response = await salonAPI.respondTransferRequest({ transfer_request_id: transferRequestId, phone, action });
            if (!response.success) throw new Error(response.error || 'Не удалось отправить ответ');
            showNotification(response.message || 'Ответ отправлен', 'success');
            if (window.clientCabinet) {
                window.clientCabinet.loadNotifications(phone);
                window.clientCabinet.refreshBookingsOnly(phone);
            }
        } catch (error) {
            alert(error.message || 'Ошибка отправки ответа');
        }
    };
})();


// ===== ДОРАБОТКА: чат с администратором только после авторизации =====
(function() {
    let chatTimer = null;
    let currentContactId = null;
    let currentPhone = null;
    let currentName = 'Клиент';

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
    const cleanPhone = (value) => String(value || '').replace(/\D+/g, '');

    function pendingDialogForPhone(phone) {
        const pendingId = localStorage.getItem('salon_pending_chat_contact_id');
        const pendingPhone = localStorage.getItem('salon_pending_chat_phone');
        const pendingClean = localStorage.getItem('salon_pending_chat_phone_clean');
        if (pendingId && (cleanPhone(pendingPhone) === cleanPhone(phone) || pendingClean === cleanPhone(phone))) {
            return {
                contactId: pendingId,
                phone: pendingPhone || phone,
                name: localStorage.getItem('salon_pending_chat_name') || 'Клиент'
            };
        }
        return null;
    }

    function saveActiveDialog(contactId, phone, name) {
        currentContactId = contactId ? Number(contactId) : null;
        currentPhone = phone;
        currentName = name || currentName || 'Клиент';
        if (currentContactId) {
            localStorage.setItem('salon_client_chat_contact_id', String(currentContactId));
            localStorage.setItem('salon_client_chat_phone', phone);
            localStorage.setItem('salon_client_chat_name', currentName);
        }
    }

    async function findDialog(phone) {
        const pending = pendingDialogForPhone(phone);
        if (pending) {
            saveActiveDialog(pending.contactId, pending.phone, pending.name);
            return true;
        }

        const savedId = localStorage.getItem('salon_client_chat_contact_id');
        const savedPhone = localStorage.getItem('salon_client_chat_phone');
        if (savedId && cleanPhone(savedPhone) === cleanPhone(phone)) {
            saveActiveDialog(savedId, savedPhone || phone, localStorage.getItem('salon_client_chat_name') || 'Клиент');
            return true;
        }

        try {
            const response = await salonAPI.getClientDialog(phone);
            if (response.success && response.has_dialog && response.data) {
                saveActiveDialog(response.contact_id || response.data.id, response.data.phone || phone, response.data.name || 'Клиент');
                return true;
            }
        } catch (e) {
            console.error('Dialog search error:', e);
        }
        currentContactId = null;
        currentPhone = phone;
        return false;
    }

    async function loadAuthorizedChat() {
        const box = document.getElementById('clientChatMessages');
        if (!box || !currentPhone) return;

        if (!currentContactId) {
            box.innerHTML = '<div class="chat-empty"><i class="fas fa-comment-dots"></i><br>Диалог ещё не создан. Напишите первое сообщение администратору.</div>';
            return;
        }

        try {
            const response = await salonAPI.getClientChatMessages(currentContactId, currentPhone);
            if (!response.success) throw new Error(response.error || 'Не удалось загрузить чат');
            const messages = response.data || [];
            if (!messages.length) {
                box.innerHTML = '<div class="chat-empty">Сообщений пока нет.</div>';
                return;
            }
            box.innerHTML = messages.map(msg => `
                <div class="chat-message ${msg.sender_type === 'admin' ? 'admin' : 'client'}">
                    <div class="chat-message-meta">${msg.sender_type === 'admin' ? 'Администратор' : escapeHtml(msg.sender_name || currentName)} · ${escapeHtml(msg.created_at_formatted || '')}</div>
                    <div class="chat-message-text">${escapeHtml(msg.message)}</div>
                </div>
            `).join('');
            box.scrollTop = box.scrollHeight;
        } catch (error) {
            box.innerHTML = `<div class="chat-empty">${escapeHtml(error.message)}</div>`;
        }
    }

    async function sendAuthorizedChatMessage() {
        const input = document.getElementById('clientChatInput');
        const message = input?.value.trim();
        if (!message || !currentPhone) return;
        try {
            const response = await salonAPI.sendClientAuthorizedChatMessage({
                contact_id: currentContactId || null,
                phone: currentPhone,
                name: currentName,
                message
            });
            if (!response.success) throw new Error(response.error || 'Не удалось отправить сообщение');
            saveActiveDialog(response.contact_id, currentPhone, currentName);
            localStorage.removeItem('salon_pending_chat_contact_id');
            input.value = '';
            await loadAuthorizedChat();
        } catch (error) {
            alert(error.message || 'Ошибка отправки сообщения');
        }
    }

    async function initAuthorizedChat(phone, bookings) {
        currentPhone = phone;
        currentName = (bookings && bookings.length > 0 && bookings[0]?.client_name) || localStorage.getItem('salon_pending_chat_name') || 'Клиент';
        await findDialog(phone);
        await loadAuthorizedChat();
        if (chatTimer) clearInterval(chatTimer);
        chatTimer = setInterval(loadAuthorizedChat, 3000);
    }

    const oldSetLoggedIn = ClientCabinet.prototype.setLoggedIn;
    ClientCabinet.prototype.setLoggedIn = function(phone, bookings) {
        oldSetLoggedIn.call(this, phone, bookings);
        initAuthorizedChat(phone, bookings || []);

        const params = new URLSearchParams(window.location.search);
        if (params.get('chat') === '1') {
            setTimeout(() => this.switchTab('chat'), 250);
        }
    };

    const oldSwitchTab = ClientCabinet.prototype.switchTab;
    ClientCabinet.prototype.switchTab = function(tabId) {
        oldSwitchTab.call(this, tabId);
        if (tabId === 'chat') {
            const phone = localStorage.getItem('client_phone');
            if (phone) initAuthorizedChat(phone, this.currentBookings || []);
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('clientChatSendBtn')?.addEventListener('click', sendAuthorizedChatMessage);
        document.getElementById('clientChatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendAuthorizedChatMessage();
        });
    });
})();
