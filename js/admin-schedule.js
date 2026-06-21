(() => {
    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const minutes = (time) => {
        const match = String(time || '').match(/^(\d{1,2}):(\d{2})/);
        return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
    };

    const timeFromMinutes = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

    const photoPath = (value) => {
        const file = String(value || '').replace(/^.*[\\/]/, '');
        return `images/${file || 'master1.jpg'}`;
    };

    function renderSchedule(data) {
        const box = document.getElementById('masterSchedule');
        if (!box) return;

        const masters = Array.isArray(data?.masters) ? data.masters : [];
        if (!masters.length) {
            box.innerHTML = '<div class="empty-state"><p>Активные мастера не найдены.</p></div>';
            return;
        }

        box.innerHTML = masters.map(master => {
            const services = Array.isArray(master.services) ? master.services : [];
            const bookings = Array.isArray(master.bookings) ? master.bookings : [];

            const serviceHtml = services.length ? services.map(service => {
                const duration = Math.max(15, Number(service.duration_minutes || 60));
                const slots = Array.isArray(service.available_slots) ? service.available_slots : [];
                const slotsHtml = slots.length ? slots.map(start => {
                    const end = timeFromMinutes(minutes(start) + duration);
                    return `<div class="schedule-slot free"><strong>${escapeHtml(start)}–${escapeHtml(end)}</strong><span>Свободно</span></div>`;
                }).join('') : '<div class="schedule-no-slots">Свободных окон нет</div>';

                return `<div class="schedule-service">
                    <div class="schedule-service-head">
                        <div><strong>${escapeHtml(service.name || 'Услуга')}</strong><span>${duration} мин</span></div>
                    </div>
                    <div class="schedule-grid">${slotsHtml}</div>
                </div>`;
            }).join('') : '<div class="schedule-no-slots">У мастера не назначены услуги</div>';

            const bookingsHtml = bookings.length ? `<div class="schedule-busy-block">
                <h4>Занято</h4>
                <div class="schedule-grid">${bookings.map(item => `<div class="schedule-slot busy"><strong>${escapeHtml(item.start)}–${escapeHtml(item.end)}</strong><span>${escapeHtml(item.service_name)}</span><small>${escapeHtml(item.client_name)}</small></div>`).join('')}</div>
            </div>` : '';

            return `<section class="schedule-master">
                <div class="schedule-master-header">
                    <img class="schedule-master-photo" src="${photoPath(master.photo)}" alt="${escapeHtml(master.name)}" onerror="this.src='images/master1.jpg'">
                    <div><h3>${escapeHtml(master.name)}</h3><p>${escapeHtml(master.specialization)}</p></div>
                </div>
                <div class="schedule-services">${serviceHtml}</div>
                ${bookingsHtml}
            </section>`;
        }).join('');
    }

    async function loadAdminSchedule() {
        const box = document.getElementById('masterSchedule');
        const date = document.getElementById('scheduleDate');
        if (!box || !date) return;
        if (!date.value) date.value = new Date().toISOString().slice(0, 10);

        box.innerHTML = '';
        try {
            const response = await fetch(`php/admin/get_schedule_overview.php?date=${encodeURIComponent(date.value)}&_=${Date.now()}`, {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { Accept: 'application/json' }
            });
            const data = await response.json();
            if (!data?.success) throw new Error(data?.error || 'Не удалось получить расписание');
            renderSchedule(data);
        } catch (error) {
            box.innerHTML = `<div class="empty-state schedule-error"><p>${escapeHtml(error.message || 'Не удалось получить расписание')}</p><button type="button" class="btn" id="retryDirectSchedule">Повторить</button></div>`;
            document.getElementById('retryDirectSchedule')?.addEventListener('click', loadAdminSchedule);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Подменяем старый метод админ-панели: теперь раздел всегда использует один рабочий запрос.
        if (window.AdminPanel && window.AdminPanel.prototype) {
            window.AdminPanel.prototype.loadSchedule = loadAdminSchedule;
        }
        const date = document.getElementById('scheduleDate');
        const refresh = document.getElementById('refreshScheduleBtn');
        const scheduleLink = document.querySelector('[data-section="schedule"]');

        date?.addEventListener('change', loadAdminSchedule);
        refresh?.addEventListener('click', loadAdminSchedule);
        scheduleLink?.addEventListener('click', () => setTimeout(loadAdminSchedule, 0));

        window.loadAdminSchedule = loadAdminSchedule;
    });
})();
