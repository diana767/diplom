
const masterPortfolioMap = {
  'екатерина петрова': [
    {img: 'portfolio_makeup_1.jpg', label: 'Вечерний макияж'},
    {img: 'portfolio_makeup_2.webp', label: 'Преображение до / после'}
  ],
  'мария иванова': [
    {img: 'portfolio_manicure_1.jpg', label: 'Контрастный дизайн'},
    {img: 'portfolio_manicure_2.jpg', label: 'Минимализм с сердцами'}
  ],
  'ольга кузнецова': [
    {img: 'portfolio_lashes_1.jpg', label: 'Объёмное наращивание'},
    {img: 'portfolio_lashes_2.webp', label: 'Изгиб и плотность'}
  ],
  'анна смирнова': [
    {img: 'portfolio_hair_1.jpg', label: 'Холодный блонд'},
    {img: 'portfolio_hair_2.jpg', label: 'Сложное окрашивание'}
  ]
};
document.addEventListener('DOMContentLoaded', function () {
  console.log('Main.js loaded');

  // Подгружаем настройки салона (название, телефон, адрес)
  loadSiteSettings();

  // Загрузка услуг на странице услуг
  if (document.getElementById('servicesContainer')) {
    loadServicesPage();
  }

  // Форма записи
  if (document.getElementById('booking-form')) {
    initBookingForm();
  }

  // Инициализация калькулятора красоты
  if (document.querySelector('.calculator-steps')) {
    initBeautyCalculator();
  }

  // Загрузка мастеров на странице мастеров
  if (document.getElementById('mastersContainer')) {
    loadMastersPage();
  }
});


function normalizeDateForApi(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return dateStr;
}




async function loadSiteSettings() {
  try {
    if (!window.salonAPI?.getPublicSettings) return;
    const resp = await salonAPI.getPublicSettings();
    if (!resp || !resp.success || !resp.data) return;

    const s = resp.data;
    const name = s.salon_name || s.name;
    const phone = s.salon_phone || s.phone;
    const address = s.salon_address || s.address;
    const hours = s.working_hours || s.hours;

    if (name) {
      document.querySelectorAll('.js-salon-name').forEach(el => el.textContent = name);

      if (document.title) {
        document.title = document.title
          .replace(/"Элегант"/gi, '"' + name + '"')
          .replace(/ЭЛЕГАНТ/g, name)
          .replace(/Элегант/g, name);
      }
    }

    if (phone) {
      document.querySelectorAll('.js-salon-phone').forEach(el => el.textContent = phone);
      document.querySelectorAll('a.js-salon-phone-link').forEach(a => a.setAttribute('href', 'tel:' + phone.replace(/\s|\(|\)|-/g, '')));
    }

    if (address) {
      document.querySelectorAll('.js-salon-address').forEach(el => el.textContent = address);
    }

    if (hours) {
      document.querySelectorAll('.js-working-hours').forEach(el => el.textContent = hours);
    }
  } catch (e) {

    console.warn('Settings load failed', e);
  }
}

function getSelectedPackage() {
  const raw = localStorage.getItem('selected_package');
  if (!raw) return null;
  try {
    const pkg = JSON.parse(raw);
    if (pkg && pkg.expires && Date.now() > Number(pkg.expires)) {
      localStorage.removeItem('selected_package');
      return null;
    }
    return pkg;
  } catch (e) {
    return null;
  }
}

function renderPackageBanner(pkg) {
  const banner = document.getElementById('packageBanner');
  if (!banner || !pkg) return;

  const servicesList = Array.isArray(pkg.serviceNames)
    ? pkg.serviceNames.map((n, i) => {
        const p = Array.isArray(pkg.servicePrices) ? pkg.servicePrices[i] : null;
        return `<li style="margin:.25rem 0;">${n}${p != null ? ` — <strong>${p} ₽</strong>` : ''}</li>`;
      }).join('')
    : '';

  banner.style.display = 'block';
  banner.innerHTML = `
    <div style="background: linear-gradient(135deg, rgba(111,135,132,.10), rgba(214,195,198,.16)); border: 2px solid rgba(111,135,132,.18); border-radius: 14px; padding: 1rem 1.2rem;">
      <div style="display:flex; align-items:flex-start; gap:12px;">
        <div style="width:44px; height:44px; border-radius:12px; background: linear-gradient(135deg, var(--primary), var(--secondary)); color:#fff; display:flex; align-items:center; justify-content:center; flex:0 0 auto;">
          <i class="fas fa-gift"></i>
        </div>
        <div style="flex:1;">
          <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;">
            <h3 style="margin:0; color: var(--primary); font-size: 1.05rem;">
              ${pkg.title || 'Персональный пакет'}
            </h3>
            <span style="display:inline-block; background: var(--accent); color: var(--dark); padding:.35rem .7rem; border-radius:999px; font-weight:800;">
              Скидка ${Number(pkg.discount) || 0}%
            </span>
          </div>
          ${pkg.description ? `<p style="margin:.35rem 0 .6rem; color: var(--gray);">${pkg.description}</p>` : ''}
          ${servicesList ? `<details style="margin-top:.35rem;"><summary style="cursor:pointer; color: var(--primary); font-weight:700;">Состав пакета</summary><ul style="margin:.5rem 0 0 1.1rem; color:#4f5a5a;">${servicesList}</ul></details>` : ''}
          <p style="margin:.6rem 0 0; color:#555;">
            <i class="fas fa-percentage"></i> Скидка будет учтена при подтверждении записи администратором.
          </p>
        </div>
      </div>
    </div>
  `;
}

function updatePriceDisplayForService(serviceId, servicesById, pkg) {
  const priceEl = document.getElementById('priceDisplay');
  const hintEl = document.getElementById('serviceHint');
  if (!priceEl || !hintEl) return;

  if (!serviceId) {
    priceEl.style.display = 'none';
    hintEl.textContent = '';
    return;
  }

  const service = servicesById.get(String(serviceId));
  if (!service) {
    priceEl.style.display = 'none';
    hintEl.textContent = '';
    return;
  }

  const basePrice = Number(service.price) || 0;
  const baseText = `${basePrice} ₽`;

  const inPkg = pkg && Array.isArray(pkg.services) && pkg.services.map(String).includes(String(serviceId));
  const discount = inPkg ? (Number(pkg.discount) || 0) : 0;
  const discounted = discount > 0 ? Math.max(0, Math.round(basePrice * (100 - discount) / 100)) : basePrice;

  priceEl.style.display = 'block';
  if (discount > 0) {
    priceEl.innerHTML = `Цена: <span style="text-decoration:line-through; opacity:.6; margin-right:.5rem;">${baseText}</span><span style="color: var(--secondary);">${discounted} ₽</span>`;
    hintEl.textContent = `Скидка ${discount}% по пакету из калькулятора`;
  } else {
    priceEl.textContent = `Цена: ${baseText}`;
    hintEl.textContent = '';
  }
}

// ======================
// УСЛУГИ (services.html)
// ======================
let timeSlotsTimer = null;
function updateTimeSlotsDebounced() {
  clearTimeout(timeSlotsTimer);
  timeSlotsTimer = setTimeout(updateTimeSlots, 200);
}

async function loadServicesPage() {
  console.log('Loading services...');
  const container = document.getElementById('servicesContainer');

  try {
    const response = await salonAPI.getServices();
    console.log('Services response:', response);

    if (response.success && response.data) {
      renderServices(response.data);
      renderCategoryFilters(response.data);
    } else {
      showError('Ошибка загрузки услуг');
    }
  } catch (error) {
    console.error('Error loading services:', error);
    showError('Ошибка соединения с сервером');
  }
}

function renderServices(services) {
  const container = document.getElementById('servicesContainer');
  if (!container) return;

  const grouped = {};
  services.forEach(s => {
    grouped[s.category] = grouped[s.category] || [];
    grouped[s.category].push(s);
  });

  let html = '';
  Object.keys(grouped).forEach(category => {
    html += `
      <section class="category-section">
        <h2 class="category-title">${category}</h2>
        <div class="services-grid">
    `;

    grouped[category].forEach(service => {
      html += `
        <div class="service-card">
          <h3>${service.name}</h3>
          <p>${service.description || ''}</p>
          <div class="price">${service.price} ₽</div>
          <div class="duration"><i class="far fa-clock"></i> ${service.duration_minutes || 60} мин</div>
          <a href="book.html?service=${service.id}" class="btn" style="margin-top: 1rem;">
            <i class="fas fa-calendar-plus"></i> Записаться
          </a>
        </div>
      `;
    });

    html += `</div></section>`;
  });

  container.innerHTML = html;
}

function renderCategoryFilters(services) {
  const filterContainer = document.getElementById('categoryFilters');
  if (!filterContainer) return;

  const categories = [...new Set(services.map(s => s.category))];

  let html = `<button class="filter-btn active" data-category="all">Все услуги</button>`;
  categories.forEach(category => {
    html += `<button class="filter-btn" data-category="${category}">${category}</button>`;
  });

  filterContainer.innerHTML = html;

  filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const category = this.dataset.category;

      filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      filterServices(category, services);
    });
  });
}

function filterServices(category, services) {
  if (category === 'all') {
    renderServices(services);
    return;
  }

  const filtered = services.filter(service => service.category === category);

  const container = document.getElementById('servicesContainer');
  if (!container) return;

  let html = `
      <section class="category-section">
        <h2 class="category-title">${category}</h2>
        <div class="services-grid">
  `;

  if (filtered.length === 0) {
    html += `
      <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
        <p>Нет услуг в этой категории</p>
      </div>
    `;
  } else {
    filtered.forEach(service => {
      html += `
        <div class="service-card">
          <h3>${service.name}</h3>
          <p>${service.description || ''}</p>
          <div class="price">${service.price} ₽</div>
          <div class="duration"><i class="far fa-clock"></i> ${service.duration_minutes || 60} мин</div>
          <a href="book.html?service=${service.id}" class="btn" style="margin-top: 1rem;">
            <i class="fas fa-calendar-plus"></i> Записаться
          </a>
        </div>
      `;
    });
  }

  html += `</div></section>`;
  container.innerHTML = html;
}

function showError(message) {
  const container = document.getElementById('servicesContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="text-center" style="padding: 3rem; color: #9a6a6a;">
      <i class="fas fa-exclamation-triangle fa-3x"></i>
      <p style="margin-top: 1rem;">${message}</p>
      <button onclick="loadServicesPage()" class="btn" style="margin-top: 1rem;">
        <i class="fas fa-redo"></i> Попробовать снова
      </button>
    </div>
  `;
}

// ======================
// ЗАПИСЬ (book.html)
// ======================
async function initBookingForm() {
  console.log('Initializing booking form...');

  try {
    // Загружаем услуги
    const servicesResponse = await salonAPI.getServices();
    const services = servicesResponse.success ? servicesResponse.data : [];
    console.log('Services loaded:', services.length);

    // Загружаем мастеров
    const mastersResponse = await salonAPI.getMasters();
    const masters = mastersResponse.success ? mastersResponse.data : [];
    console.log('Masters loaded:', masters.length);

    // Загружаем связи мастер-услуга 
    let masterServicesMap = null;
    try {
      const mapResp = await salonAPI.getMasterServices();
      if (mapResp && mapResp.success && mapResp.data) {
        masterServicesMap = mapResp.data; 
      }
    } catch (e) {
      masterServicesMap = null;
    }

    const pkg = getSelectedPackage();
    if (pkg) renderPackageBanner(pkg);

    populateServicesSelect(services);
    populateMastersSelect(masters);
    setupDateInput();
    setupEventListeners(services, masters, masterServicesMap, pkg);

    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('service');
    const masterId = urlParams.get('master');

    if (serviceId) {
      document.getElementById('service').value = serviceId;
      document.getElementById('service').dispatchEvent(new Event('change'));
    }

    if (masterId) {
      document.getElementById('master').value = masterId;
      // вызовет фильтр услуг + обновление времени
      document.getElementById('master').dispatchEvent(new Event('change'));
    }

    // Обновим цену/подсказку по текущей услуге 
    try {
      const servicesById = new Map(services.map(s => [String(s.id), s]));
      updatePriceDisplayForService(document.getElementById('service')?.value, servicesById, pkg);
    } catch (e) {}

    const savedPackage = localStorage.getItem('selected_package');
    if (savedPackage) {
      const comment = document.getElementById('comment');
      if (comment && !comment.value) {
        try {
          const pkg = JSON.parse(savedPackage);
          comment.value = `Пакет из калькулятора: ${pkg.title || 'персональная скидка'}`;
        } catch (e) {}
      }
    }
  } catch (error) {
    console.error('Error initializing booking form:', error);
    showNotification('Ошибка загрузки данных формы', 'error');
  }
}

function populateServicesSelect(services) {
  const select = document.getElementById('service');
  if (!select) return;

  select.innerHTML = '<option value="">Выберите услугу...</option>';
  services.forEach(service => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.name} - ${service.price} ₽`;
    option.dataset.duration = service.duration_minutes || 60;
    option.dataset.category = service.category || '';
    select.appendChild(option);
  });
}

function populateMastersSelect(masters) {
  const select = document.getElementById('master');
  if (!select) return;

  select.innerHTML = '<option value="">Любой мастер</option>';
  masters.forEach(master => {
    const option = document.createElement('option');
    option.value = master.id;
    option.textContent = `${master.name} (${master.specialization})`;
    select.appendChild(option);
  });
}

function setupDateInput() {
  const dateInput = document.getElementById('date');
  if (!dateInput) return;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  dateInput.min = todayStr;
  dateInput.max = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  dateInput.value = tomorrowStr;
}

function setupEventListeners(services, masters, masterServicesMap = null, pkg = null) {
  const serviceSelect = document.getElementById('service');
  const masterSelect = document.getElementById('master');
  const dateInput = document.getElementById('date');
  const timeInput = document.getElementById('time');

  if (!serviceSelect || !masterSelect || !dateInput || !timeInput) return;

  // Индексы для быстрой работы
  const servicesById = new Map(services.map(s => [String(s.id), s]));
  const mastersById = new Map(masters.map(m => [String(m.id), m]));

  const masterToServices = masterServicesMap
    ? new Map(Object.entries(masterServicesMap).map(([mId, sIds]) => [String(mId), new Set((sIds || []).map(String))]))
    : null;

  const serviceToMasters = (() => {
    if (!masterToServices) return null;
    const m = new Map();
    for (const [masterId, set] of masterToServices.entries()) {
      for (const serviceId of set) {
        if (!m.has(serviceId)) m.set(serviceId, new Set());
        m.get(serviceId).add(masterId);
      }
    }
    return m;
  })();

  let isSyncing = false;

  function filterServicesForMaster(masterId) {
    const mId = String(masterId || '');
    if (masterToServices && masterToServices.has(mId)) {
      const allow = masterToServices.get(mId);
      return services.filter(s => allow.has(String(s.id)));
    }

    const master = mastersById.get(mId);
    const allowedCats = getAllowedCategoriesForMaster(master);
    return allowedCats ? services.filter(s => allowedCats.includes(s.category)) : services;
  }

  function filterMastersForService(serviceId) {
    const sId = String(serviceId || '');
    if (serviceToMasters && serviceToMasters.has(sId)) {
      const allow = serviceToMasters.get(sId);
      return masters.filter(m => allow.has(String(m.id)));
    }

    const service = servicesById.get(sId);
    if (!service) return masters;
    const cat = String(service.category || '');
    return masters.filter(m => {
      const allowedCats = getAllowedCategoriesForMaster(m);
      return !allowedCats || allowedCats.includes(cat);
    });
  }

  function repopulateServices(list, keepValue = '') {
    const old = keepValue || serviceSelect.value;
    populateServicesSelect(list);
    if (old && list.some(s => String(s.id) === String(old))) {
      serviceSelect.value = old;
    } else {
      serviceSelect.value = '';
    }
  }

  function repopulateMasters(list, keepValue = '') {
    const old = keepValue || masterSelect.value;
    populateMastersSelect(list);
    if (old && list.some(m => String(m.id) === String(old))) {
      masterSelect.value = old;
    } else {
      masterSelect.value = '';
    }
  }

  // ВЫБОР МАСТЕРА -> фильтровать услуги + время
  masterSelect.addEventListener('change', function () {
    if (isSyncing) return;
    isSyncing = true;

    const masterId = masterSelect.value;
    const filteredServices = masterId ? filterServicesForMaster(masterId) : services;
    repopulateServices(filteredServices);

    if (serviceSelect.value) {
      const filteredMasters = filterMastersForService(serviceSelect.value);
      repopulateMasters(filteredMasters, masterId);
    }

    isSyncing = false;
    // цена/подсказка по услуге с учетом пакета
    updatePriceDisplayForService(serviceSelect.value, servicesById, pkg);
    updateTimeSlotsDebounced();
  });

  // ВЫБОР УСЛУГИ -> фильтровать мастеров + время
  serviceSelect.addEventListener('change', function () {
    if (isSyncing) return;
    isSyncing = true;

    const serviceId = serviceSelect.value;
    const filteredMasters = serviceId ? filterMastersForService(serviceId) : masters;
    repopulateMasters(filteredMasters);

    if (masterSelect.value) {
      const filteredServices = filterServicesForMaster(masterSelect.value);
      repopulateServices(filteredServices, serviceId);
    }

    isSyncing = false;
    updatePriceDisplayForService(serviceSelect.value, servicesById, pkg);
    updateTimeSlotsDebounced();
  });

  // ДАТА -> обновить время
  dateInput.addEventListener('change', function () {
    updateTimeSlotsDebounced();
  });

 
  const form = document.getElementById('booking-form');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const bookingData = {
        client_name: document.getElementById('client-name').value,
        phone: document.getElementById('phone').value,
        service_id: serviceSelect.value,
        master_id: masterSelect.value || null,
        desired_date: normalizeDateForApi(dateInput.value),
        desired_time: timeInput.value,
        comment: document.getElementById('comment').value || ''
      };

     
      const savedPackage = localStorage.getItem('selected_package');
      if (savedPackage) {
        try {
          bookingData.package_info = JSON.parse(savedPackage);
        } catch (e) {}
      }

      const validation = validateBookingForm(bookingData);
      if (!validation.isValid) {
        showNotification(validation.errors.join(', '), 'error');
        return;
      }

      try {
        const result = await salonAPI.createBooking(bookingData);

        if (result.success) {
          showBookingSuccess(result, bookingData);
          localStorage.removeItem('selected_package'); 
          form.reset();
          setupDateInput();
        } else {
          showNotification(result.error || 'Ошибка при создании записи', 'error');
        }
      } catch (error) {
        console.error('Booking error:', error);
        showNotification('Ошибка соединения с сервером', 'error');
      }
    });
  }
}

async function updateTimeSlots() {
   
    if (typeof window.__tsReqId === 'undefined') window.__tsReqId = 0;
    const reqId = ++window.__tsReqId;
  const serviceSelect = document.getElementById('service');
  const masterSelect = document.getElementById('master');
  const dateInput = document.getElementById('date');

  if (!serviceSelect?.value || !dateInput?.value) return;

  try {
    const masterId = masterSelect?.value ? masterSelect.value : null;

    const apiDate = normalizeDateForApi(dateInput.value);

    const slots = await salonAPI.getAvailableTimeSlots(
      masterId,
      apiDate,
      serviceSelect.value
    );

        if (reqId !== window.__tsReqId) return;
        if (slots.success && slots.available_slots) {
            renderTimeSlots(slots.available_slots);
        } else {
            showTimeSlotsError();
        }
  } catch (error) {
    console.error('Error loading time slots:', error);
        if (reqId !== window.__tsReqId) return;
    showTimeSlotsError();
  }
}

function renderTimeSlots(slots) {
  const timeInput = document.getElementById('time');
  const timeSlotsContainer = document.getElementById('timeSlotsContainer');
  const timeSlotsGrid = document.getElementById('timeSlotsGrid');
  const timeSlotsInfo = document.getElementById('timeSlotsInfo');

  if (!timeInput || !timeSlotsContainer || !timeSlotsGrid) return;

  timeInput.value = '';
  timeSlotsGrid.innerHTML = '';
  timeSlotsContainer.style.display = 'block';

  if (slots.length === 0) {
    timeSlotsGrid.innerHTML = `
      <div class="no-slots">
        <i class="fas fa-calendar-times"></i> На выбранную дату нет доступного времени
      </div>
    `;
    return;
  }

  slots.forEach(slot => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'time-slot';
    button.textContent = slot;

    button.addEventListener('click', function () {
      timeSlotsGrid.querySelectorAll('.time-slot').forEach(btn => btn.classList.remove('selected'));
      this.classList.add('selected');
      timeInput.value = slot;
      if (timeSlotsInfo) timeSlotsInfo.textContent = `Выбрано: ${slot}`;
    });

    timeSlotsGrid.appendChild(button);
  });

  if (timeSlotsInfo) {
    timeSlotsInfo.textContent = `Доступно ${slots.length} временных слотов`;
  }
}

function showTimeSlotsError() {
  const timeSlotsContainer = document.getElementById('timeSlotsContainer');
  const timeSlotsGrid = document.getElementById('timeSlotsGrid');
  const timeSlotsInfo = document.getElementById('timeSlotsInfo');
  const timeInput = document.getElementById('time');

  if (timeInput) timeInput.value = '';
  if (timeSlotsInfo) timeSlotsInfo.textContent = '';
  if (timeSlotsContainer) timeSlotsContainer.style.display = 'block';

  if (timeSlotsGrid) {
    timeSlotsGrid.innerHTML = `
      <div class="no-slots">
        <i class="fas fa-exclamation-triangle"></i>
        Ошибка загрузки доступного времени
      </div>
    `;
  }
}


function validateBookingForm(data) {
  const errors = [];

  if (!data.client_name || data.client_name.trim().length < 2) errors.push('Введите корректное имя');
  if (!data.phone || data.phone.replace(/\D/g, '').length < 10) errors.push('Введите корректный номер телефона');
  if (!data.service_id) errors.push('Выберите услугу');
  if (!data.desired_date) errors.push('Выберите дату');
  if (!data.desired_time) errors.push('Выберите время');

  return { isValid: errors.length === 0, errors };
}

function showBookingSuccess(result, bookingData) {
  const resultDiv = document.getElementById('booking-result');
  if (!resultDiv) return;

  resultDiv.innerHTML = `
    <div class="form-success">
      <h3 style="margin: 0 0 1rem 0;">
        <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i><br>
        Заявка успешно отправлена!
      </h3>
      <div style="text-align: left; background: rgba(0,0,0,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
        <p style="margin: 0.5rem 0;"><strong>Номер заявки:</strong> ${result.booking_number}</p>
        <p style="margin: 0.5rem 0;"><strong>Имя:</strong> ${bookingData.client_name}</p>
        <p style="margin: 0.5rem 0;"><strong>Дата:</strong> ${new Date(bookingData.desired_date).toLocaleDateString('ru-RU')}</p>
        <p style="margin: 0.5rem 0;"><strong>Время:</strong> ${bookingData.desired_time}</p>
      </div>
      <p style="margin-top: 1rem;">Мы свяжемся с вами для подтверждения записи в течение 2 часов.</p>
    </div>
  `;

  resultDiv.scrollIntoView({ behavior: 'smooth' });
}

// ======================
// МАСТЕРА (masters.html)
// ======================
async function loadMastersPage() {
  console.log('Loading masters...');

  try {
    const response = await salonAPI.getMasters();
    console.log('Masters response:', response);

    if (response.success && response.data) {
      renderMasters(response.data);
    } else {
      showMastersError('Ошибка загрузки мастеров');
    }
  } catch (error) {
    console.error('Error loading masters:', error);
    showMastersError('Ошибка соединения с сервером');
  }
}

function renderMasters(masters) {
  const container = document.getElementById('mastersContainer');
  if (!container) return;

  const activeMasters = masters.filter(master => master.is_active !== false);

  if (activeMasters.length === 0) {
    container.innerHTML = `
      <div class="no-masters">
        <i class="fas fa-users-slash"></i>
        <h3>Мастера не найдены</h3>
        <p>Попробуйте зайти позже</p>
      </div>
    `;
    return;
  }

  let html = '';

  activeMasters.forEach(master => {
    let iconClass = 'fas fa-user';
    const spec = (master.specialization || '').toLowerCase();
    if (spec.includes('парикмахер')) iconClass = 'fas fa-cut';
    else if (spec.includes('маникюр')) iconClass = 'fas fa-hand-sparkles';
    else if (spec.includes('визаж')) iconClass = 'fas fa-palette';
    else if (spec.includes('ресниц')) iconClass = 'fas fa-eye';

    const photoHtml = master.photo
      ? `<img src="images/${master.photo}" alt="${master.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=&quot;${iconClass}&quot; style=&quot;font-size:3rem;&quot;></i>';">`
      : `<i class="${iconClass}" style="font-size: 3rem;"></i>`;

    const portfolioItems = masterPortfolioMap[(master.name || '').toLowerCase()] || [];
    const portfolioHtml = portfolioItems.length ? `
      <div class="portfolio-title">Работы мастера</div>
      <div class="portfolio-grid">
        ${portfolioItems.map(item => `
          <div class="portfolio-item">
            <img src="images/${item.img}" alt="${item.label}">
            <span class="portfolio-label">${item.label}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    html += `
      <div class="master-card">
        <div class="master-photo">${photoHtml}</div>
        <div class="master-rating"><i class="fas fa-bolt"></i> ТОП-мастер 2026</div>
        <h3>${master.name}</h3>
        <div class="master-specialization"><i class="fas fa-star"></i> ${master.specialization || 'Профессионал'}</div>
        <div class="master-experience"><i class="fas fa-award"></i> Опыт: ${master.experience_years || 0} лет</div>
        <div class="master-bio">${master.bio || 'Профессиональный мастер с индивидуальным подходом.'}</div>
        ${portfolioHtml}
        <a href="book.html?master=${master.id}" class="btn" style="margin-top: 1.25rem; width: 100%;">
          <i class="fas fa-calendar-plus"></i> Записаться к мастеру
        </a>
      </div>
    `;
  });

  container.innerHTML = html;
}

function showMastersError(message) {
  const container = document.getElementById('mastersContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="text-center" style="padding: 3rem; color: #9a6a6a;">
      <i class="fas fa-exclamation-triangle fa-3x"></i>
      <p style="margin-top: 1rem;">${message}</p>
      <button onclick="loadMastersPage()" class="btn" style="margin-top: 1rem;">
        <i class="fas fa-redo"></i> Попробовать снова
      </button>
    </div>
  `;
}

// ======================
// КАЛЬКУЛЯТОР
// ======================
function initBeautyCalculator() {
  console.log('Initializing beauty calculator...');
  if (typeof BeautyCalculator !== 'undefined') {
    new BeautyCalculator();
  }
}

// ======================
// ФИЛЬТР КАТЕГОРИЙ ПО МАСТЕРУ
// ======================
function getAllowedCategoriesForMaster(master) {
  const spec = (master?.specialization || '').toLowerCase();

  if (spec.includes('парикмахер')) return ['Парикмахерские'];
  if (spec.includes('маникюр')) return ['Ногтевой сервис'];

  if (spec.includes('ресниц')) return ['Ресницы'];

  if (spec.includes('визаж')) return ['Визаж'];

  return null; // null = показываем все услуги
}



// ===== ДОРАБОТКА: кнопка «Посмотреть работы мастера» с реальными фото из БД =====
(function() {
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));

  window.openMasterPortfolio = async function(masterId, masterName) {
    let modal = document.getElementById('masterPortfolioModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'masterPortfolioModal';
      modal.className = 'portfolio-modal';
      modal.innerHTML = `
        <div class="portfolio-modal-content">
          <button class="portfolio-modal-close" onclick="document.getElementById('masterPortfolioModal').classList.remove('active')">&times;</button>
          <h2 id="portfolioModalTitle">Работы мастера</h2>
          <div id="portfolioModalGrid" class="portfolio-modal-grid"></div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    }

    const title = document.getElementById('portfolioModalTitle');
    const grid = document.getElementById('portfolioModalGrid');
    title.textContent = `Работы мастера: ${masterName || ''}`;
    grid.innerHTML = '<div class="chat-empty"><i class="fas fa-spinner fa-spin"></i> Загружаем работы...</div>';
    modal.classList.add('active');

    try {
      const response = await salonAPI.getMasterPortfolio(masterId);
      const items = response.success ? (response.data || []) : [];
      if (!items.length) {
        grid.innerHTML = '<div class="chat-empty">Портфолио пока не заполнено.</div>';
        return;
      }
      grid.innerHTML = items.map(item => `
        <div class="portfolio-modal-item">
          <img src="images/${escapeHtml(item.image)}" alt="${escapeHtml(item.title || 'Работа мастера')}">
          <div class="portfolio-modal-caption">
            <strong>${escapeHtml(item.title || 'Работа мастера')}</strong>
            ${item.description ? `<span>${escapeHtml(item.description)}</span>` : ''}
          </div>
        </div>
      `).join('');
    } catch (error) {
      grid.innerHTML = '<div class="chat-empty">Не удалось загрузить портфолио. Проверьте базу данных.</div>';
    }
  };

  window.renderMasters = function(masters) {
    const container = document.getElementById('mastersContainer');
    if (!container) return;

    const activeMasters = masters.filter(master => master.is_active !== false && String(master.is_active) !== '0');
    if (activeMasters.length === 0) {
      container.innerHTML = `
        <div class="no-masters">
          <i class="fas fa-users-slash"></i>
          <h3>Мастера не найдены</h3>
          <p>Попробуйте зайти позже</p>
        </div>`;
      return;
    }

    container.innerHTML = activeMasters.map(master => {
      let iconClass = 'fas fa-user';
      const spec = (master.specialization || '').toLowerCase();
      if (spec.includes('парикмахер')) iconClass = 'fas fa-cut';
      else if (spec.includes('маникюр')) iconClass = 'fas fa-hand-sparkles';
      else if (spec.includes('визаж')) iconClass = 'fas fa-palette';
      else if (spec.includes('ресниц')) iconClass = 'fas fa-eye';

      const photoHtml = master.photo
        ? `<img src="images/${escapeHtml(master.photo)}" alt="${escapeHtml(master.name)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=&quot;${iconClass}&quot; style=&quot;font-size:3rem;&quot;></i>';">`
        : `<i class="${iconClass}" style="font-size: 3rem;"></i>`;

      return `
        <div class="master-card">
          <div class="master-photo">${photoHtml}</div>
          <div class="master-rating"><i class="fas fa-bolt"></i> ТОП-мастер 2026</div>
          <h3>${escapeHtml(master.name)}</h3>
          <div class="master-specialization"><i class="fas fa-star"></i> ${escapeHtml(master.specialization || 'Профессионал')}</div>
          <div class="master-experience"><i class="fas fa-award"></i> Опыт: ${Number(master.experience_years || 0)} лет</div>
          <div class="master-bio">${escapeHtml(master.bio || 'Профессиональный мастер с индивидуальным подходом.')}</div>
          <button type="button" class="btn btn-portfolio" onclick="openMasterPortfolio(${Number(master.id)}, '${escapeHtml(master.name).replace(/'/g, '&#039;')}')" style="margin-top: 1rem; width: 100%; background:#7a97a8;">
            <i class="fas fa-images"></i> Посмотреть работы мастера
          </button>
          <a href="book.html?master=${Number(master.id)}" class="btn" style="margin-top: .75rem; width: 100%;">
            <i class="fas fa-calendar-plus"></i> Записаться к мастеру
          </a>
        </div>`;
    }).join('');
  };
})();
