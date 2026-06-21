class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.loadDashboard();
    }
    
    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = e.target.closest('.nav-link').dataset.section;
                this.showSection(sectionId);
            });
        });
        
        // Выход
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm('Вы уверены, что хотите выйти?')) {
                    await salonAPI.adminLogout();
                    window.location.href = 'admin-login.html';
                }
            });
        }
        
        // Обновление данных
        document.getElementById('refreshAllBtn')?.addEventListener('click', () => {
            this.loadDashboard();
            showNotification('Данные обновлены', 'success');
        });
        
        // Добавление услуг
        document.getElementById('addServiceBtn')?.addEventListener('click', () => {
            this.openServiceModal();
        });
        
        // Добавление мастеров
        document.getElementById('addMasterBtn')?.addEventListener('click', () => {
            this.openMasterModal();
        });
        
        // Обновление списков
        document.getElementById('refreshBookingsBtn')?.addEventListener('click', () => {
            this.loadBookings();
            showNotification('Список записей обновлен', 'success');
        });
        
        document.getElementById('refreshServicesBtn')?.addEventListener('click', () => {
            this.loadServices();
            showNotification('Список услуг обновлен', 'success');
        });
        
        document.getElementById('refreshMastersBtn')?.addEventListener('click', () => {
            this.loadMasters();
            showNotification('Список мастеров обновлен', 'success');
        });
        
        document.getElementById('refreshSettingsBtn')?.addEventListener('click', () => {
            this.loadSettings();
            showNotification('Настройки обновлены', 'success');
        });
        document.getElementById('refreshMessagesBtn')?.addEventListener('click', () => {
            this.loadMessages();
            showNotification('Сообщения обновлены', 'success');
        });
        document.getElementById('refreshReportsBtn')?.addEventListener('click', () => {
            this.loadReports();
            showNotification('Отчёты обновлены', 'success');
        });
        
        // Экспорт
        document.getElementById('exportBookingsBtn')?.addEventListener('click', () => {
            this.exportBookings();
        });
        
        // Фильтры записей
        document.querySelectorAll('.booking-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = btn.dataset.status || 'all';
                // подсветка активного фильтра
                document.querySelectorAll('.booking-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterBookings(status);
            });
        });
        
        // Формы
        document.getElementById('serviceForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveService();
        });
        
        document.getElementById('masterForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMaster();
        });
        
        document.getElementById('adminSettingsForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        
        // Модальные окна
        document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.classList.remove('active');
            });
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });
    }
    
    showSection(sectionId) {
        // Скрыть все разделы
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Показать выбранный
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.add('active');
        
        // Обновить навигацию
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionId) {
                link.classList.add('active');
            }
        });
        
        // Загрузить данные раздела
        this.currentSection = sectionId;
        switch(sectionId) {
            case 'dashboard': this.loadDashboard(); break;
            case 'bookings': this.loadBookings(); break;
            case 'services': this.loadServices(); break;
            case 'masters': this.loadMasters(); break;
            case 'settings': this.loadSettings(); break;
            case 'messages': this.loadMessages(); break;
            case 'reports': this.loadReports(); break;
        }
    }
    
    async loadDashboard() {
        try {
            const response = await salonAPI.getStats();
            
            if (response.success) {
                const stats = response.stats;
                document.getElementById('statNewBookings').textContent = stats.new_bookings || 0;
                document.getElementById('statTotalServices').textContent = stats.total_services || 0;
                document.getElementById('statActiveMasters').textContent = stats.active_masters || 0;
                document.getElementById('statTodayBookings').textContent = stats.today_bookings || 0;
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }
    
    async loadBookings(filterStatus = 'all') {
        try {
            const response = await salonAPI.getBookings({ status: filterStatus });
            
            if (response.success) {
                this.renderBookings(response.data);
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            showNotification('Ошибка загрузки записей', 'error');
        }
    }
    
    renderBookings(bookings) {
        const container = document.getElementById('bookingsTable');
        if (!container) return;
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #667171;">
                    <i class="fas fa-calendar-times fa-3x"></i>
                    <p>Нет записей</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Клиент</th>
                        <th>Услуга</th>
                        <th>Мастер</th>
                        <th>Дата</th>
                        <th>Время</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        bookings.forEach(booking => {
            let statusClass = 'status-new';
            let statusText = 'Новая';
            
            if (booking.status === 'confirmed') {
                statusClass = 'status-confirmed';
                statusText = 'Подтверждена';
            } else if (booking.status === 'cancelled') {
                statusClass = 'status-cancelled';
                statusText = 'Отменена';
            }
            
            html += `
                <tr>
                    <td><strong>${booking.booking_number}</strong></td>
                    <td>
                        <div><strong>${booking.client_name}</strong></div>
                        <small>${booking.phone}</small>
                        ${booking.comment ? `<br><small><em>${booking.comment}</em></small>` : ''}
                    </td>
                    <td>${booking.service_name || 'Неизвестно'}</td>
                    <td>${booking.master_name || 'Любой'}</td>
                    <td>${booking.formatted_date}</td>
                    <td>${booking.desired_time}</td>
                    <td><span class="status ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="table-actions">
                            ${booking.status === 'new' ? `
                                <button class="table-btn btn-confirm" onclick="adminPanel.confirmBooking(${booking.id})">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="table-btn btn-cancel" onclick="adminPanel.cancelBooking(${booking.id})">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                            <button class="table-btn btn-notify" onclick="adminPanel.openNotificationModal(${booking.id})">
                                <i class="fas fa-bell"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }
    
    async loadServices() {
        try {
            const response = await salonAPI.getServicesAdmin();
            
            if (response.success) {
                this.renderServices(response.data);
            }
        } catch (error) {
            console.error('Error loading services:', error);
        }
    }
    
    renderServices(services) {
        const container = document.getElementById('servicesTable');
        if (!container) return;
        
        if (!services || services.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #667171;">
                    <i class="fas fa-scissors fa-3x"></i>
                    <p>Нет услуг</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Название</th>
                        <th>Категория</th>
                        <th>Цена</th>
                        <th>Длительность</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        services.forEach(service => {
            const isActive = service.is_active !== false;
            
            html += `
                <tr>
                    <td>${service.id}</td>
                    <td>
                        <strong>${service.name}</strong>
                        ${service.description ? `<br><small>${service.description}</small>` : ''}
                    </td>
                    <td>${service.category}</td>
                    <td>${service.price} ₽</td>
                    <td>${service.duration_minutes || 60} мин</td>
                    <td><span class="status ${isActive ? 'status-confirmed' : 'status-cancelled'}">
                        ${isActive ? 'Активна' : 'Неактивна'}
                    </span></td>
                    <td>
                        <div class="table-actions">
                            <button class="table-btn btn-view" onclick="adminPanel.editService(${service.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="table-btn btn-cancel" onclick="adminPanel.deleteService(${service.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }
    
    async loadMasters() {
        try {
            const response = await salonAPI.getMastersAdmin();
            
            if (response.success) {
                this.renderMasters(response.data);
            }
        } catch (error) {
            console.error('Error loading masters:', error);
        }
    }
    
    async loadSettings() {
        try {
            const response = await salonAPI.getSettings();
            
            if (response.success) {
                const settings = response.data;
                document.getElementById('salonName').value = settings.salon_name || '';
                document.getElementById('salonPhone').value = settings.salon_phone || '';
                document.getElementById('salonAddress').value = settings.salon_address || '';
                document.getElementById('workingHours').value = settings.working_hours || '';
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    async saveSettings() {
        try {
            const settingsData = {
                salon_name: document.getElementById('salonName').value,
                salon_phone: document.getElementById('salonPhone').value,
                salon_address: document.getElementById('salonAddress').value,
                working_hours: document.getElementById('workingHours').value
            };
            
            const response = await salonAPI.saveSettings(settingsData);
            
            if (response.success) {
                showNotification('Настройки сохранены', 'success');
            } else {
                showNotification(response.error || 'Ошибка сохранения', 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showNotification('Ошибка соединения с сервером', 'error');
        }
    }
    
    // Экспорт методов в глобальную область видимости
    confirmBooking = async (bookingId) => {
        if (confirm('Подтвердить запись?')) {
            try {
                const response = await salonAPI.updateBookingStatus(bookingId, 'confirmed');
                if (response.success) {
                    showNotification('Запись подтверждена', 'success');
                    this.loadBookings();
                    this.loadDashboard();
                }
            } catch (error) {
                showNotification('Ошибка при подтверждении', 'error');
            }
        }
    }
    
    cancelBooking = async (bookingId) => {
        if (confirm('Отменить запись?')) {
            try {
                const response = await salonAPI.updateBookingStatus(bookingId, 'cancelled');
                if (response.success) {
                    showNotification('Запись отменена', 'success');
                    this.loadBookings();
                    this.loadDashboard();
                }
            } catch (error) {
                showNotification('Ошибка при отмене', 'error');
            }
        }
    }

    // ===== УСЛУГИ =====
    openServiceModal = async (serviceId = null) => {
        const modal = document.getElementById('serviceModal');
        if (!modal) return;

        // сброс
        document.getElementById('serviceId').value = '';
        document.getElementById('serviceName').value = '';
        document.getElementById('serviceCategory').value = '';
        document.getElementById('servicePrice').value = '';
        document.getElementById('serviceDuration').value = 60;
        document.getElementById('serviceDescription').value = '';

        const title = document.getElementById('serviceModalTitle');
        if (serviceId) {
            if (title) title.innerHTML = '<i class="fas fa-edit"></i> Редактировать услугу';
            try {
                const resp = await salonAPI.getServicesAdmin();
                const service = resp?.success ? (resp.data || []).find(s => String(s.id) === String(serviceId)) : null;
                if (service) {
                    document.getElementById('serviceId').value = service.id;
                    document.getElementById('serviceName').value = service.name || '';
                    document.getElementById('serviceCategory').value = service.category || '';
                    document.getElementById('servicePrice').value = service.price || '';
                    document.getElementById('serviceDuration').value = service.duration_minutes || 60;
                    document.getElementById('serviceDescription').value = service.description || '';
                }
            } catch (e) {}
        } else {
            if (title) title.innerHTML = '<i class="fas fa-plus"></i> Добавить новую услугу';
        }

        modal.classList.add('active');
    }

    saveService = async () => {
        try {
            const payload = {
                id: document.getElementById('serviceId').value || null,
                name: document.getElementById('serviceName').value,
                category: document.getElementById('serviceCategory').value,
                price: Number(document.getElementById('servicePrice').value || 0),
                duration_minutes: Number(document.getElementById('serviceDuration').value || 60),
                description: document.getElementById('serviceDescription').value || ''
            };

            const resp = await salonAPI.saveService(payload);
            if (resp.success) {
                document.getElementById('serviceModal')?.classList.remove('active');
                showNotification('Услуга сохранена', 'success');
                this.loadServices();
                this.loadDashboard();
            } else {
                showNotification(resp.error || 'Ошибка сохранения услуги', 'error');
            }
        } catch (e) {
            console.error(e);
            showNotification('Ошибка соединения с сервером', 'error');
        }
    }

    // ===== МАСТЕРА =====
    renderMasters(masters) {
        const container = document.getElementById('mastersTable');
        if (!container) return;

        if (!masters || masters.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #667171;">
                    <i class="fas fa-users fa-3x"></i>
                    <p>Нет мастеров</p>
                </div>
            `;
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Мастер</th>
                        <th>Специализация</th>
                        <th>Опыт</th>
                        <th>Фото</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
        `;

        masters.forEach(m => {
            const isActive = m.is_active !== false && String(m.is_active) !== '0';
            html += `
                <tr>
                    <td>${m.id}</td>
                    <td>
                        <strong>${m.name}</strong>
                        ${m.bio ? `<br><small>${m.bio}</small>` : ''}
                    </td>
                    <td>${m.specialization || ''}</td>
                    <td>${m.experience_years || 0} лет</td>
                    <td>${m.photo ? m.photo : '-'}</td>
                    <td><span class="status ${isActive ? 'status-confirmed' : 'status-cancelled'}">
                        ${isActive ? 'Активен' : 'Неактивен'}
                    </span></td>
                    <td>
                        <div class="table-actions">
                            <button class="table-btn" title="${isActive ? 'Деактивировать' : 'Активировать'}" style="background: ${isActive ? '#a77c56' : '#7a9b8d'};" onclick="adminPanel.toggleMasterActive(${m.id}, ${isActive ? 0 : 1})">
                                <i class="fas ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                            </button>
                            <button class="table-btn btn-view" onclick="adminPanel.editMaster(${m.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="table-btn btn-cancel" onclick="adminPanel.deleteMaster(${m.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    openMasterModal = async (masterId = null) => {
        const modal = document.getElementById('masterModal');
        if (!modal) return;

        // сброс
        document.getElementById('masterId').value = '';
        document.getElementById('masterName').value = '';
        document.getElementById('masterSpecialization').value = '';
        document.getElementById('masterExperience').value = 0;
        document.getElementById('masterPhoto').value = '';
        document.getElementById('masterBio').value = '';
document.getElementById('masterIsActive') && (document.getElementById('masterIsActive').checked = true);

        const title = document.getElementById('masterModalTitle');

        if (masterId) {
            if (title) title.innerHTML = '<i class="fas fa-edit"></i> Редактировать мастера';
            try {
                const resp = await salonAPI.getMastersAdmin();
                const master = resp?.success ? (resp.data || []).find(m => String(m.id) === String(masterId)) : null;
                if (master) {
                    document.getElementById('masterId').value = master.id;
                    document.getElementById('masterName').value = master.name || '';
                    document.getElementById('masterSpecialization').value = master.specialization || '';
                    document.getElementById('masterExperience').value = master.experience_years || 0;
                    document.getElementById('masterPhoto').value = master.photo || '';
                    document.getElementById('masterBio').value = master.bio || '';
document.getElementById('masterIsActive') && (document.getElementById('masterIsActive').checked = (master.is_active !== false && String(master.is_active) !== '0'));
                }
            } catch (e) {}
        } else {
            if (title) title.innerHTML = '<i class="fas fa-user-plus"></i> Добавить нового мастера';
        }

        modal.classList.add('active');
    }

    saveMaster = async () => {
        try {
            const payload = {
                id: document.getElementById('masterId').value || null,
                name: document.getElementById('masterName').value,
                specialization: document.getElementById('masterSpecialization').value,
                experience_years: Number(document.getElementById('masterExperience').value || 0),
                photo: document.getElementById('masterPhoto').value || '',
                bio: document.getElementById('masterBio').value || '',
                is_active: (document.getElementById('masterIsActive') ? (document.getElementById('masterIsActive').checked ? 1 : 0) : 1)
            };

            const resp = await salonAPI.saveMaster(payload);
            if (resp.success) {
                document.getElementById('masterModal')?.classList.remove('active');
                showNotification('Мастер сохранён', 'success');
                this.loadMasters();
                this.loadDashboard();
            } else {
                showNotification(resp.error || 'Ошибка сохранения мастера', 'error');
            }
        } catch (e) {
            console.error(e);
            showNotification('Ошибка соединения с сервером', 'error');
        }
    }

    editMaster = (masterId) => {
        this.openMasterModal(masterId);
    }

    deleteMaster = async (masterId) => {
        if (confirm('Удалить мастера?')) {
            try {
                const resp = await salonAPI.deleteMaster(masterId);
                if (resp.success) {
                    showNotification('Мастер удалён', 'success');
                    this.loadMasters();
                    this.loadDashboard();
                } else {
                    showNotification(resp.error || 'Ошибка удаления', 'error');
                }
            } catch (e) {
                showNotification('Ошибка при удалении', 'error');
            }
        }
    }



    toggleMasterActive = async (masterId, isActive) => {
        try {
            const resp = await salonAPI.toggleMasterActive(masterId, isActive);
            if (resp.success) {
                showNotification(isActive ? 'Мастер активирован' : 'Мастер деактивирован', 'success');
                this.loadMasters();
                this.loadDashboard();
            } else {
                showNotification(resp.error || 'Не удалось изменить статус мастера', 'error');
            }
        } catch (e) {
            showNotification('Ошибка соединения с сервером', 'error');
        }
    }
    // ===== УВЕДОМЛЕНИЯ =====
    openNotificationModal = async (bookingId) => {
        const msg = prompt('Введите сообщение клиенту (уведомление в кабинете клиента):');
        if (!msg) return;
        try {
            const resp = await salonAPI.sendNotification(bookingId, msg);
            if (resp.success) {
                showNotification('Уведомление отправлено', 'success');
            } else {
                showNotification(resp.error || 'Не удалось отправить уведомление', 'error');
            }
        } catch (e) {
            showNotification('Ошибка соединения с сервером', 'error');
        }
    }
    
    editService = (serviceId) => {
        this.openServiceModal(serviceId);
    }
    
    deleteService = async (serviceId) => {
        if (confirm('Удалить услугу?')) {
            try {
                const response = await salonAPI.deleteService(serviceId);
                if (response.success) {
                    showNotification('Услуга удалена', 'success');
                    this.loadServices();
                    this.loadDashboard();
                }
            } catch (error) {
                showNotification('Ошибка при удалении', 'error');
            }
        }
    }
    
    filterBookings = (status) => {
        this.loadBookings(status);
    }
    
    exportBookings = async () => {
        try {
            await salonAPI.exportBookings({ status: 'all' });
            showNotification('Данные экспортированы', 'success');
        } catch (error) {
            showNotification('Ошибка при экспорте', 'error');
        }
    }
}

// Экспорт для использования в HTML
window.AdminPanel = AdminPanel;
window.adminPanel = null;


// ===== FIX V5: нормальное отображение сообщений и финансовых отчётов =====
AdminPanel.prototype.loadMessages = async function() {
    const container = document.getElementById('messagesTable');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Загрузка сообщений...</div>';

    try {
        const response = await salonAPI.getContactMessages();
        if (!response || response.success !== true) {
            container.innerHTML = `<div class="empty-state">Не удалось загрузить сообщения${response?.error ? ': ' + response.error : ''}</div>`;
            return;
        }

        const messages = response.data || [];
        if (!messages.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><br>Сообщений обратной связи пока нет.</div>';
            return;
        }

        let html = `
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Имя</th>
                            <th>Телефон</th>
                            <th>Email</th>
                            <th>Сообщение</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        messages.forEach(item => {
            html += `
                <tr>
                    <td><strong>${item.created_at_formatted || item.created_at || '—'}</strong></td>
                    <td>${item.name || '—'}</td>
                    <td>${item.phone || '—'}</td>
                    <td><span class="muted">${item.email || '—'}</span></td>
                    <td class="message-text">${item.message || '—'}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty-state">Не удалось загрузить сообщения. Проверьте подключение к базе данных.</div>';
    }
};

AdminPanel.prototype.loadReports = async function() {
    const cards = document.getElementById('reportCards');
    const table = document.getElementById('reportsTable');
    if (!cards || !table) return;

    cards.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Загрузка отчёта...</div>';
    table.innerHTML = '';

    try {
        const response = await salonAPI.getFinancialReport();
        if (!response || response.success !== true) {
            cards.innerHTML = `<div class="empty-state">Не удалось загрузить финансовые отчёты${response?.error ? ': ' + response.error : ''}</div>`;
            return;
        }

        const s = response.summary || {};
        const money = (value) => `${Number(value || 0).toLocaleString('ru-RU')} ₽`;

        cards.innerHTML = `
            <div class="stat-card">
                <i class="fas fa-calendar-check" style="font-size:2rem;color:var(--primary);"></i>
                <div class="stat-value">${Number(s.all_count || 0)}</div>
                <p>Всего записей</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-clock" style="font-size:2rem;color:var(--primary);"></i>
                <div class="stat-value">${Number(s.new_count || 0)}</div>
                <p>Новых заявок</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-check-circle" style="font-size:2rem;color:var(--primary);"></i>
                <div class="stat-value">${Number(s.confirmed_count || 0)}</div>
                <p>Подтверждено</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-ruble-sign" style="font-size:2rem;color:var(--primary);"></i>
                <div class="stat-value">${money(s.total_revenue)}</div>
                <p>Фактическая выручка</p>
            </div>
        `;

        const monthly = response.monthly || [];
        if (!monthly.length) {
            table.innerHTML = '<div class="empty-state">Пока нет данных для помесячного отчёта.</div>';
            return;
        }

        let html = `
            <div class="report-note">
                Выручка считается только по подтверждённым и завершённым записям. Новые заявки отображаются в количестве, но не включаются в доход.
            </div>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Месяц</th>
                            <th>Всего записей</th>
                            <th>Новые заявки</th>
                            <th>Подтверждено</th>
                            <th>Выручка</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        monthly.forEach(row => {
            html += `
                <tr>
                    <td><strong>${row.period || '—'}</strong></td>
                    <td>${Number(row.bookings_count || 0)}</td>
                    <td>${Number(row.new_count || 0)}</td>
                    <td>${Number(row.confirmed_count || 0)}</td>
                    <td class="report-positive">${money(row.revenue)}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        table.innerHTML = html;
    } catch (error) {
        console.error(error);
        cards.innerHTML = '<div class="empty-state">Не удалось загрузить финансовые отчёты. Проверьте PHP-файл и подключение к базе данных.</div>';
    }
};



// ===== ДОРАБОТКА: реальный чат с клиентами, перенос записей мастера =====
(function() {
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));

    function statusInfo(status) {
        if (status === 'confirmed') return ['status-confirmed', 'Подтверждена'];
        if (status === 'cancelled') return ['status-cancelled', 'Отменена'];
        if (status === 'transfer_proposed') return ['status-new', 'Предложен перенос'];
        return ['status-new', 'Новая'];
    }

    AdminPanel.prototype.renderBookings = function(bookings) {
        const container = document.getElementById('bookingsTable');
        if (!container) return;
        if (!bookings || bookings.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:3rem;color:#667171;"><i class="fas fa-calendar-times fa-3x"></i><p>Нет записей</p></div>`;
            return;
        }
        let html = `<table><thead><tr><th>№</th><th>Клиент</th><th>Услуга</th><th>Мастер</th><th>Дата</th><th>Время</th><th>Статус</th><th>Действия</th></tr></thead><tbody>`;
        bookings.forEach(booking => {
            const [cls, text] = statusInfo(booking.status);
            html += `
                <tr>
                    <td><strong>${escapeHtml(booking.booking_number || ('B' + String(booking.id).padStart(6, '0')))}</strong></td>
                    <td><div><strong>${escapeHtml(booking.client_name)}</strong></div><small>${escapeHtml(booking.formatted_phone || booking.phone)}</small>${booking.comment ? `<br><small><em>${escapeHtml(booking.comment)}</em></small>` : ''}</td>
                    <td>${escapeHtml(booking.service_name || 'Неизвестно')}</td>
                    <td>${escapeHtml(booking.master_name || 'Любой')}</td>
                    <td>${escapeHtml(booking.formatted_date || booking.desired_date)}</td>
                    <td>${escapeHtml(booking.desired_time)}</td>
                    <td><span class="status ${cls}">${text}</span></td>
                    <td><div class="table-actions">
                        ${booking.status === 'new' ? `
                            <button class="table-btn btn-confirm" title="Подтвердить" onclick="adminPanel.confirmBooking(${booking.id})"><i class="fas fa-check"></i></button>
                            <button class="table-btn btn-cancel" title="Отменить" onclick="adminPanel.cancelBooking(${booking.id})"><i class="fas fa-times"></i></button>` : ''}
                        <button class="table-btn btn-notify" title="Уведомление" onclick="adminPanel.openNotificationModal(${booking.id})"><i class="fas fa-bell"></i></button>
                        <button class="table-btn btn-view" title="Предложить перенос" onclick="adminPanel.openTransferModal(${booking.id})"><i class="fas fa-calendar-alt"></i></button>
                    </div></td>
                </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    };

    AdminPanel.prototype.renderMasters = function(masters) {
        const container = document.getElementById('mastersTable');
        if (!container) return;
        if (!masters || masters.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:3rem;color:#667171;"><i class="fas fa-users fa-3x"></i><p>Нет мастеров</p></div>`;
            return;
        }
        let html = `<table><thead><tr><th>ID</th><th>Мастер</th><th>Специализация</th><th>Опыт</th><th>Фото</th><th>Будущие записи</th><th>Статус</th><th>Действия</th></tr></thead><tbody>`;
        masters.forEach(m => {
            const isActive = m.is_active !== false && String(m.is_active) !== '0';
            const activeBookings = Number(m.active_bookings || 0);
            html += `
                <tr>
                    <td>${Number(m.id)}</td>
                    <td><strong>${escapeHtml(m.name)}</strong>${m.bio ? `<br><small>${escapeHtml(m.bio)}</small>` : ''}</td>
                    <td>${escapeHtml(m.specialization || '')}</td>
                    <td>${Number(m.experience_years || 0)} лет</td>
                    <td>${m.photo ? escapeHtml(m.photo) : '-'}</td>
                    <td>${activeBookings > 0 ? `<strong style="color:#a77c56;">${activeBookings}</strong>` : '0'}</td>
                    <td><span class="status ${isActive ? 'status-confirmed' : 'status-cancelled'}">${isActive ? 'Активен' : 'Неактивен'}</span></td>
                    <td><div class="table-actions">
                        ${activeBookings > 0 ? `<button class="table-btn btn-notify" title="Решить проблему с записями" onclick="adminPanel.openMasterProblemBookings(${m.id})"><i class="fas fa-triangle-exclamation"></i></button>` : ''}
                        <button class="table-btn" title="${isActive ? 'Деактивировать' : 'Активировать'}" style="background:${isActive ? '#a77c56' : '#7a9b8d'};" onclick="adminPanel.toggleMasterActive(${m.id}, ${isActive ? 0 : 1})"><i class="fas ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
                        <button class="table-btn btn-view" title="Редактировать" onclick="adminPanel.editMaster(${m.id})"><i class="fas fa-edit"></i></button>
                        <button class="table-btn btn-cancel" title="Удалить" onclick="adminPanel.deleteMaster(${m.id})"><i class="fas fa-trash"></i></button>
                    </div></td>
                </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    };

    AdminPanel.prototype.loadMessages = async function() {
        const container = document.getElementById('messagesTable');
        if (!container) return;
        container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Загрузка диалогов...</div>';
        try {
            const response = await salonAPI.getContactMessages();
            if (!response.success) throw new Error(response.error || 'Не удалось загрузить сообщения');
            const messages = response.data || [];
            if (!messages.length) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><br>Сообщений пока нет.</div>';
                return;
            }
            container.innerHTML = `
                <div class="admin-chat-layout">
                    <div class="admin-chat-list">
                        ${messages.map(item => `
                            <button class="admin-chat-thread" onclick="adminPanel.openChat(${item.id})">
                                <span><strong>${escapeHtml(item.name)}</strong> ${Number(item.unread_count || 0) > 0 ? `<b class="chat-badge">${Number(item.unread_count)}</b>` : ''}</span>
                                <small>${escapeHtml(item.phone || '')} · ${escapeHtml(item.latest_at_formatted || item.created_at_formatted || '')}</small>
                                <em>${escapeHtml(item.latest_message || item.message || '')}</em>
                            </button>`).join('')}
                    </div>
                    <div class="admin-chat-window" id="adminChatWindow">
                        <div class="chat-empty"><i class="fas fa-comments"></i><br>Выберите диалог слева</div>
                    </div>
                </div>`;
        } catch (error) {
            container.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        }
    };

    AdminPanel.prototype.openChat = async function(contactId) {
        const win = document.getElementById('adminChatWindow');
        if (!win) return;
        win.innerHTML = '<div class="chat-empty"><i class="fas fa-spinner fa-spin"></i> Загрузка переписки...</div>';
        try {
            const response = await salonAPI.getAdminChatMessages(contactId);
            if (!response.success) throw new Error(response.error || 'Не удалось открыть чат');
            const contact = response.contact || {};
            const msgs = response.data || [];
            win.innerHTML = `
                <div class="admin-chat-head">
                    <div><strong>${escapeHtml(contact.name || 'Клиент')}</strong><br><small>${escapeHtml(contact.phone || '')} ${contact.email ? ' · ' + escapeHtml(contact.email) : ''}</small></div>
                </div>
                <div class="admin-chat-messages" id="adminChatMessages">
                    ${msgs.map(msg => `
                        <div class="chat-message ${msg.sender_type === 'admin' ? 'admin' : 'client'}">
                            <div class="chat-message-meta">${msg.sender_type === 'admin' ? 'Администратор' : escapeHtml(msg.sender_name || contact.name || 'Клиент')} · ${escapeHtml(msg.created_at_formatted || '')}</div>
                            <div class="chat-message-text">${escapeHtml(msg.message)}</div>
                        </div>`).join('')}
                </div>
                <div class="admin-chat-send">
                    <input id="adminChatInput" class="form-control" type="text" placeholder="Ответить клиенту...">
                    <button class="btn" onclick="adminPanel.sendChatReply(${contactId})"><i class="fas fa-paper-plane"></i> Отправить</button>
                </div>`;
            const list = document.getElementById('adminChatMessages');
            if (list) list.scrollTop = list.scrollHeight;
            document.getElementById('adminChatInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendChatReply(contactId); });
        } catch (error) {
            win.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        }
    };

    AdminPanel.prototype.sendChatReply = async function(contactId) {
        const input = document.getElementById('adminChatInput');
        const message = input?.value.trim();
        if (!message) return;
        try {
            const response = await salonAPI.sendAdminChatMessage(contactId, message);
            if (!response.success) throw new Error(response.error || 'Не удалось отправить ответ');
            input.value = '';
            await this.openChat(contactId);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    AdminPanel.prototype.ensureTransferModal = function() {
        if (document.getElementById('transferModal')) return;
        const modal = document.createElement('div');
        modal.id = 'transferModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:760px;">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-alt"></i> Перенос записи</h3>
                    <button class="close-modal" onclick="document.getElementById('transferModal').classList.remove('active')">&times;</button>
                </div>
                <div class="modal-body" id="transferModalBody"></div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
    };

    AdminPanel.prototype.openMasterProblemBookings = async function(masterId) {
        this.ensureTransferModal();
        const modal = document.getElementById('transferModal');
        const body = document.getElementById('transferModalBody');
        modal.classList.add('active');
        body.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Загружаем будущие записи мастера...</div>';
        try {
            const response = await salonAPI.getMasterProblemBookings(masterId);
            if (!response.success) throw new Error(response.error || 'Не удалось загрузить записи');
            const bookings = response.bookings || [];
            if (!bookings.length) {
                body.innerHTML = '<div class="empty-state">У этого мастера нет будущих активных записей.</div>';
                return;
            }
            body.innerHTML = `
                <p><strong>${escapeHtml(response.master?.name || 'Мастер')}</strong> недоступен. Выберите запись и предложите клиенту перенос.</p>
                <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Клиент</th><th>Услуга</th><th>Дата</th><th>Время</th><th></th></tr></thead><tbody>
                    ${bookings.map(b => `<tr><td><strong>${escapeHtml(b.client_name)}</strong><br><small>${escapeHtml(b.phone)}</small></td><td>${escapeHtml(b.service_name || '')}</td><td>${escapeHtml(b.formatted_date || b.desired_date)}</td><td>${escapeHtml(b.desired_time)}</td><td><button class="btn" onclick="adminPanel.openTransferModal(${b.id}, ${masterId})">Предложить перенос</button></td></tr>`).join('')}
                </tbody></table></div>`;
        } catch (error) {
            body.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        }
    };

    AdminPanel.prototype.openTransferModal = async function(bookingId, masterId = null) {
        this.ensureTransferModal();
        const modal = document.getElementById('transferModal');
        const body = document.getElementById('transferModalBody');
        modal.classList.add('active');
        body.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Подготовка формы переноса...</div>';
        try {
            const mastersResponse = await salonAPI.getMastersAdmin();
            const masters = (mastersResponse.success ? mastersResponse.data : []).filter(m => String(m.is_active) !== '0');
            body.innerHTML = `
                <form id="transferForm">
                    <input type="hidden" id="transferBookingId" value="${Number(bookingId)}">
                    <div class="form-group"><label>Новый мастер</label><select id="transferMasterId" class="form-control"><option value="">Любой / без изменения</option>${masters.map(m => `<option value="${m.id}">${escapeHtml(m.name)} — ${escapeHtml(m.specialization || '')}</option>`).join('')}</select></div>
                    <div class="form-row"><div class="form-group"><label>Новая дата</label><input type="date" id="transferDate" class="form-control" required></div><div class="form-group"><label>Новое время</label><input type="time" id="transferTime" class="form-control" required></div></div>
                    <div class="form-group"><label>Комментарий клиенту</label><textarea id="transferMessage" class="form-control" rows="3" placeholder="Например: мастер заболел, предлагаем удобный перенос..."></textarea></div>
                    <div style="display:flex;gap:1rem;margin-top:1rem;"><button type="submit" class="btn" style="flex:1;"><i class="fas fa-paper-plane"></i> Отправить предложение</button><button type="button" class="btn" style="background:#667171;flex:1;" onclick="document.getElementById('transferModal').classList.remove('active')">Отмена</button></div>
                </form>`;
            document.getElementById('transferForm').addEventListener('submit', (e) => { e.preventDefault(); this.submitTransferProposal(); });
        } catch (error) {
            body.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        }
    };

    AdminPanel.prototype.submitTransferProposal = async function() {
        const payload = {
            booking_id: Number(document.getElementById('transferBookingId').value),
            new_master_id: document.getElementById('transferMasterId').value,
            new_date: document.getElementById('transferDate').value,
            new_time: document.getElementById('transferTime').value,
            message: document.getElementById('transferMessage').value.trim()
        };
        try {
            const response = await salonAPI.proposeBookingTransfer(payload);
            if (!response.success) throw new Error(response.error || 'Не удалось отправить предложение');
            showNotification('Предложение переноса отправлено клиенту', 'success');
            document.getElementById('transferModal').classList.remove('active');
            this.loadBookings();
            this.loadMasters();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
})();


// ===== ДОРАБОТКА 2026-06-06: портфолио мастеров прямо в админке =====
(function() {
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));

    AdminPanel.prototype.renderMasters = function(masters) {
        const container = document.getElementById('mastersTable');
        if (!container) return;
        if (!masters || masters.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:3rem;color:#667171;"><i class="fas fa-users fa-3x"></i><p>Нет мастеров</p></div>`;
            return;
        }
        let html = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ID</th><th>Мастер</th><th>Специализация</th><th>Опыт</th><th>Фото</th><th>Будущие записи</th><th>Статус</th><th>Действия</th></tr></thead><tbody>`;
        masters.forEach(m => {
            const isActive = m.is_active !== false && String(m.is_active) !== '0';
            const activeBookings = Number(m.active_bookings || 0);
            const photo = m.photo ? `<img src="images/${escapeHtml(m.photo)}" alt="${escapeHtml(m.name)}" style="width:54px;height:54px;object-fit:cover;border-radius:12px;display:block;">` : '-';
            html += `
                <tr>
                    <td>${Number(m.id)}</td>
                    <td><strong>${escapeHtml(m.name)}</strong>${m.bio ? `<br><small>${escapeHtml(m.bio)}</small>` : ''}</td>
                    <td>${escapeHtml(m.specialization || '')}</td>
                    <td>${Number(m.experience_years || 0)} лет</td>
                    <td>${photo}</td>
                    <td>${activeBookings > 0 ? `<strong style="color:#a77c56;">${activeBookings}</strong>` : '0'}</td>
                    <td><span class="status ${isActive ? 'status-confirmed' : 'status-cancelled'}">${isActive ? 'Активен' : 'Неактивен'}</span></td>
                    <td><div class="table-actions">
                        <button class="table-btn btn-view" title="Пополнить работы мастера" onclick="adminPanel.openPortfolioManager(${Number(m.id)}, '${escapeHtml(m.name).replace(/'/g, '&#039;')}')"><i class="fas fa-images"></i></button>
                        ${activeBookings > 0 ? `<button class="table-btn btn-notify" title="Решить проблему с записями" onclick="adminPanel.openMasterProblemBookings(${Number(m.id)})"><i class="fas fa-triangle-exclamation"></i></button>` : ''}
                        <button class="table-btn" title="${isActive ? 'Деактивировать' : 'Активировать'}" style="background:${isActive ? '#a77c56' : '#7a9b8d'};" onclick="adminPanel.toggleMasterActive(${Number(m.id)}, ${isActive ? 0 : 1})"><i class="fas ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
                        <button class="table-btn btn-view" title="Редактировать" onclick="adminPanel.editMaster(${Number(m.id)})"><i class="fas fa-edit"></i></button>
                        <button class="table-btn btn-cancel" title="Удалить" onclick="adminPanel.deleteMaster(${Number(m.id)})"><i class="fas fa-trash"></i></button>
                    </div></td>
                </tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
    };

    AdminPanel.prototype.ensurePortfolioManagerModal = function() {
        if (document.getElementById('portfolioManagerModal')) return;
        const modal = document.createElement('div');
        modal.id = 'portfolioManagerModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content portfolio-admin-modal">
                <div class="modal-header">
                    <h3 id="portfolioManagerTitle"><i class="fas fa-images"></i> Работы мастера</h3>
                    <button class="close-modal" onclick="document.getElementById('portfolioManagerModal').classList.remove('active')">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="portfolioManagerList" class="portfolio-admin-list"></div>
                    <form id="portfolioUploadForm" class="portfolio-upload-form" enctype="multipart/form-data">
                        <input type="hidden" id="portfolioMasterId" name="master_id">
                        <h4><i class="fas fa-plus"></i> Добавить новую работу</h4>
                        <div class="form-group">
                            <label>Фото работы *</label>
                            <input type="file" id="portfolioImage" name="image" class="form-control" accept="image/jpeg,image/png,image/webp" required>
                            <small>JPG, PNG или WEBP, до 5 МБ. Файл сохранится в images/portfolio_uploads.</small>
                        </div>
                        <div class="form-group">
                            <label>Название работы</label>
                            <input type="text" id="portfolioTitle" name="title" class="form-control" placeholder="Например: Нежный маникюр" maxlength="120">
                        </div>
                        <div class="form-group">
                            <label>Описание</label>
                            <textarea id="portfolioDescription" name="description" class="form-control" rows="2" placeholder="Короткое описание работы" maxlength="500"></textarea>
                        </div>
                        <button type="submit" class="btn" style="width:100%;"><i class="fas fa-upload"></i> Загрузить работу</button>
                    </form>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        document.getElementById('portfolioUploadForm').addEventListener('submit', e => {
            e.preventDefault();
            this.submitPortfolioUpload();
        });
    };

    AdminPanel.prototype.openPortfolioManager = async function(masterId, masterName = '') {
        this.ensurePortfolioManagerModal();
        document.getElementById('portfolioMasterId').value = masterId;
        document.getElementById('portfolioManagerTitle').innerHTML = `<i class="fas fa-images"></i> Работы мастера: ${escapeHtml(masterName || '')}`;
        document.getElementById('portfolioManagerModal').classList.add('active');
        await this.loadPortfolioManagerList(masterId);
    };

    AdminPanel.prototype.loadPortfolioManagerList = async function(masterId) {
        const list = document.getElementById('portfolioManagerList');
        list.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Загружаем портфолио...</div>';
        try {
            const response = await salonAPI.getAdminMasterPortfolio(masterId);
            if (!response.success) throw new Error(response.error || 'Не удалось загрузить портфолио');
            const items = response.data || [];
            if (!items.length) {
                list.innerHTML = '<div class="empty-state">Пока нет работ. Добавьте первое фото ниже.</div>';
                return;
            }
            list.innerHTML = items.map(item => `
                <div class="portfolio-admin-item">
                    <img src="images/${escapeHtml(item.image)}" alt="${escapeHtml(item.title || 'Работа мастера')}">
                    <div>
                        <strong>${escapeHtml(item.title || 'Работа мастера')}</strong>
                        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
                        <small>${escapeHtml(item.created_at_formatted || '')}</small>
                    </div>
                    <button class="table-btn btn-cancel" title="Удалить работу" onclick="adminPanel.deletePortfolioItem(${Number(item.id)}, ${Number(masterId)})"><i class="fas fa-trash"></i></button>
                </div>`).join('');
        } catch (error) {
            list.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        }
    };

    AdminPanel.prototype.submitPortfolioUpload = async function() {
        const masterId = document.getElementById('portfolioMasterId').value;
        const file = document.getElementById('portfolioImage').files[0];
        if (!file) return showNotification('Выберите фото работы', 'error');
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return showNotification('Можно загрузить только JPG, PNG или WEBP', 'error');
        if (file.size > 5 * 1024 * 1024) return showNotification('Файл должен быть не больше 5 МБ', 'error');

        const fd = new FormData();
        fd.append('master_id', masterId);
        fd.append('image', file);
        fd.append('title', document.getElementById('portfolioTitle').value.trim());
        fd.append('description', document.getElementById('portfolioDescription').value.trim());
        try {
            const response = await salonAPI.uploadMasterPortfolio(fd);
            if (!response.success) throw new Error(response.error || 'Не удалось загрузить работу');
            showNotification('Работа добавлена в портфолио', 'success');
            document.getElementById('portfolioUploadForm').reset();
            await this.loadPortfolioManagerList(masterId);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    AdminPanel.prototype.deletePortfolioItem = async function(itemId, masterId) {
        if (!confirm('Удалить эту работу из портфолио мастера?')) return;
        try {
            const response = await salonAPI.deleteMasterPortfolio(itemId);
            if (!response.success) throw new Error(response.error || 'Не удалось удалить работу');
            showNotification('Работа удалена', 'success');
            await this.loadPortfolioManagerList(masterId);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
})();

// ===== FIX 2026-06-08: перенос по слотам, фильтр мастеров, статусы чата, удаление чатов =====
(function() {
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
    const money = (value) => `${Number(value || 0).toLocaleString('ru-RU')} ₽`;

    function todayIso() {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 10);
    }

    function statusInfo(status) {
        if (['confirmed','Подтверждена','Подтверждено'].includes(status)) return ['status-confirmed', 'Подтверждена'];
        if (['completed','Завершена','Завершено'].includes(status)) return ['status-confirmed', 'Завершена'];
        if (['cancelled','Отменена','Отклонена'].includes(status)) return ['status-cancelled', 'Отменена'];
        if (status === 'transfer_proposed') return ['status-new', 'Предложен перенос'];
        return ['status-new', 'Новая'];
    }

    AdminPanel.prototype.loadDashboard = async function() {
        try {
            const response = await salonAPI.getStats();
            if (!response.success) throw new Error(response.error || 'Не удалось загрузить статистику');
            const stats = response.stats || {};
            document.getElementById('statNewBookings').textContent = stats.new_bookings || 0;
            document.getElementById('statTotalServices').textContent = stats.total_services || 0;
            document.getElementById('statActiveMasters').textContent = stats.active_masters || 0;
            document.getElementById('statTodayBookings').textContent = stats.today_bookings || 0;

            const dashboard = document.getElementById('dashboard');
            let note = document.getElementById('dashboardFinanceNote');
            if (dashboard && !note) {
                note = document.createElement('div');
                note.id = 'dashboardFinanceNote';
                note.className = 'report-note';
                note.style.marginTop = '1rem';
                const btnBlock = dashboard.querySelector('div[style*="text-align: center"]');
                dashboard.insertBefore(note, btnBlock || null);
            }
            if (note) {
                note.innerHTML = `
                    <strong>Сверка с финансовым отчётом:</strong>
                    всего записей — ${Number(stats.total_bookings || 0)},
                    подтверждено/завершено — ${Number(stats.confirmed_bookings || 0)},
                    предложен перенос — ${Number(stats.transfer_proposed_bookings || 0)},
                    выручка — ${money(stats.total_revenue)}.
                    <br><small>Доход считается только по подтверждённым и завершённым записям, поэтому новые заявки не прибавляются к выручке.</small>`;
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showNotification(error.message || 'Ошибка загрузки дашборда', 'error');
        }
    };

    AdminPanel.prototype.renderBookings = function(bookings) {
        const container = document.getElementById('bookingsTable');
        if (!container) return;
        if (!bookings || bookings.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:3rem;color:#667171;"><i class="fas fa-calendar-times fa-3x"></i><p>Нет записей</p></div>`;
            return;
        }
        let html = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>№</th><th>Клиент</th><th>Услуга</th><th>Мастер</th><th>Дата</th><th>Время</th><th>Статус</th><th>Действия</th></tr></thead><tbody>`;
        bookings.forEach(booking => {
            const [cls, text] = statusInfo(booking.status);
            html += `
                <tr>
                    <td><strong>${escapeHtml(booking.booking_number || ('B' + String(booking.id).padStart(6, '0')))}</strong></td>
                    <td><div><strong>${escapeHtml(booking.client_name)}</strong></div><small>${escapeHtml(booking.formatted_phone || booking.phone)}</small>${booking.comment ? `<br><small><em>${escapeHtml(booking.comment)}</em></small>` : ''}</td>
                    <td>${escapeHtml(booking.service_name || 'Неизвестно')}</td>
                    <td>${escapeHtml(booking.master_name || 'Любой')}</td>
                    <td>${escapeHtml(booking.formatted_date || booking.desired_date)}</td>
                    <td>${escapeHtml(booking.desired_time)}</td>
                    <td><span class="status ${cls}">${text}</span></td>
                    <td><div class="table-actions">
                        ${booking.status === 'new' ? `
                            <button class="table-btn btn-confirm" title="Подтвердить" onclick="adminPanel.confirmBooking(${Number(booking.id)})"><i class="fas fa-check"></i></button>
                            <button class="table-btn btn-cancel" title="Отменить" onclick="adminPanel.cancelBooking(${Number(booking.id)})"><i class="fas fa-times"></i></button>` : ''}
                        <button class="table-btn btn-notify" title="Уведомление" onclick="adminPanel.openNotificationModal(${Number(booking.id)})"><i class="fas fa-bell"></i></button>
                        <button class="table-btn btn-view" title="Предложить перенос" onclick="adminPanel.openTransferModal(${Number(booking.id)})"><i class="fas fa-calendar-alt"></i></button>
                    </div></td>
                </tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
    };

    AdminPanel.prototype.loadReports = async function() {
        const cards = document.getElementById('reportCards');
        const table = document.getElementById('reportsTable');
        if (!cards || !table) return;
        cards.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Загрузка отчёта...</div>';
        table.innerHTML = '';
        try {
            const response = await salonAPI.getFinancialReport();
            if (!response || response.success !== true) throw new Error(response?.error || 'Не удалось загрузить финансовые отчёты');
            const s = response.summary || {};
            cards.innerHTML = `
                <div class="stat-card"><i class="fas fa-calendar-check" style="font-size:2rem;color:var(--primary);"></i><div class="stat-value">${Number(s.all_count || 0)}</div><p>Всего записей</p></div>
                <div class="stat-card"><i class="fas fa-clock" style="font-size:2rem;color:var(--primary);"></i><div class="stat-value">${Number(s.new_count || 0)}</div><p>Новых заявок</p></div>
                <div class="stat-card"><i class="fas fa-check-circle" style="font-size:2rem;color:var(--primary);"></i><div class="stat-value">${Number(s.confirmed_count || 0)}</div><p>Подтверждено/завершено</p></div>
                <div class="stat-card"><i class="fas fa-ruble-sign" style="font-size:2rem;color:var(--primary);"></i><div class="stat-value">${money(s.total_revenue)}</div><p>Фактическая выручка</p></div>`;
            const monthly = response.monthly || [];
            if (!monthly.length) {
                table.innerHTML = '<div class="empty-state">Пока нет данных для помесячного отчёта.</div>';
                return;
            }
            table.innerHTML = `
                <div class="report-note">Выручка считается только по подтверждённым и завершённым записям. Новые заявки и предложенные переносы показываются в количестве, но не входят в доход.</div>
                <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Месяц</th><th>Всего</th><th>Новые</th><th>Переносы</th><th>Подтверждено</th><th>Отменено</th><th>Выручка</th></tr></thead><tbody>
                    ${monthly.map(row => `<tr><td><strong>${escapeHtml(row.period || '—')}</strong></td><td>${Number(row.bookings_count || 0)}</td><td>${Number(row.new_count || 0)}</td><td>${Number(row.transfer_count || 0)}</td><td>${Number(row.confirmed_count || 0)}</td><td>${Number(row.cancelled_count || 0)}</td><td class="report-positive">${money(row.revenue)}</td></tr>`).join('')}
                </tbody></table></div>`;
        } catch (error) {
            console.error(error);
            cards.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'Не удалось загрузить финансовые отчёты')}</div>`;
        }
    };

    AdminPanel.prototype.loadMessages = async function() {
        const container = document.getElementById('messagesTable');
        if (!container) return;
        container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Загрузка диалогов...</div>';
        try {
            const response = await salonAPI.getContactMessages();
            if (!response.success) throw new Error(response.error || 'Не удалось загрузить сообщения');
            const messages = response.data || [];
            if (!messages.length) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><br>Сообщений пока нет.</div>';
                return;
            }
            container.innerHTML = `
                <div class="admin-chat-layout">
                    <div class="admin-chat-list">
                        ${messages.map(item => {
                            const answered = String(item.reply_status || '') === 'answered';
                            return `<div class="admin-chat-thread-wrap ${answered ? 'answered' : 'unanswered'}">
                                <button class="admin-chat-thread" onclick="adminPanel.openChat(${Number(item.id)})">
                                    <span><strong>${escapeHtml(item.name)}</strong> ${Number(item.unread_count || 0) > 0 ? `<b class="chat-badge">${Number(item.unread_count)}</b>` : ''}</span>
                                    <small>${escapeHtml(item.phone || '')} · ${escapeHtml(item.latest_at_formatted || item.created_at_formatted || '')}</small>
                                    <em>${escapeHtml(item.latest_message || item.message || '')}</em>
                                    <b class="chat-status ${answered ? 'answered' : 'unanswered'}">${answered ? 'Отвечено' : 'Не отвечено'}</b>
                                </button>
                                <button class="chat-delete-thread" title="Удалить диалог" onclick="adminPanel.deleteChatDialog(${Number(item.id)})"><i class="fas fa-trash"></i></button>
                            </div>`;
                        }).join('')}
                    </div>
                    <div class="admin-chat-window" id="adminChatWindow"><div class="chat-empty"><i class="fas fa-comments"></i><br>Выберите диалог слева</div></div>
                </div>`;
        } catch (error) {
            container.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        }
    };

    AdminPanel.prototype.openChat = async function(contactId) {
        const win = document.getElementById('adminChatWindow');
        if (!win) return;
        win.innerHTML = '<div class="chat-empty"><i class="fas fa-spinner fa-spin"></i> Загрузка переписки...</div>';
        try {
            const response = await salonAPI.getAdminChatMessages(contactId);
            if (!response.success) throw new Error(response.error || 'Не удалось открыть чат');
            const contact = response.contact || {};
            const msgs = response.data || [];
            win.innerHTML = `
                <div class="admin-chat-head">
                    <div><strong>${escapeHtml(contact.name || 'Клиент')}</strong><br><small>${escapeHtml(contact.phone || '')}${contact.email ? ' · ' + escapeHtml(contact.email) : ''}</small></div>
                    <button class="table-btn btn-cancel" title="Удалить весь диалог" onclick="adminPanel.deleteChatDialog(${Number(contactId)})"><i class="fas fa-trash"></i></button>
                </div>
                <div class="admin-chat-messages" id="adminChatMessages">
                    ${msgs.map(msg => `
                        <div class="chat-message ${msg.sender_type === 'admin' ? 'admin' : 'client'}">
                            <div class="chat-message-meta">
                                <span>${msg.sender_type === 'admin' ? 'Администратор' : escapeHtml(msg.sender_name || contact.name || 'Клиент')} · ${escapeHtml(msg.created_at_formatted || '')}</span>
                                <button class="chat-delete-message" title="Удалить сообщение" onclick="adminPanel.deleteChatMessage(${Number(msg.id)}, ${Number(contactId)})"><i class="fas fa-trash"></i></button>
                            </div>
                            <div class="chat-message-text">${escapeHtml(msg.message)}</div>
                        </div>`).join('') || '<div class="chat-empty">В диалоге пока нет сообщений.</div>'}
                </div>
                <div class="admin-chat-send">
                    <input id="adminChatInput" class="form-control" type="text" placeholder="Ответить клиенту...">
                    <button class="btn" onclick="adminPanel.sendChatReply(${Number(contactId)})"><i class="fas fa-paper-plane"></i> Отправить</button>
                </div>`;
            const list = document.getElementById('adminChatMessages');
            if (list) list.scrollTop = list.scrollHeight;
            document.getElementById('adminChatInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendChatReply(contactId); });
        } catch (error) {
            win.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        }
    };

    AdminPanel.prototype.sendChatReply = async function(contactId) {
        const input = document.getElementById('adminChatInput');
        const message = input?.value.trim();
        if (!message) return;
        try {
            const response = await salonAPI.sendAdminChatMessage(contactId, message);
            if (!response.success) throw new Error(response.error || 'Не удалось отправить ответ');
            input.value = '';
            await this.loadMessages();
            await this.openChat(contactId);
            showNotification('Ответ отправлен', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    AdminPanel.prototype.deleteChatMessage = async function(messageId, contactId) {
        if (!confirm('Удалить это сообщение?')) return;
        try {
            const response = await salonAPI.deleteAdminChatMessage(messageId);
            if (!response.success) throw new Error(response.error || 'Не удалось удалить сообщение');
            await this.loadMessages();
            await this.openChat(contactId);
            showNotification('Сообщение удалено', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    AdminPanel.prototype.deleteChatDialog = async function(contactId) {
        if (!confirm('Удалить весь диалог с клиентом? Это действие нельзя отменить.')) return;
        try {
            const response = await salonAPI.deleteAdminChatDialog(contactId);
            if (!response.success) throw new Error(response.error || 'Не удалось удалить диалог');
            await this.loadMessages();
            showNotification('Диалог удалён', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    AdminPanel.prototype.ensureTransferModal = function() {
        if (document.getElementById('transferModal')) return;
        const modal = document.createElement('div');
        modal.id = 'transferModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:820px;">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-alt"></i> Перенос записи</h3>
                    <button class="close-modal" onclick="document.getElementById('transferModal').classList.remove('active')">&times;</button>
                </div>
                <div class="modal-body" id="transferModalBody"></div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
    };

    AdminPanel.prototype.openTransferModal = async function(bookingId, excludeMasterId = null) {
        this.ensureTransferModal();
        const modal = document.getElementById('transferModal');
        const body = document.getElementById('transferModalBody');
        modal.classList.add('active');
        body.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Подготовка формы переноса...</div>';
        try {
            const response = await salonAPI.getBookingTransferOptions(bookingId, excludeMasterId);
            if (!response.success) throw new Error(response.error || 'Не удалось подготовить перенос');
            const booking = response.booking || {};
            const masters = response.masters || [];
            const minDate = todayIso();
            let defaultDate = booking.desired_date || minDate;
            if (defaultDate < minDate) defaultDate = minDate;

            if (!masters.length) {
                body.innerHTML = `<div class="empty-state">Для услуги «${escapeHtml(booking.service_name || '')}» нет активных мастеров подходящего направления. Проверьте связи master_services в базе.</div>`;
                return;
            }

            body.innerHTML = `
                <form id="transferForm">
                    <input type="hidden" id="transferBookingId" value="${Number(bookingId)}">
                    <input type="hidden" id="transferServiceId" value="${Number(booking.service_id || 0)}">
                    <div class="report-note" style="margin-bottom:1rem;">
                        <strong>${escapeHtml(booking.booking_number || ('B' + String(bookingId).padStart(6, '0')))}</strong> ·
                        ${escapeHtml(booking.client_name || '')} · ${escapeHtml(booking.service_name || '')}<br>
                        Было: ${escapeHtml(booking.formatted_date || booking.desired_date || '')} в ${escapeHtml(booking.desired_time || '')}, мастер: ${escapeHtml(booking.current_master_name || 'любой')}.
                    </div>
                    <div class="form-group">
                        <label>Новый мастер *</label>
                        <select id="transferMasterId" class="form-control" required>
                            <option value="">Выберите мастера подходящего направления</option>
                            ${masters.map(m => `<option value="${Number(m.id)}">${escapeHtml(m.name)} — ${escapeHtml(m.specialization || '')}</option>`).join('')}
                        </select>
                        <small>Список уже отфильтрован по услуге: например, для парикмахерской услуги будут только мастера, которые её выполняют.</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Новая дата *</label>
                            <input type="date" id="transferDate" class="form-control" min="${minDate}" value="${escapeHtml(defaultDate)}" required>
                        </div>
                        <div class="form-group">
                            <label>Свободный временной слот *</label>
                            <select id="transferTimeSlot" class="form-control" required disabled>
                                <option value="">Сначала выберите мастера</option>
                            </select>
                        </div>
                    </div>
                    <div id="transferSlotsInfo" class="report-note" style="margin:.5rem 0 1rem;">Слот будет проверен по расписанию мастера и занятым записям.</div>
                    <div class="form-group"><label>Комментарий клиенту</label><textarea id="transferMessage" class="form-control" rows="3" placeholder="Например: мастер заболел, предлагаем удобный перенос..."></textarea></div>
                    <div style="display:flex;gap:1rem;margin-top:1rem;"><button type="submit" class="btn" style="flex:1;"><i class="fas fa-paper-plane"></i> Отправить предложение</button><button type="button" class="btn" style="background:#667171;flex:1;" onclick="document.getElementById('transferModal').classList.remove('active')">Отмена</button></div>
                </form>`;
            document.getElementById('transferMasterId').addEventListener('change', () => this.loadTransferSlots());
            document.getElementById('transferDate').addEventListener('change', () => this.loadTransferSlots());
            document.getElementById('transferForm').addEventListener('submit', (e) => { e.preventDefault(); this.submitTransferProposal(); });
        } catch (error) {
            body.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        }
    };

    AdminPanel.prototype.loadTransferSlots = async function() {
        const bookingId = Number(document.getElementById('transferBookingId')?.value || 0);
        const serviceId = Number(document.getElementById('transferServiceId')?.value || 0);
        const masterId = document.getElementById('transferMasterId')?.value;
        const date = document.getElementById('transferDate')?.value;
        const select = document.getElementById('transferTimeSlot');
        const info = document.getElementById('transferSlotsInfo');
        if (!select || !info) return;
        if (!masterId || !date) {
            select.innerHTML = '<option value="">Выберите мастера и дату</option>';
            select.disabled = true;
            info.textContent = 'Слот будет проверен по расписанию мастера и занятым записям.';
            return;
        }
        select.disabled = true;
        select.innerHTML = '<option value="">Загрузка слотов...</option>';
        info.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверяем свободные слоты...';
        try {
            const response = await salonAPI.getAvailableTimeSlots(masterId, date, serviceId, bookingId);
            if (!response.success) throw new Error(response.error || 'Не удалось получить слоты');
            const slots = response.available_slots || [];
            if (!slots.length) {
                select.innerHTML = '<option value="">Свободных слотов нет</option>';
                select.disabled = true;
                info.textContent = 'На выбранную дату у мастера нет свободного времени для длительности этой услуги.';
                return;
            }
            select.innerHTML = '<option value="">Выберите время</option>' + slots.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
            select.disabled = false;
            info.textContent = `Найдено свободных слотов: ${slots.length}. Длительность услуги: ${Number(response.duration_minutes || 60)} мин.`;
        } catch (error) {
            select.innerHTML = '<option value="">Ошибка загрузки</option>';
            select.disabled = true;
            info.textContent = error.message;
        }
    };

    AdminPanel.prototype.submitTransferProposal = async function() {
        const payload = {
            booking_id: Number(document.getElementById('transferBookingId').value),
            new_master_id: document.getElementById('transferMasterId').value,
            new_date: document.getElementById('transferDate').value,
            new_time: document.getElementById('transferTimeSlot').value,
            message: document.getElementById('transferMessage').value.trim()
        };
        if (!payload.new_master_id || !payload.new_date || !payload.new_time) {
            showNotification('Выберите мастера, дату и свободный слот', 'error');
            return;
        }
        try {
            const response = await salonAPI.proposeBookingTransfer(payload);
            if (!response.success) throw new Error(response.error || 'Не удалось отправить предложение');
            showNotification('Предложение переноса отправлено клиенту', 'success');
            document.getElementById('transferModal').classList.remove('active');
            this.loadBookings();
            this.loadMasters();
            this.loadDashboard();
        } catch (error) {
            showNotification(error.message, 'error');
            this.loadTransferSlots();
        }
    };
})();

// ===== Общее расписание мастеров =====
(() => {
  const oldSetup = AdminPanel.prototype.setupEventListeners;
  AdminPanel.prototype.setupEventListeners = function() {
    oldSetup.call(this);
    const date = document.getElementById('scheduleDate');
    if (date && !date.value) date.value = new Date().toISOString().slice(0, 10);
    date?.addEventListener('change', () => this.loadSchedule());
    document.getElementById('refreshScheduleBtn')?.addEventListener('click', () => this.loadSchedule(true));
  };

  const oldShow = AdminPanel.prototype.showSection;
  AdminPanel.prototype.showSection = function(id) {
    oldShow.call(this, id);
    if (id === 'schedule') this.loadSchedule();
  };

  const normalizePhoto = (photo) => {
    const file = String(photo || '').replace(/^.*[\\/]/, '');
    return file ? `images/${file}` : 'images/master1.jpg';
  };

  const timeToMinutes = (value) => {
    const m = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
  };

  const minutesToTime = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  AdminPanel.prototype.renderScheduleShell = function(masters, services, relations) {
    const box = document.getElementById('masterSchedule');
    if (!box) return;
    const activeMasters = (masters || []).filter(m => String(m.is_active) !== '0');
    if (!activeMasters.length) {
      box.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><p>Активные мастера не найдены</p></div>';
      return;
    }
    const serviceById = Object.fromEntries((services || []).filter(s => String(s.is_active) !== '0').map(s => [String(s.id), s]));
    box.innerHTML = activeMasters.map(master => {
      const ids = Array.isArray(relations?.[String(master.id)]) ? relations[String(master.id)] : [];
      const masterServices = ids.map(id => serviceById[String(id)]).filter(Boolean);
      return `<section class="schedule-master" data-master-id="${Number(master.id)}">
        <div class="schedule-master-header">
          <img class="schedule-master-photo" src="${normalizePhoto(master.photo)}" alt="${escapeHtml(master.name || 'Мастер')}" onerror="this.src='images/master1.jpg'">
          <div><h3>${escapeHtml(master.name || 'Мастер')}</h3><p>${escapeHtml(master.specialization || '')}</p></div>
        </div>
        <div class="schedule-services">
          ${masterServices.length ? masterServices.map(service => `<div class="schedule-service" data-master-id="${Number(master.id)}" data-service-id="${Number(service.id)}">
            <div class="schedule-service-head"><div><strong>${escapeHtml(service.name || 'Услуга')}</strong><span>${Number(service.duration_minutes || 60)} мин</span></div></div>
            <div class="schedule-grid" data-slots-for="${Number(master.id)}-${Number(service.id)}"></div>
          </div>`).join('') : '<div class="schedule-no-slots">У мастера не назначены услуги</div>'}
        </div>
      </section>`;
    }).join('');
  };

  AdminPanel.prototype.fillServiceSlots = function(masterId, service, response) {
    const grid = document.querySelector(`[data-slots-for="${Number(masterId)}-${Number(service.id)}"]`);
    if (!grid) return;
    const starts = Array.isArray(response?.available_slots) ? response.available_slots : [];
    const duration = Math.max(15, Number(response?.duration_minutes || service.duration_minutes || 60));
    if (!starts.length) {
      grid.innerHTML = '<div class="schedule-no-slots">Свободных окон нет</div>';
      return;
    }
    grid.innerHTML = starts.map(start => {
      const end = minutesToTime(timeToMinutes(start) + duration);
      return `<div class="schedule-slot free"><strong>${escapeHtml(start)}–${escapeHtml(end)}</strong><span>Свободно</span></div>`;
    }).join('');
  };

  AdminPanel.prototype.loadSchedule = async function(force = false) {
    const box = document.getElementById('masterSchedule');
    if (!box) return;
    const dateInput = document.getElementById('scheduleDate');
    const date = dateInput?.value || new Date().toISOString().slice(0, 10);
    if (dateInput && !dateInput.value) dateInput.value = date;
    const refreshButton = document.getElementById('refreshScheduleBtn');
    if (refreshButton) refreshButton.disabled = true;

    try {
      const cacheKey = 'adminScheduleBaseV2';
      if (!force && !box.children.length) {
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
          if (cached?.masters && cached?.services && cached?.relations) {
            this.renderScheduleShell(cached.masters, cached.services, cached.relations);
          }
        } catch (_) {}
      }

      const [mastersResponse, servicesResponse, relationsResponse] = await Promise.all([
        salonAPI.getMastersAdmin(),
        salonAPI.getServicesAdmin(),
        salonAPI.getMasterServices()
      ]);
      if (!mastersResponse?.success) throw new Error(mastersResponse?.error || 'Не удалось получить мастеров');
      if (!servicesResponse?.success) throw new Error(servicesResponse?.error || 'Не удалось получить услуги');
      const masters = mastersResponse.data || [];
      const services = servicesResponse.data || [];
      const relations = relationsResponse?.success ? (relationsResponse.data || {}) : {};
      this.renderScheduleShell(masters, services, relations);
      localStorage.setItem(cacheKey, JSON.stringify({masters, services, relations}));

      const serviceById = Object.fromEntries(services.map(s => [String(s.id), s]));
      const tasks = [];
      masters.filter(m => String(m.is_active) !== '0').forEach(master => {
        const ids = Array.isArray(relations[String(master.id)]) ? relations[String(master.id)] : [];
        ids.forEach(serviceId => {
          const service = serviceById[String(serviceId)];
          if (!service || String(service.is_active) === '0') return;
          tasks.push(
            salonAPI.getAvailableTimeSlots(master.id, date, service.id)
              .then(response => this.fillServiceSlots(master.id, service, response))
              .catch(() => {
                const grid = document.querySelector(`[data-slots-for="${Number(master.id)}-${Number(service.id)}"]`);
                if (grid) grid.innerHTML = '<div class="schedule-no-slots">Не удалось получить окна</div>';
              })
          );
        });
      });
      await Promise.allSettled(tasks);
    } catch (error) {
      console.error('Schedule loading error:', error);
      if (!box.children.length) {
        box.innerHTML = `<div class="empty-state schedule-error"><i class="fas fa-exclamation-triangle"></i><p>${escapeHtml(error?.message || 'Не удалось открыть расписание')}</p><button type="button" class="btn" id="retryScheduleBtn"><i class="fas fa-redo"></i> Повторить</button></div>`;
        document.getElementById('retryScheduleBtn')?.addEventListener('click', () => this.loadSchedule(true));
      }
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  };

  const oldRender=AdminPanel.prototype.renderServices;
  AdminPanel.prototype.renderServices=function(services){
    oldRender.call(this,services);
    (services||[]).forEach(s=>{
      if(!Number(s.is_locked)) return;
      document.querySelectorAll(`button[onclick*="editService(${s.id})"],button[onclick*="deleteService(${s.id})"]`).forEach(b=>{
        b.disabled=true; b.classList.add('service-locked'); b.title='Есть подтверждённая запись — редактирование запрещено';
      });
      const row=[...document.querySelectorAll('#servicesTable tr')].find(tr=>tr.textContent.includes(s.name));
      if(row){ const cell=row.querySelector('td:nth-child(2)'); if(cell) cell.insertAdjacentHTML('beforeend','<div class="lock-note"><i class="fas fa-lock"></i> Есть подтверждённая запись</div>'); }
    });
  };
})();
