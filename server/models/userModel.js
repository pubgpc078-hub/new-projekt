'use strict';

const { db } = require('./index');

const PUBLIC_COLUMNS = 'id, name, email, phone, role, is_active, created_at';

const UserModel = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  },

  findById(id) {
    return db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(id);
  },

  create({ name, email, passwordHash, phone = null, role = 'customer' }) {
    const info = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, phone, role)
         VALUES (@name, @email, @passwordHash, @phone, @role)`
      )
      .run({ name, email: String(email).toLowerCase(), passwordHash, phone, role });
    return this.findById(info.lastInsertRowid);
  },

  update(id, { name, phone }) {
    db.prepare(
      `UPDATE users SET name = COALESCE(@name, name),
                        phone = COALESCE(@phone, phone),
                        updated_at = datetime('now')
       WHERE id = @id`
    ).run({ id, name: name ?? null, phone: phone ?? null });
    return this.findById(id);
  },

  list({ limit = 50, offset = 0 } = {}) {
    return db
      .prepare(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(limit, offset);
  },

  count() {
    return db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  },
};

module.exports = UserModel;
