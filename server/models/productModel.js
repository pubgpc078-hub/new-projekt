'use strict';

const { db, parseJson } = require('./index');

/** Shape a raw DB row into an API-friendly object (parsing JSON columns). */
function mapProduct(row) {
  if (!row) return null;
  return {
    ...row,
    gallery: parseJson(row.gallery, []),
    specs: parseJson(row.specs, {}),
    is_featured: !!row.is_featured,
    is_trending: !!row.is_trending,
    is_active: !!row.is_active,
    on_sale: row.compare_price != null && row.compare_price > row.price,
  };
}

const SORTABLE = {
  newest: 'p.created_at DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  rating: 'p.rating_avg DESC',
  popular: 'p.rating_count DESC',
};

const ProductModel = {
  /**
   * Paginated, filterable catalogue query.
   * Filters: q (search), category (slug), brand, minPrice, maxPrice,
   *          featured, trending, sort, page, perPage, includeInactive.
   */
  search(opts = {}) {
    const {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      featured,
      trending,
      sort = 'newest',
      page = 1,
      perPage = 12,
      includeInactive = false,
    } = opts;

    const where = [];
    const params = {};

    if (!includeInactive) where.push('p.is_active = 1');

    if (q) {
      where.push('(p.name LIKE @q OR p.brand LIKE @q OR p.short_desc LIKE @q OR p.description LIKE @q)');
      params.q = `%${q}%`;
    }
    if (category) {
      where.push('c.slug = @category');
      params.category = category;
    }
    if (brand) {
      where.push('p.brand = @brand');
      params.brand = brand;
    }
    if (minPrice != null) {
      where.push('p.price >= @minPrice');
      params.minPrice = minPrice;
    }
    if (maxPrice != null) {
      where.push('p.price <= @maxPrice');
      params.maxPrice = maxPrice;
    }
    if (featured) where.push('p.is_featured = 1');
    if (trending) where.push('p.is_trending = 1');

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderSql = SORTABLE[sort] || SORTABLE.newest;

    const total = db
      .prepare(
        `SELECT COUNT(*) AS c FROM products p
         LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`
      )
      .get(params).c;

    const safePerPage = Math.min(Math.max(parseInt(perPage, 10) || 12, 1), 60);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safePerPage;

    const rows = db
      .prepare(
        `SELECT p.*, c.name AS category_name, c.slug AS category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         ${whereSql}
         ORDER BY ${orderSql}
         LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit: safePerPage, offset });

    return {
      items: rows.map(mapProduct),
      pagination: {
        page: safePage,
        perPage: safePerPage,
        total,
        totalPages: Math.ceil(total / safePerPage) || 1,
      },
    };
  },

  findBySlug(slug) {
    const row = db
      .prepare(
        `SELECT p.*, c.name AS category_name, c.slug AS category_slug
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.slug = ?`
      )
      .get(slug);
    return mapProduct(row);
  },

  findById(id) {
    return mapProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
  },

  related(productId, categoryId, limit = 4) {
    const rows = db
      .prepare(
        `SELECT * FROM products
         WHERE category_id = ? AND id != ? AND is_active = 1
         ORDER BY rating_avg DESC, created_at DESC LIMIT ?`
      )
      .all(categoryId, productId, limit);
    return rows.map(mapProduct);
  },

  brands() {
    return db
      .prepare(`SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND is_active = 1 ORDER BY brand`)
      .all()
      .map((r) => r.brand);
  },

  create(data) {
    const info = db
      .prepare(
        `INSERT INTO products
          (name, slug, brand, sku, description, short_desc, price, compare_price,
           category_id, stock, image_url, gallery, specs, is_featured, is_trending, is_active)
         VALUES
          (@name, @slug, @brand, @sku, @description, @short_desc, @price, @compare_price,
           @category_id, @stock, @image_url, @gallery, @specs, @is_featured, @is_trending, @is_active)`
      )
      .run({
        name: data.name,
        slug: data.slug,
        brand: data.brand ?? null,
        sku: data.sku ?? null,
        description: data.description ?? null,
        short_desc: data.short_desc ?? null,
        price: data.price,
        compare_price: data.compare_price ?? null,
        category_id: data.category_id ?? null,
        stock: data.stock ?? 0,
        image_url: data.image_url ?? null,
        gallery: JSON.stringify(data.gallery ?? []),
        specs: JSON.stringify(data.specs ?? {}),
        is_featured: data.is_featured ? 1 : 0,
        is_trending: data.is_trending ? 1 : 0,
        is_active: data.is_active === false ? 0 : 1,
      });
    return this.findById(info.lastInsertRowid);
  },

  update(id, data) {
    const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!current) return null;
    db.prepare(
      `UPDATE products SET
         name = @name, brand = @brand, sku = @sku, description = @description,
         short_desc = @short_desc, price = @price, compare_price = @compare_price,
         category_id = @category_id, stock = @stock, image_url = @image_url,
         gallery = @gallery, specs = @specs, is_featured = @is_featured,
         is_trending = @is_trending, is_active = @is_active, updated_at = datetime('now')
       WHERE id = @id`
    ).run({
      id,
      name: data.name ?? current.name,
      brand: data.brand ?? current.brand,
      sku: data.sku ?? current.sku,
      description: data.description ?? current.description,
      short_desc: data.short_desc ?? current.short_desc,
      price: data.price ?? current.price,
      compare_price: data.compare_price ?? current.compare_price,
      category_id: data.category_id ?? current.category_id,
      stock: data.stock ?? current.stock,
      image_url: data.image_url ?? current.image_url,
      gallery: data.gallery ? JSON.stringify(data.gallery) : current.gallery,
      specs: data.specs ? JSON.stringify(data.specs) : current.specs,
      is_featured: data.is_featured != null ? (data.is_featured ? 1 : 0) : current.is_featured,
      is_trending: data.is_trending != null ? (data.is_trending ? 1 : 0) : current.is_trending,
      is_active: data.is_active != null ? (data.is_active ? 1 : 0) : current.is_active,
    });
    return this.findById(id);
  },

  remove(id) {
    return db.prepare('DELETE FROM products WHERE id = ?').run(id).changes;
  },

  count() {
    return db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  },

  /** Recompute denormalised rating aggregates for a product. */
  refreshRating(productId) {
    const agg = db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS avg
         FROM reviews WHERE product_id = ? AND is_approved = 1`
      )
      .get(productId);
    db.prepare('UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
      Math.round(agg.avg * 10) / 10,
      agg.count,
      productId
    );
  },
};

module.exports = { ProductModel, mapProduct };
