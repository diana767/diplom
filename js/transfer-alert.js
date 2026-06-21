(function () {
  'use strict';

  const phone = localStorage.getItem('client_phone');
  if (!phone || document.body?.dataset?.adminPage === 'true') return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[ch]));

  function ensureStyles() {
    if (document.getElementById('transferAlertStyles')) return;
    const style = document.createElement('style');
    style.id = 'transferAlertStyles';
    style.textContent = `
      .transfer-alert-overlay{position:fixed;inset:0;background:rgba(48,20,31,.52);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
      .transfer-alert-card{width:min(560px,100%);max-height:90vh;overflow:auto;background:#fff8fb;color:#4b2432;border:1px solid #f2bfd0;border-radius:24px;box-shadow:0 24px 70px rgba(83,31,52,.28);padding:28px}
      .transfer-alert-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:18px}
      .transfer-alert-icon{width:52px;height:52px;flex:0 0 52px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e64f82,#f28dab);color:white;font-size:22px}
      .transfer-alert-title{margin:0 0 6px;font-size:1.35rem;color:#4b2432}
      .transfer-alert-subtitle{margin:0;color:#7f5262;line-height:1.5}
      .transfer-alert-details{background:#fff;border:1px solid #f4ceda;border-radius:16px;padding:16px;margin:16px 0;line-height:1.65}
      .transfer-alert-message{background:#fcebf1;border-left:4px solid #e75b87;border-radius:10px;padding:12px 14px;margin-top:12px;color:#5c3040}
      .transfer-alert-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}
      .transfer-alert-btn{border:0;border-radius:999px;padding:12px 20px;font-weight:800;cursor:pointer;font-size:.98rem;transition:.2s;flex:1;min-width:180px}
      .transfer-alert-btn:hover{transform:translateY(-1px)}
      .transfer-alert-accept{background:linear-gradient(135deg,#df477a,#f0789e);color:#fff}
      .transfer-alert-decline{background:#fff;color:#a23659;border:2px solid #e8a9bd}
      .transfer-alert-close{display:block;margin:14px auto 0;background:none;border:0;color:#8b6371;text-decoration:underline;cursor:pointer}
      [data-theme="dark"] .transfer-alert-card{background:#39252d;color:#fff4f7;border-color:#865469}
      [data-theme="dark"] .transfer-alert-title{color:#fff4f7}
      [data-theme="dark"] .transfer-alert-subtitle{color:#e2bdca}
      [data-theme="dark"] .transfer-alert-details{background:#452d37;border-color:#765063}
      [data-theme="dark"] .transfer-alert-message{background:#51313e;color:#ffe9f0}
      @media(max-width:520px){.transfer-alert-card{padding:21px;border-radius:20px}.transfer-alert-actions{flex-direction:column}.transfer-alert-btn{width:100%;min-width:0}}
    `;
    document.head.appendChild(style);
  }

  async function api(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { throw new Error('Сервер вернул некорректный ответ'); }
    return data;
  }

  function removeModal() {
    document.getElementById('globalTransferAlert')?.remove();
  }

  async function respond(requestId, action) {
    const question = action === 'accept'
      ? 'Согласиться на предложенный перенос записи?'
      : 'Отказаться от переноса? Ваша запись будет полностью отменена.';
    if (!window.confirm(question)) return;

    const buttons = document.querySelectorAll('.transfer-alert-btn');
    buttons.forEach((button) => { button.disabled = true; });
    try {
      const result = await api('php/api/respond_transfer_request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfer_request_id: Number(requestId), phone, action })
      });
      if (!result.success) throw new Error(result.error || 'Не удалось отправить ответ');
      removeModal();
      if (typeof window.showNotification === 'function') {
        window.showNotification(result.message || 'Ответ отправлен', 'success');
      } else {
        alert(result.message || 'Ответ отправлен');
      }
      window.dispatchEvent(new CustomEvent('salon-transfer-responded', { detail: { action, requestId } }));
    } catch (error) {
      alert(error.message || 'Ошибка соединения с сервером');
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  function showTransfer(notification) {
    if (document.getElementById('globalTransferAlert')) return;
    ensureStyles();
    const overlay = document.createElement('div');
    overlay.id = 'globalTransferAlert';
    overlay.className = 'transfer-alert-overlay';
    const date = notification.proposed_date
      ? new Date(notification.proposed_date + 'T00:00:00').toLocaleDateString('ru-RU')
      : 'не указана';
    const time = String(notification.proposed_time || '').slice(0, 5) || 'не указано';
    overlay.innerHTML = `
      <div class="transfer-alert-card" role="dialog" aria-modal="true" aria-labelledby="transferAlertTitle">
        <div class="transfer-alert-head">
          <div class="transfer-alert-icon"><i class="fas fa-calendar-alt"></i></div>
          <div>
            <h2 class="transfer-alert-title" id="transferAlertTitle">Вам предложен перенос записи</h2>
            <p class="transfer-alert-subtitle">Администратор изменил время или мастера. Пожалуйста, подтвердите решение.</p>
          </div>
        </div>
        <div class="transfer-alert-details">
          <div><strong>Новая дата:</strong> ${escapeHtml(date)}</div>
          <div><strong>Новое время:</strong> ${escapeHtml(time)}</div>
          <div><strong>Мастер:</strong> ${escapeHtml(notification.proposed_master_name || 'будет указан администратором')}</div>
          ${notification.admin_message ? `<div class="transfer-alert-message"><strong>Сообщение администратора:</strong><br>${escapeHtml(notification.admin_message)}</div>` : ''}
        </div>
        <div class="transfer-alert-actions">
          <button type="button" class="transfer-alert-btn transfer-alert-accept"><i class="fas fa-check"></i> Согласиться</button>
          <button type="button" class="transfer-alert-btn transfer-alert-decline"><i class="fas fa-times"></i> Отказаться и отменить запись</button>
        </div>
        <button type="button" class="transfer-alert-close">Напомнить позже</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.transfer-alert-accept').addEventListener('click', () => respond(notification.transfer_request_id, 'accept'));
    overlay.querySelector('.transfer-alert-decline').addEventListener('click', () => respond(notification.transfer_request_id, 'decline'));
    overlay.querySelector('.transfer-alert-close').addEventListener('click', removeModal);
  }

  async function checkTransfers() {
    try {
      const result = await api(`php/api/get_notifications.php?phone=${encodeURIComponent(phone)}`);
      if (!result.success || !Array.isArray(result.data)) return;
      const pending = result.data.find((item) =>
        item.type === 'transfer' && item.transfer_request_id && item.transfer_status === 'pending'
      );
      if (pending) showTransfer(pending);
    } catch (error) {
      console.warn('Не удалось проверить предложения переноса:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkTransfers, { once: true });
  } else {
    checkTransfers();
  }
  setInterval(checkTransfers, 60000);
})();
