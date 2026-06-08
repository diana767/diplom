// Общая клиентская проверка форм: телефоны, email, имена, банковская карта.
(function() {
    const phoneInputs = () => document.querySelectorAll('input[type="tel"], input[id*="phone" i], input[id*="Phone" i]');
    const nameInputs = () => document.querySelectorAll('input[id*="name" i]:not([type="hidden"]), input[id*="Name" i]:not([type="hidden"])');
    const cleanDigits = v => String(v || '').replace(/\D/g, '');

    function formatRuPhone(value) {
        let d = cleanDigits(value).slice(0, 11);
        if (d.startsWith('8')) d = '7' + d.slice(1);
        if (!d.startsWith('7') && d.length === 10) d = '7' + d;
        if (d.length <= 1) return d ? '+' + d : '';
        const p = ['+7'];
        if (d.length > 1) p.push(' (' + d.slice(1, 4));
        if (d.length >= 4) p[p.length - 1] += ')';
        if (d.length > 4) p.push(' ' + d.slice(4, 7));
        if (d.length > 7) p.push('-' + d.slice(7, 9));
        if (d.length > 9) p.push('-' + d.slice(9, 11));
        return p.join('');
    }

    function validatePhoneInput(input) {
        const digits = cleanDigits(input.value);
        const ok = digits.length >= 10 && digits.length <= 15;
        input.setCustomValidity(ok || !input.required && digits.length === 0 ? '' : 'Введите корректный номер телефона');
        return ok;
    }

    function validateNameInput(input) {
        const v = input.value.trim();
        if (!v && !input.required) { input.setCustomValidity(''); return true; }
        const ok = /^[А-Яа-яЁёA-Za-z\s-]{2,80}$/.test(v);
        input.setCustomValidity(ok ? '' : 'Используйте только буквы, пробел или дефис');
        return ok;
    }

    function initValidation() {
        phoneInputs().forEach(input => {
            input.placeholder = input.placeholder || '+7 (999) 123-45-67';
            input.autocomplete = input.autocomplete || 'tel';
            input.addEventListener('input', () => {
                const posEnd = input.selectionStart === input.value.length;
                input.value = formatRuPhone(input.value);
                validatePhoneInput(input);
                if (posEnd) input.selectionStart = input.selectionEnd = input.value.length;
            });
            input.addEventListener('blur', () => validatePhoneInput(input));
        });
        nameInputs().forEach(input => {
            input.minLength = input.minLength || 2;
            input.maxLength = input.maxLength || 80;
            input.addEventListener('input', () => validateNameInput(input));
            input.addEventListener('blur', () => validateNameInput(input));
        });
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                let ok = true;
                form.querySelectorAll('input[type="tel"]').forEach(inp => { if (!validatePhoneInput(inp)) ok = false; });
                form.querySelectorAll('input[id*="name" i], input[id*="Name" i]').forEach(inp => { if (!validateNameInput(inp)) ok = false; });
                if (!ok) {
                    e.preventDefault();
                    form.reportValidity();
                }
            }, true);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initValidation);
    else initValidation();
})();
