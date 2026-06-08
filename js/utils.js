function initQuoteSlider() {
    const quotes = [
        { text: "Красота начинается с решения быть собой", author: "Коко Шанель" },
        { text: "Уход за собой — это уважение к самому себе", author: "Неизвестный автор" },
        { text: "Настоящая красота не имеет возраста", author: "Кристиан Диор" },
        { text: "Инвестиции в себя всегда окупаются", author: "Одри Хепбёрн" }
    ];
    
    let currentQuote = 0;
    const quoteElement = document.querySelector('.quote');
    const authorElement = document.querySelector('.author');
    
    if (quoteElement && authorElement) {
        function changeQuote() {
            currentQuote = (currentQuote + 1) % quotes.length;
            quoteElement.textContent = `"${quotes[currentQuote].text}"`;
            authorElement.textContent = `— ${quotes[currentQuote].author}`;
        }
        
        // Меняем цитату каждые 5 секунд
        setInterval(changeQuote, 5000);
    }
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Форматирование времени
function formatTime(timeString) {
    return timeString;
}
// Форматирование номера телефона
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `+${cleaned[0]} (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
    }
    return phone;
}

// Валидация телефона
function validatePhone(phone) {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
}
// Экспорт функций в глобальную область видимости
window.initQuoteSlider = initQuoteSlider;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.formatPhoneNumber = formatPhoneNumber;
window.validatePhone = validatePhone;
// Уведомления 
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#9a6a6a' : '#7a9b8d'};
        color: white;
        padding: 1rem 1.25rem;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 99999;
        font-size: 0.95rem;
        max-width: 320px;
        line-height: 1.35;
    `;
    const icon = type === 'error' ? '⚠️' : '✅';
    notification.textContent = `${icon} ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-6px)';
        notification.style.transition = 'all .25s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

window.showNotification = showNotification;