'use strict';

/**
 * n8n automation layer.
 *
 * Thin, dependency-free webhook dispatcher. Every automation (Telegram alerts,
 * confirmation e-mails, Google-Sheets logging, low-stock alerts) is wired up in
 * n8n; this module simply POSTs a JSON event to the configured webhook URL.
 *
 * Design guarantees:
 *   * Fire-and-forget — never blocks or fails the customer request.
 *   * No-op when N8N_ENABLED is false or the specific webhook URL is blank.
 *   * Optional HMAC signature header so n8n can verify the call is authentic.
 */

const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

function sign(payload) {
  if (!config.n8n.secret) return undefined;
  return crypto.createHmac('sha256', config.n8n.secret).update(payload).digest('hex');
}

/**
 * Dispatch an event to an n8n webhook.
 * @param {string} url   Configured webhook URL (may be empty → no-op).
 * @param {string} event Logical event name (for logging/routing).
 * @param {object} data  Arbitrary JSON-serialisable payload.
 */
async function dispatch(url, event, data) {
  if (!config.n8n.enabled || !url) return { skipped: true };

  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data });
  const headers = { 'Content-Type': 'application/json' };
  const signature = sign(body);
  if (signature) headers['X-Webhook-Signature'] = signature;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      logger.warn('n8n webhook returned non-2xx', { event, status: res.status });
    } else {
      logger.debug('n8n webhook dispatched', { event });
    }
    return { ok: res.ok, status: res.status };
  } catch (err) {
    logger.warn('n8n webhook dispatch failed', { event, error: err.message });
    return { ok: false, error: err.message };
  }
}

/** Convenience wrappers for each automation hook. */
const automation = {
  orderCreated: (order) =>
    void dispatch(config.n8n.webhooks.orderCreated, 'order.created', order),

  orderStatusChanged: (order) =>
    void dispatch(config.n8n.webhooks.orderStatus, 'order.status_changed', order),

  lowStock: (product) =>
    void dispatch(config.n8n.webhooks.lowStock, 'inventory.low_stock', product),

  userRegistered: (user) =>
    void dispatch(config.n8n.webhooks.userRegistered, 'user.registered', user),
};

module.exports = { dispatch, automation };
