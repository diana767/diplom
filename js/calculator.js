class BeautyCalculator {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.answers = {};
    this.services = [];
    this.selectedServices = [];
    this.totalPrice = 0;
    this.discount = 0;
    this.discountAmount = 0;
    this.finalPrice = 0;

    this.goalsByGender = {
      female: [
        { value: 'event',  icon: 'fas fa-glass-cheers', title: 'Особое событие', desc: 'Свадьба, праздник, важная встреча', color: 'var(--primary)' },
        { value: 'care',   icon: 'fas fa-heart',        title: 'Забота о себе',   desc: 'Расслабление и восстановление',     color: 'var(--secondary)' },
        { value: 'change', icon: 'fas fa-star',         title: 'Новый образ',     desc: 'Кардинальные изменения',            color: 'var(--accent)' },
        { value: 'support',icon: 'fas fa-calendar-alt', title: 'Регулярный уход', desc: 'Поддержание красоты',               color: '#7a9b8d' }
      ],
      male: [
        { value: 'event',  icon: 'fas fa-glass-cheers', title: 'Особое событие',  desc: 'Свадьба, праздник, важная встреча', color: '#7a97a8' },
        { value: 'care',   icon: 'fas fa-cut',          title: 'Уход за собой',    desc: 'Стрижка и уходовые процедуры',      color: '#7a9b8d' },
        { value: 'change', icon: 'fas fa-user-tie',     title: 'Новый образ',      desc: 'Смена стиля и имиджа',             color: '#FF9800' },
        { value: 'support',icon: 'fas fa-spa',          title: 'Регулярный уход',  desc: 'Поддержание ухоженного вида',      color: '#795548' }
      ]
    };

    // автозапуск
    this.init();
  }

  async init() {
    try {
      const resp = await salonAPI.getServices();
      this.services = resp?.success ? (resp.data || []) : [];
    } catch (e) {
      console.error('Calculator: cannot load services', e);
      this.services = [];
    }

    this.bind();
    this.updateProgress();
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.disabled = true;
  }

  bind() {
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.option-card');
      if (!card) return;
      const activeStep = document.querySelector('.calculator-step.active');
      if (!activeStep || !activeStep.contains(card)) return;

      const value = card.getAttribute('data-value');
      const step = this.currentStep;

      // снять выделение
      card.parentElement?.querySelectorAll('.option-card')?.forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');

      if (step === 1) {
        this.answers.gender = value;
        this.updateGoalOptions(value);
      }
      if (step === 2) this.answers.goal = value;
      if (step === 3) this.answers.budget = parseInt(value, 10);

      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.disabled = false;
    });

    document.getElementById('nextBtn')?.addEventListener('click', () => this.nextStep());
    document.getElementById('prevBtn')?.addEventListener('click', () => this.prevStep());
    document.getElementById('bookPackageBtn')?.addEventListener('click', () => this.bookWithPackage());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.currentStep < this.totalSteps) this.nextStep();
      if (e.key === 'Escape' && this.currentStep > 1) this.prevStep();
    });
  }

  updateGoalOptions(gender) {
    const container = document.getElementById('goalOptions');
    if (!container) return;
    const goals = this.goalsByGender[gender] || this.goalsByGender.female;
    container.innerHTML = '';
    goals.forEach(goal => {
      const div = document.createElement('div');
      div.className = 'option-card';
      div.setAttribute('data-value', goal.value);
      div.innerHTML = `
        <i class="${goal.icon}" style="color: ${goal.color}; font-size: 2.5rem; margin-bottom: 1rem;"></i>
        <h3>${goal.title}</h3>
        <p>${goal.desc}</p>
      `;
      container.appendChild(div);
    });
  }

  nextStep() {
    const selected = document.querySelector(`#step${this.currentStep} .option-card.selected`);
    if (!selected && this.currentStep < this.totalSteps) {
      showNotification('Пожалуйста, выберите вариант', 'error');
      return;
    }

    if (this.currentStep < this.totalSteps) {
      document.getElementById(`step${this.currentStep}`)?.classList.remove('active');
      this.currentStep += 1;
      document.getElementById(`step${this.currentStep}`)?.classList.add('active');

      if (this.currentStep === 2 && this.answers.gender) {
        this.updateGoalOptions(this.answers.gender);
      }

      if (this.currentStep === this.totalSteps) {
        this.calculateResult();
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) nextBtn.style.display = 'none';
      }

      const prevBtn = document.getElementById('prevBtn');
      if (prevBtn) prevBtn.style.display = this.currentStep > 1 ? 'block' : 'none';

      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.disabled = true;

      this.updateProgress();
    }
  }

  prevStep() {
    if (this.currentStep <= 1) return;
    document.getElementById(`step${this.currentStep}`)?.classList.remove('active');
    this.currentStep -= 1;
    document.getElementById(`step${this.currentStep}`)?.classList.add('active');

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.style.display = this.currentStep > 1 ? 'block' : 'none';
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.style.display = 'block';
      nextBtn.disabled = false;
    }
    this.updateProgress();
  }

  calculateResult() {
    const all = Array.isArray(this.services) ? this.services.slice() : [];
    const gender = this.answers.gender || 'female';
    const goal = this.answers.goal || 'care';
    const budget = this.answers.budget || 6000;

    // фильтры по полу 
    let filtered = all;
    if (gender === 'female') {
      filtered = all.filter(s => {
        const n = (s.name || '').toLowerCase();
        return !n.includes('мужск');
      });
    } else {
      filtered = all.filter(s => {
        const n = (s.name || '').toLowerCase();
        return !n.includes('женск');
      });
    }

    // Категории под цели 
    const goalCategories = {
      event:  ['Парикмахерские', 'Ногтевой сервис', 'Визаж', 'Ресницы'],
      care:   ['Косметология', 'Ногтевой сервис', 'Ресницы'],
      change: ['Парикмахерские', 'Визаж', 'Ресницы'],
      support:['Парикмахерские', 'Ногтевой сервис']
    };

    const budgetLevels = {
      3000:  { maxPrice: 3000,  maxServices: 2 },
      6000:  { maxPrice: 6000,  maxServices: 3 },
      10000: { maxPrice: 10000, maxServices: 4 },
      15000: { maxPrice: 15000, maxServices: 5 }
    };

    const b = budgetLevels[budget] || budgetLevels[6000];
    const cats = goalCategories[goal] || goalCategories.care;

    let byCat = filtered.filter(s => cats.includes(s.category));
    if (byCat.length < 2) byCat = filtered.slice();

    byCat.sort((a, b) => Number(a.price) - Number(b.price));

    this.selectedServices = [];
    this.totalPrice = 0;
    for (const s of byCat) {
      const price = Number(s.price) || 0;
      if (this.selectedServices.length < b.maxServices && this.totalPrice + price <= b.maxPrice) {
        this.selectedServices.push(s);
        this.totalPrice += price;
      }
    }

    if (this.selectedServices.length === 0 && byCat.length) {
      this.selectedServices.push(byCat[0]);
      this.totalPrice = Number(byCat[0].price) || 0;
    }

    this.discount = this.selectedServices.length > 1 ? 15 : 10;
    this.discountAmount = Math.round(this.totalPrice * this.discount / 100);
    this.finalPrice = this.totalPrice - this.discountAmount;

    this.updateResultUI();
  }

  updateResultUI() {
    const goal = this.answers.goal || 'care';
    const gender = this.answers.gender || 'female';

    const titles = {
      event: 'Пакет "Готовность к событию"',
      care:  gender === 'male' ? 'Пакет "Уход за собой"' : 'Пакет "Забота о себе"',
      change:'Пакет "Новый образ"',
      support: 'Пакет "Регулярный уход"'
    };

    const desc = {
      event: 'Идеальный образ для важного дня',
      care:  gender === 'male' ? 'Уходовые процедуры и стрижка' : 'Восстановление и релаксация',
      change: gender === 'male' ? 'Смена имиджа' : 'Кардинальное преображение',
      support: gender === 'male' ? 'Поддержание ухоженного вида' : 'Поддержание красоты'
    };

    document.getElementById('packageTitle') && (document.getElementById('packageTitle').textContent = titles[goal] || titles.care);
    document.getElementById('packageDescription') && (document.getElementById('packageDescription').textContent = desc[goal] || desc.care);

    const list = document.getElementById('packageList');
    if (list) {
      list.innerHTML = '';
      this.selectedServices.forEach(s => {
        const div = document.createElement('div');
        div.className = 'package-item';
        div.innerHTML = `
          <span>${s.name}</span>
          <span class="service-price">${Number(s.price)} ₽</span>
        `;
        list.appendChild(div);
      });
    }

    document.getElementById('finalPrice') && (document.getElementById('finalPrice').textContent = `${this.finalPrice} ₽`);
    document.getElementById('originalTotalPrice') && (document.getElementById('originalTotalPrice').textContent = `${this.totalPrice} ₽`);
    document.getElementById('discountPercent') && (document.getElementById('discountPercent').textContent = `${this.discount}`);
    document.getElementById('discountAmount') && (document.getElementById('discountAmount').textContent = `${this.discountAmount}`);

    const savingsInfo = document.getElementById('savingsInfo');
    if (savingsInfo) {
      savingsInfo.innerHTML = `
        <div class="savings-badge" style="display:inline-block;background:var(--accent);color:var(--dark);padding:.5rem 1rem;border-radius:20px;font-weight:700;">
          <i class="fas fa-gift"></i> Вы экономите: <strong>${this.discountAmount} ₽ (${this.discount}%)</strong>
        </div>
        <p style="margin-top:.5rem;opacity:.9;">
          <i class="fas fa-percentage"></i> Скидка применяется ко всем услугам в пакете
        </p>
      `;
    }
  }

  bookWithPackage() {
    if (!this.selectedServices.length) {
      showNotification('Сначала получите пакет услуг', 'error');
      return;
    }

    const pkg = {
      title: document.getElementById('packageTitle')?.textContent || 'Персональный пакет',
      description: document.getElementById('packageDescription')?.textContent || '',
      services: this.selectedServices.map(s => String(s.id)),
      serviceNames: this.selectedServices.map(s => s.name),
      servicePrices: this.selectedServices.map(s => Number(s.price) || 0),
      totalPrice: this.finalPrice,
      originalPrice: this.totalPrice,
      discount: this.discount,
      discountAmount: this.discountAmount,
      gender: this.answers.gender,
      goal: this.answers.goal,
      budget: this.answers.budget,
      timestamp: Date.now(),
      source: 'calculator'
    };

    localStorage.setItem('selected_package', JSON.stringify(pkg));

    const firstServiceId = this.selectedServices[0].id;
    window.location.href = `book.html?package=true&service=${encodeURIComponent(firstServiceId)}`;
  }

  updateProgress() {
    const progress = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = `${progress}%`;
  }
}

// Авто-инициализация
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.calculator-steps')) {
    const calc = new BeautyCalculator();
    calc.init();
    window.beautyCalculator = calc;
  }
});
