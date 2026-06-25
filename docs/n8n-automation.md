# n8n Automation Layer

Manojan Kala emits structured webhook events that you can wire into [n8n](https://n8n.io)
to automate the operational side of the store — Telegram alerts, confirmation
e-mails, Google-Sheets logging and inventory warnings — **without writing any
backend code**.

## How it works

The backend (`server/utils/n8n.js`) POSTs a JSON event to a configured webhook
URL whenever something noteworthy happens. Calls are **fire-and-forget**: they
run after the customer response is sent and never block or fail checkout.

Enable the layer in `.env`:

```env
N8N_ENABLED=true
N8N_ORDER_CREATED_WEBHOOK=https://your-n8n/webhook/mk-order-created
N8N_ORDER_STATUS_WEBHOOK=https://your-n8n/webhook/mk-order-status
N8N_LOW_STOCK_WEBHOOK=https://your-n8n/webhook/mk-low-stock
N8N_USER_REGISTERED_WEBHOOK=https://your-n8n/webhook/mk-user
# Optional: shared secret -> sent as the `X-Webhook-Signature` (HMAC-SHA256) header
N8N_WEBHOOK_SECRET=super-secret-value
```

Leave any URL blank to disable just that automation.

## Events & payloads

### `order.created`
Fires the moment an order is placed.

```json
{
  "event": "order.created",
  "timestamp": "2026-06-25T20:00:00.000Z",
  "data": {
    "orderNumber": "MK-20260625-AB12CD",
    "total": 8730000,
    "subtotal": 9700000,
    "discount": 970000,
    "customer": { "name": "...", "email": "...", "phone": "..." },
    "items": [{ "name": "...", "qty": 1, "price": 9700000 }],
    "createdAt": "2026-06-25 20:00:00"
  }
}
```

### `order.status_changed`
Fires when an admin updates an order's status (paid, shipped, …).

### `inventory.low_stock`
Fires when a product's stock falls to or below `LOW_STOCK_THRESHOLD`.

```json
{ "event": "inventory.low_stock", "data": { "id": 5, "name": "...", "stock": 3 } }
```

### `user.registered`
Fires when a new customer creates an account.

## Recommended workflows

| Goal | n8n nodes |
| --- | --- |
| **Telegram alert on new order** | Webhook → (verify signature) → Telegram |
| **Order confirmation e-mail** | Webhook → Send Email (SMTP / Gmail) |
| **Log orders to Google Sheets** | Webhook → Google Sheets → Append Row |
| **Notify admin of low stock** | Webhook → Telegram / Slack / Email |
| **Welcome e-mail** | Webhook (`user.registered`) → Send Email |

### Example: order → Telegram (n8n)

1. Add a **Webhook** node, method `POST`, path `mk-order-created`. Copy its
   production URL into `N8N_ORDER_CREATED_WEBHOOK`.
2. (Optional) Add a **Crypto / Function** node to verify the
   `X-Webhook-Signature` header equals
   `HMAC-SHA256(rawBody, N8N_WEBHOOK_SECRET)`.
3. Add a **Telegram** node:
   > 🛒 سفارش جدید `{{$json.data.orderNumber}}`
   > مبلغ: `{{$json.data.total}}`
   > مشتری: `{{$json.data.customer.name}}`
4. Activate the workflow.

### Verifying the signature (Function node)

```js
const crypto = require('crypto');
const raw = JSON.stringify($json.body); // or use the raw body
const expected = crypto.createHmac('sha256', 'super-secret-value')
  .update(raw).digest('hex');
if ($headers['x-webhook-signature'] !== expected) {
  throw new Error('Invalid signature');
}
return items;
```

## Testing locally without n8n

Point a webhook at any request-bin style endpoint (e.g. `https://webhook.site`)
and place an order — you'll see the JSON payload arrive immediately.
