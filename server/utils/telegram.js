'use strict';

/**
 * Direct Telegram notifier.
 *
 * A zero-dependency alternative to the full n8n layer: when a bot token and
 * chat id are configured, every new order is pushed straight to the shop
 * owner's Telegram in real time. This means orders reach the owner instantly
 * even on an ephemeral free host where the database might later reset.
 *
 * Setup (no coding required):
 *   1. In Telegram, message @BotFather → /newbot → copy the bot token.
 *   2. Message your new bot once, then open
 *      https://api.telegram.org/bot<TOKEN>/getUpdates to find your chat id.
 *   3. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in the host's env vars.
 */

const config = require('../config');
const logger = require('./logger');

const fmt = new Intl.NumberFormat('fa-IR');
const toman = (v) => `${fmt.format(Math.round(v))} تومان`;

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function buildOrderMessage(order) {
  const lines = (order.items || [])
    .map((i) => `• ${escapeHtml(i.product_name)} × ${i.quantity} — ${toman(i.line_total)}`)
    .join('\n');
  return (
    `🛒 <b>سفارش جدید</b>\n` +
    `شماره: <code>${escapeHtml(order.order_number)}</code>\n\n` +
    `👤 ${escapeHtml(order.customer_name)}\n` +
    `📞 ${escapeHtml(order.customer_phone || '-')}\n` +
    `✉️ ${escapeHtml(order.customer_email)}\n` +
    `📍 ${escapeHtml(order.shipping_address)}\n\n` +
    `${lines}\n\n` +
    (order.discount ? `تخفیف: ${toman(order.discount)}\n` : '') +
    `💰 <b>مبلغ کل: ${toman(order.total)}</b>`
  );
}

/**
 * Send an order notification to Telegram. Fire-and-forget; never throws.
 * No-op when the bot token / chat id are not configured.
 */
async function notifyOrder(order) {
  const { botToken, chatId } = config.telegram;
  if (!botToken || !chatId) return { skipped: true };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildOrderMessage(order),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) logger.warn('Telegram notify non-2xx', { status: res.status });
    return { ok: res.ok };
  } catch (err) {
    logger.warn('Telegram notify failed', { error: err.message });
    return { ok: false, error: err.message };
  }
}

module.exports = { notifyOrder };
