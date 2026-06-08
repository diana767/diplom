class BeautySalonAPI {
    constructor() {
        const origin = window.location.origin;
        const dir = window.location.pathname.replace(/\/[^\/]*$/, '');
        this.baseURL = origin + dir;
    }

    // Общий метод для запросов
    async request(endpoint, options = {}) {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseURL}${cleanEndpoint}`;
        
        const config = {
            cache: 'no-store',
            ...options,
            headers: {
                'Accept': 'application/json',
                ...(options.headers || {})
            }
        };

        if (!(options.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, config);
      
            if (response.headers.get('content-type')?.includes('text/csv')) {
                return response;
            }
            
            const data = await response.json().catch(() => null);
            
            if (!response.ok) {
                throw new Error(data?.error || `HTTP error ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // =================== КЛИЕНТСКАЯ ЧАСТЬ ===================

    // Получение услуг
    async getServices() {
        return await this.request('php/api/get_services.php');
    }

    // Публичные настройки салона 
    async getPublicSettings() {
        return await this.request('php/api/get_settings.php');
    }

    // Получение мастеров
    async getMasters() {
        return await this.request('php/api/get_masters.php');
    }

    // Связи мастер-услуга 
    async getMasterServices() {
        return await this.request('php/api/get_master_services.php');
    }

    // Проверка доступного времени
    async getAvailableTimeSlots(masterId, date, serviceId) {
        let url = `php/api/get_available_times.php?date=${encodeURIComponent(date)}`;
        
        if (masterId && masterId !== 'any') {
            url += `&master_id=${masterId}`;
        }
        
        if (serviceId) {
            url += `&service_id=${serviceId}`;
        }
        
        return await this.request(url);
    }

    // Создание записи
    async createBooking(bookingData) {
        return await this.request('php/api/save_booking.php', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    }

    // Поиск записей клиента
    async getClientBookings(phone) {
        return await this.request(`php/api/get_client_bookings.php?phone=${encodeURIComponent(phone)}`);
    }

    // Отмена записи клиентом
    async cancelClientBooking(bookingId, phone) {
        return await this.request('php/api/cancel_booking.php', {
            method: 'POST',
            body: JSON.stringify({ booking_id: bookingId, phone: phone })
        });
    }

    // Получение уведомлений клиента
    async getClientNotifications(phone) {
        return await this.request(`php/api/get_notifications.php?phone=${encodeURIComponent(phone)}`);
    }

    // Отметка уведомления как прочитанного
    async markNotificationAsRead(notificationId) {
        return await this.request('php/api/mark_notification_read.php', {
            method: 'POST',
            body: JSON.stringify({ notification_id: notificationId })
        });
    }

    // =================== АДМИН-ЧАСТЬ ===================

    // Проверка авторизации админа
    async checkAdminAuth() {
        try {
            const response = await this.request('php/admin/check_auth.php');
            return response.authenticated === true || response.success === true;
        } catch (error) {
            console.log('Auth check failed:', error);
            return false;
        }
    }

    // Вход админа
    async adminLogin(username, password) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        return await fetch(`${this.baseURL}/php/admin/login.php`, {
            method: 'POST',
            body: formData
        }).then(r => r.json());
    }

    // Выход админа
    async adminLogout() {
        return await this.request('php/admin/logout.php', {
            method: 'POST'
        });
    }

    // Получение статистики
    async getStats() {
        return await this.request('php/admin/get_stats.php');
    }

    // Получение записей
    async getBookings(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await this.request(`php/admin/get_bookings.php?${params}`);
    }

    // Обновление статуса записи
    async updateBookingStatus(bookingId, status) {
        return await this.request('php/admin/update_booking_status.php', {
            method: 'POST',
            body: JSON.stringify({ booking_id: bookingId, status: status })
        });
    }

    // Экспорт записей 
    async exportBookings(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const response = await fetch(`${this.baseURL}/php/admin/export_bookings.php?${params}`);
        
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // Управление услугами
    async getServicesAdmin() {
        return await this.request('php/admin/get_services.php');
    }

    async saveService(serviceData) {
        return await this.request('php/admin/save_service.php', {
            method: 'POST',
            body: JSON.stringify(serviceData)
        });
    }

    async deleteService(serviceId) {
        return await this.request('php/admin/delete_service.php', {
            method: 'POST',
            body: JSON.stringify({ service_id: serviceId })
        });
    }

    // Управление мастерами
    async getMastersAdmin() {
        return await this.request('php/admin/get_masters.php');
    }

    async saveMaster(masterData) {
        return await this.request('php/admin/save_master.php', {
            method: 'POST',
            body: JSON.stringify(masterData)
        });
    }

    async deleteMaster(masterId) {
        return await this.request('php/admin/delete_master.php', {
            method: 'POST',
            body: JSON.stringify({ master_id: masterId })
        });
    }

    async toggleMasterActive(masterId, isActive) {
        return await this.request('php/admin/toggle_master_active.php', {
            method: 'POST',
            body: JSON.stringify({ master_id: masterId, is_active: isActive })
        });
    }

    // Настройки
    async getSettings() {
        return await this.request('php/admin/get_settings.php');
    }

    async saveSettings(settingsData) {
        return await this.request('php/admin/save_settings.php', {
            method: 'POST',
            body: JSON.stringify(settingsData)
        });
    }


    async getContactMessages() {
        return await this.request('php/admin/get_contact_messages.php');
    }

    async getFinancialReport() {
        return await this.request('php/admin/get_financial_report.php');
    }

    // Уведомления
    async sendNotification(bookingId, message) {
        return await this.request('php/admin/send_notification.php', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: bookingId,
                message: message,
                type: 'admin'
            })
        });
    }
    // =================== SMS АУТЕНТИФИКАЦИЯ ===================

// Отправка SMS с кодом подтверждения
async sendVerificationCode(phone) {
    return await this.request('php/api/send_verification_code.php', {
        method: 'POST',
        body: JSON.stringify({ 
            phone: phone,
            action: 'send_code'
        })
    });
}

// Проверка кода подтверждения (опционально, если проверка на сервере)
async verifyCode(phone, code) {
    return await this.request('php/api/verify_code.php', {
        method: 'POST',
        body: JSON.stringify({ 
            phone: phone, 
            code: code,
            action: 'verify_code'
        })
    });
}
}


window.salonAPI = new BeautySalonAPI();

// Вспомогательная функция для показа уведомлений
window.showNotification = function(message, type = 'success') {
    // Удаляем старые уведомления
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#9a6a6a' : type === 'success' ? '#7a9b8d' : '#7a97a8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    const icon = type === 'error' ? 'fas fa-exclamation-circle' :
                 type === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle';

    notification.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
};

// ===== ДОРАБОТКА: чат, портфолио, переносы записей =====
BeautySalonAPI.prototype.getClientChatMessages = function(contactId, phone) {
    return this.request(`php/api/get_chat_messages.php?contact_id=${encodeURIComponent(contactId)}&phone=${encodeURIComponent(phone)}`);
};
BeautySalonAPI.prototype.sendClientChatMessage = function(payload) {
    return this.request('php/api/send_chat_message.php', { method: 'POST', body: JSON.stringify(payload) });
};
BeautySalonAPI.prototype.getAdminChatMessages = function(contactId) {
    return this.request(`php/admin/get_chat_messages.php?contact_id=${encodeURIComponent(contactId)}`);
};
BeautySalonAPI.prototype.sendAdminChatMessage = function(contactId, message) {
    return this.request('php/admin/send_chat_message.php', { method: 'POST', body: JSON.stringify({ contact_id: contactId, message }) });
};
BeautySalonAPI.prototype.getMasterPortfolio = function(masterId) {
    return this.request(`php/api/get_master_portfolio.php?master_id=${encodeURIComponent(masterId)}`);
};
BeautySalonAPI.prototype.getMasterProblemBookings = function(masterId) {
    return this.request(`php/admin/get_master_problem_bookings.php?master_id=${encodeURIComponent(masterId)}`);
};
BeautySalonAPI.prototype.proposeBookingTransfer = function(payload) {
    return this.request('php/admin/propose_booking_transfer.php', { method: 'POST', body: JSON.stringify(payload) });
};
BeautySalonAPI.prototype.respondTransferRequest = function(payload) {
    return this.request('php/api/respond_transfer_request.php', { method: 'POST', body: JSON.stringify(payload) });
};


// ===== ДОРАБОТКА: авторизованный чат клиента и подарочные сертификаты =====
BeautySalonAPI.prototype.getClientDialog = function(phone) {
    return this.request(`php/api/get_client_dialog.php?phone=${encodeURIComponent(phone)}`);
};
BeautySalonAPI.prototype.sendClientAuthorizedChatMessage = function(payload) {
    return this.request('php/api/send_authorized_chat_message.php', { method: 'POST', body: JSON.stringify(payload) });
};
BeautySalonAPI.prototype.createGiftCertificate = function(payload) {
    return this.request('php/api/create_gift_certificate.php', { method: 'POST', body: JSON.stringify(payload) });
};


// ===== ДОРАБОТКА: управление портфолио мастеров в админке =====
BeautySalonAPI.prototype.getAdminMasterPortfolio = function(masterId) {
    return this.request(`php/admin/get_master_portfolio.php?master_id=${encodeURIComponent(masterId)}`);
};
BeautySalonAPI.prototype.uploadMasterPortfolio = function(formData) {
    return this.request('php/admin/upload_master_portfolio.php', { method: 'POST', body: formData });
};
BeautySalonAPI.prototype.deleteMasterPortfolio = function(id) {
    return this.request('php/admin/delete_master_portfolio.php', { method: 'POST', body: JSON.stringify({ id }) });
};
