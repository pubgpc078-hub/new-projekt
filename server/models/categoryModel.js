'use strict';

const { db } = require('./index');

const CategoryModel = {
  all() {
    return db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM products p
                       WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
         FROM categories c ORDER BY c.sort_order, c.name`
      )
      .all();
  },

  findBySlug(slug) {
    return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
  },

  findById(id) {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  },

  create({ name, slug, description = null, icon = null, parentId = null, sortOrder = 0 }) {
    const info = db
      .prepare(
        `INSERT INTO categories (name, slug, description, icon, parent_id, sort_order)
         VALUES (@name, @slug, @description, @icon, @parentId, @sortOrder)`
      )
      .run({ name, slug, description, icon, parentId, sortOrder });
    return this.findById(info.lastInsertRowid);
  },

  update(id, fields) {
    db.prepare(
      `UPDATE categories SET
         name = COALESCE(@name, name),
         description = COALESCE(@description, description),
         icon = COALESCE(@icon, icon),
         sort_order = COALESCE(@sortOrder, sort_order)
       WHERE id = @id`
    ).run({
      id,
      name: fields.name ?? null,
      description: fields.description ?? null,
      icon: fields.icon ?? null,
      sortOrder: fields.sortOrder ?? null,
    });
    return this.findById(id);
  },

  remove(id) {
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id).changes;
  },
};

module.exports = CategoryModel;
