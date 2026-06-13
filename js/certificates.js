// Онлайн-сертификаты: демонстрационная оплата + сохранение в БД + скачивание PNG без сторонних библиотек.
(function() {
    const escapeXml = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&apos;','"':'&quot;'}[ch]));
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
    const byId = (id) => document.getElementById(id);
    let lastCertificate = null;

    function cleanDigits(value) { return String(value || '').replace(/\D/g, ''); }
    function validPhone(value) { const d = cleanDigits(value); return d.length >= 10 && d.length <= 15; }
    function luhnCheck(number) {
        const digits = cleanDigits(number);
        if (digits.length < 13 || digits.length > 19) return false;
        let sum = 0, shouldDouble = false;
        for (let i = digits.length - 1; i >= 0; i--) {
            let n = Number(digits[i]);
            if (shouldDouble) { n *= 2; if (n > 9) n -= 9; }
            sum += n;
            shouldDouble = !shouldDouble;
        }
        return sum % 10 === 0;
    }
    function parseExpiry(value) {
        const m = String(value || '').match(/^(\d{2})\/(\d{2})$/);
        if (!m) return null;
        const month = Number(m[1]);
        const year = 2000 + Number(m[2]);
        if (month < 1 || month > 12) return null;
        const now = new Date();
        const lastDay = new Date(year, month, 0, 23, 59, 59);
        if (lastDay < now) return null;
        return { month, year };
    }
    function formatCardNumber(value) {
        return cleanDigits(value).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
    }
    function formatExpiry(value) {
        const d = cleanDigits(value).slice(0, 4);
        if (d.length <= 2) return d;
        return d.slice(0, 2) + '/' + d.slice(2);
    }

    function syncPreview() {
        if (!byId('certificateAmount')) return;
        byId('previewAmount').textContent = Number(byId('certificateAmount')?.value || 0).toLocaleString('ru-RU');
        byId('previewRecipient').textContent = byId('certificateRecipient')?.value || 'получателя';
        byId('previewSender').textContent = byId('certificateSender')?.value || 'отправителя';
        byId('previewMessage').textContent = byId('certificateMessage')?.value || 'Пусть этот день будет красивым!';
    }

    function validateCertificateForm() {
        const amount = Number(byId('certificateAmount').value || 0);
        const recipient = byId('certificateRecipient').value.trim();
        const sender = byId('certificateSender').value.trim();
        const phone = byId('certificatePhone').value.trim();
        const email = byId('certificateEmail')?.value.trim() || '';
        const cardNumberRaw = byId('cardNumber')?.value.trim() || '4111 1111 1111 1111';
        const holder = byId('cardHolder')?.value.trim() || 'DEMO CLIENT';
        const expiryRaw = byId('cardExpiry')?.value.trim() || '12/30';
        const cvvRaw = byId('cardCvv')?.value.trim() || '123';

        if (amount < 500) throw new Error('Минимальная сумма сертификата — 500 ₽');
        if (amount > 200000) throw new Error('Максимальная сумма сертификата — 200 000 ₽');
        if (!/^[А-Яа-яЁёA-Za-z\s-]{2,80}$/.test(recipient)) throw new Error('Укажите корректное имя получателя');
        if (sender && !/^[А-Яа-яЁёA-Za-z\s-]{2,80}$/.test(sender)) throw new Error('Укажите корректное имя отправителя');
        if (!validPhone(phone)) throw new Error('Укажите корректный номер телефона');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Укажите корректный email');

        // Учебная демо-оплата: не блокируем оформление из-за Luhn/банковской проверки.
        // Проверяем только базовый формат, чтобы сертификаты стабильно создавались в учебном проекте.
        const cardDigits = cleanDigits(cardNumberRaw) || '4111111111111111';
        if (cardDigits.length < 12 || cardDigits.length > 19) throw new Error('Номер демо-карты должен содержать от 12 до 19 цифр');
        const exp = parseExpiry(expiryRaw) || { month: 12, year: 2030 };
        const cvv = cleanDigits(cvvRaw) || '123';
        if (cvv.length < 3 || cvv.length > 4) throw new Error('CVV должен содержать 3 или 4 цифры');
        return { amount, recipient, sender, phone, email, cardNumber: cardDigits, holder, exp, cvv };
    }

    function buildSvg(cert) {
        const amount = Number(cert.amount || 0).toLocaleString('ru-RU');
        const recipient = escapeXml(cert.recipient_name || 'Получатель');
        const sender = escapeXml(cert.sender_name || '');
        const message = escapeXml(cert.message || 'Пусть этот день будет красивым!');
        const code = escapeXml(cert.code || '');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
            <defs>
                <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff6f8"/><stop offset="1" stop-color="#ead8df"/></linearGradient>
                <linearGradient id="accent" x1="0" x2="1"><stop offset="0" stop-color="#8a2be2"/><stop offset="1" stop-color="#c94f7c"/></linearGradient>
                <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.22"/></filter>
            </defs>
            <rect width="1200" height="760" fill="url(#bg)"/>
            <rect x="70" y="70" width="1060" height="620" rx="38" fill="#ffffff" filter="url(#shadow)"/>
            <rect x="95" y="95" width="1010" height="570" rx="28" fill="none" stroke="url(#accent)" stroke-width="6" stroke-dasharray="22 14"/>
            <circle cx="160" cy="160" r="46" fill="url(#accent)" opacity="0.16"/><circle cx="1040" cy="600" r="76" fill="url(#accent)" opacity="0.12"/>
            <text x="600" y="165" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#6b4b58" letter-spacing="4">САЛОН КРАСОТЫ ЭЛЕГАНТ</text>
            <text x="600" y="255" text-anchor="middle" font-family="Georgia, serif" font-size="66" fill="#2f2430">Подарочный сертификат</text>
            <text x="600" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="78" font-weight="700" fill="#8a2be2">${amount} ₽</text>
            <text x="600" y="440" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#4f444c">Для: ${recipient}</text>
            ${sender ? `<text x="600" y="492" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#6b5f66">От: ${sender}</text>` : ''}
            <text x="600" y="555" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#6b5f66">${message}</text>
            <rect x="385" y="598" width="430" height="58" rx="18" fill="#f3e7ec"/>
            <text x="600" y="636" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#7c3150">КОД: ${code}</text>
        </svg>`;
    }

    function downloadCertificate(cert) {
        const svg = buildSvg(cert);
        const img = new Image();
        const svgBlob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 760;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            const a = document.createElement('a');
            a.download = `certificate_${cert.code}.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
        };
        img.src = url;
    }

    document.addEventListener('DOMContentLoaded', () => {
        ['certificateAmount','certificateRecipient','certificateSender','certificateMessage'].forEach(id => byId(id)?.addEventListener('input', syncPreview));
        if (byId('cardNumber') && !byId('cardNumber').value) byId('cardNumber').value = '4111 1111 1111 1111';
        if (byId('cardHolder') && !byId('cardHolder').value) byId('cardHolder').value = 'DEMO CLIENT';
        if (byId('cardExpiry') && !byId('cardExpiry').value) byId('cardExpiry').value = '12/30';
        if (byId('cardCvv') && !byId('cardCvv').value) byId('cardCvv').value = '123';
        byId('cardNumber')?.addEventListener('input', e => { e.target.value = formatCardNumber(e.target.value); });
        byId('cardExpiry')?.addEventListener('input', e => { e.target.value = formatExpiry(e.target.value); });
        byId('cardCvv')?.addEventListener('input', e => { e.target.value = cleanDigits(e.target.value).slice(0, 4); });
        syncPreview();

        byId('certificateForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const result = byId('certificateResult');
            try {
                const v = validateCertificateForm();
                result.innerHTML = '<div class="cert-result cert-loading"><i class="fas fa-spinner fa-spin"></i> Проверяем демонстрационную оплату...</div>';
                const payload = {
                    amount: v.amount,
                    recipient_name: v.recipient,
                    sender_name: v.sender,
                    phone: v.phone,
                    email: v.email,
                    message: byId('certificateMessage').value.trim(),
                    payment: {
                        demo: true,
                        card_number: cleanDigits(v.cardNumber),
                        card_holder: v.holder,
                        exp_month: v.exp.month,
                        exp_year: v.exp.year,
                        cvv: v.cvv
                    }
                };
                const response = await salonAPI.createGiftCertificate(payload);
                if (!response.success) throw new Error(response.error || 'Не удалось создать сертификат');
                lastCertificate = response.data;
                document.querySelector('.cert-code').textContent = 'Код: ' + lastCertificate.code;
                result.innerHTML = `
                    <div class="cert-result cert-success">
                        <strong><i class="fas fa-check-circle"></i> Демо-оплата прошла успешно!</strong><br>
                        Сертификат создан. Код: <b>${escapeHtml(lastCertificate.code)}</b><br>
                        <small>Карта: **** ${escapeHtml(lastCertificate.card_last4 || '')}</small><br>
                        <button type="button" id="downloadCertBtn" class="btn" style="margin-top:.75rem;"><i class="fas fa-download"></i> Скачать PNG</button>
                    </div>`;
                byId('downloadCertBtn').addEventListener('click', () => downloadCertificate(lastCertificate));
                setTimeout(() => downloadCertificate(lastCertificate), 350);
            } catch (error) {
                result.innerHTML = `<div class="cert-result cert-error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(error.message)}</div>`;
            }
        });
    });
})();
