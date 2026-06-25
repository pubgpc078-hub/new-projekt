'use strict';

/**
 * Database seeder.
 *
 *   npm run seed          → ensure schema + insert demo data if empty
 *   npm run reset         → drop all rows first, then seed
 *
 * Produces a realistic home-appliances catalogue, a default admin account, a
 * demo customer, sample coupons and a few reviews.
 */

const { db } = require('../config/database');
const { hashPassword, slugify } = require('../utils/security');
const config = require('../config');
const logger = require('../utils/logger');

const RESET = process.argv.includes('--reset');

const categories = [
  { name: 'آشپزخانه', slug: 'kitchen', icon: '🍳', description: 'لوازم آشپزخانه مدرن و حرفه‌ای' },
  { name: 'لوازم خانگی بزرگ', slug: 'large-appliances', icon: '🧺', description: 'یخچال، ماشین لباسشویی و ظرفشویی' },
  { name: 'تهویه و سرمایش', slug: 'climate', icon: '❄️', description: 'کولر، بخاری و تصفیه هوا' },
  { name: 'مراقبت شخصی', slug: 'personal-care', icon: '💈', description: 'سشوار، ریش‌تراش و اتو مو' },
  { name: 'جاروبرقی و نظافت', slug: 'cleaning', icon: '🧹', description: 'جاروبرقی و رباتیک' },
  { name: 'صوتی و تصویری', slug: 'audio-video', icon: '📺', description: 'تلویزیون و سیستم صوتی' },
];

const products = [
  {
    name: 'یخچال فریزر ساید بای ساید سامسونگ RS68',
    brand: 'Samsung', category: 'large-appliances', price: 78500000, compare_price: 89900000,
    stock: 14, is_featured: true, is_trending: true,
    short_desc: 'یخچال ساید بای ساید با تکنولوژی No Frost و آبسردکن',
    image_url: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80',
    specs: { 'حجم': '617 لیتر', 'رنگ': 'استیل', 'نوع برفک': 'No Frost', 'گارانتی': '24 ماه' },
  },
  {
    name: 'ماشین لباسشویی ال‌جی 9 کیلویی سری F4',
    brand: 'LG', category: 'large-appliances', price: 42300000, compare_price: 47000000,
    stock: 22, is_featured: true, is_trending: true,
    short_desc: 'موتور Direct Drive با ۱۰ سال گارانتی موتور',
    image_url: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80',
    specs: { 'ظرفیت': '9 کیلوگرم', 'دور موتور': '1400 RPM', 'رنگ': 'سفید', 'گارانتی': '18 ماه' },
  },
  {
    name: 'ماشین ظرفشویی بوش سری 6 - 14 نفره',
    brand: 'Bosch', category: 'large-appliances', price: 51900000,
    stock: 9, is_featured: true,
    short_desc: 'ظرفشویی آلمانی با مصرف انرژی A+++',
    image_url: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&q=80',
    specs: { 'ظرفیت': '14 نفره', 'برنامه‌ها': '8 برنامه', 'رنگ': 'استیل', 'گارانتی': '24 ماه' },
  },
  {
    name: 'مایکروویو پاناسونیک 32 لیتری اینورتر',
    brand: 'Panasonic', category: 'kitchen', price: 14800000, compare_price: 16500000,
    stock: 30, is_trending: true,
    short_desc: 'مایکروویو با تکنولوژی اینورتر و گریل',
    image_url: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&q=80',
    specs: { 'حجم': '32 لیتر', 'توان': '1000 وات', 'گریل': 'دارد', 'گارانتی': '12 ماه' },
  },
  {
    name: 'سرخ‌کن بدون روغن فیلیپس Airfryer XXL',
    brand: 'Philips', category: 'kitchen', price: 9700000, compare_price: 11200000,
    stock: 48, is_featured: true, is_trending: true,
    short_desc: 'سرخ‌کن هوای داغ با ظرفیت خانواده',
    image_url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&q=80',
    specs: { 'ظرفیت': '7.3 لیتر', 'توان': '2225 وات', 'رنگ': 'مشکی', 'گارانتی': '18 ماه' },
  },
  {
    name: 'مخلوط‌کن و غذاساز کنوود سری Chef',
    brand: 'Kenwood', category: 'kitchen', price: 18900000,
    stock: 17,
    short_desc: 'غذاساز همه‌کاره با کاسه استیل ۴.۶ لیتری',
    image_url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80',
    specs: { 'توان': '1000 وات', 'حجم کاسه': '4.6 لیتر', 'متعلقات': '5 عدد', 'گارانتی': '24 ماه' },
  },
  {
    name: 'اسپرسوساز دلونگی Dedica EC685',
    brand: 'DeLonghi', category: 'kitchen', price: 21500000, compare_price: 24000000,
    stock: 12, is_trending: true,
    short_desc: 'اسپرسوساز باریک با فشار ۱۵ بار',
    image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&q=80',
    specs: { 'فشار': '15 بار', 'مخزن': '1.1 لیتر', 'رنگ': 'نقره‌ای', 'گارانتی': '12 ماه' },
  },
  {
    name: 'کولر گازی اینورتر گری 18000 سرد و گرم',
    brand: 'Gree', category: 'climate', price: 36800000,
    stock: 7, is_featured: true,
    short_desc: 'کولر گازی اینورتر با گاز R410a',
    image_url: 'https://images.unsplash.com/photo-1631545806609-c2b999c5b5a8?w=800&q=80',
    specs: { 'ظرفیت': '18000 BTU', 'نوع': 'اینورتر سرد و گرم', 'کلاس انرژی': 'A', 'گارانتی': '36 ماه' },
  },
  {
    name: 'تصفیه هوا شیائومی Air Purifier 4 Pro',
    brand: 'Xiaomi', category: 'climate', price: 12300000, compare_price: 13900000,
    stock: 26, is_trending: true,
    short_desc: 'تصفیه هوای هوشمند با فیلتر HEPA و نمایشگر OLED',
    image_url: 'https://images.unsplash.com/photo-1626436819821-d2edd5fee674?w=800&q=80',
    specs: { 'پوشش': '60 متر مربع', 'فیلتر': 'HEPA H13', 'اتصال': 'WiFi', 'گارانتی': '12 ماه' },
  },
  {
    name: 'جاروبرقی رباتیک آی‌روبات Roomba i7',
    brand: 'iRobot', category: 'cleaning', price: 33500000, compare_price: 38000000,
    stock: 11, is_featured: true, is_trending: true,
    short_desc: 'جارو رباتیک با نقشه‌برداری هوشمند خانه',
    image_url: 'https://images.unsplash.com/photo-1603618000050-d9d4b6a6e5b5?w=800&q=80',
    specs: { 'ناوبری': 'iAdapt 3.0', 'باتری': '75 دقیقه', 'اتصال': 'WiFi + App', 'گارانتی': '12 ماه' },
  },
  {
    name: 'جاروبرقی بدون کیسه بوش سری 4',
    brand: 'Bosch', category: 'cleaning', price: 15600000,
    stock: 20,
    short_desc: 'جاروبرقی پرقدرت با فیلتر HEPA',
    image_url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&q=80',
    specs: { 'توان': '2200 وات', 'فیلتر': 'HEPA', 'رنگ': 'قرمز', 'گارانتی': '24 ماه' },
  },
  {
    name: 'سشوار حرفه‌ای فیلیپس BHD340',
    brand: 'Philips', category: 'personal-care', price: 4200000, compare_price: 4900000,
    stock: 55,
    short_desc: 'سشوار یونیزه با ۶ حالت دما و سرعت',
    image_url: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80',
    specs: { 'توان': '2100 وات', 'حالت‌ها': '6 حالت', 'یونیزه': 'دارد', 'گارانتی': '12 ماه' },
  },
  {
    name: 'ریش‌تراش براون سری 9 Pro',
    brand: 'Braun', category: 'personal-care', price: 28900000, compare_price: 32500000,
    stock: 13, is_trending: true,
    short_desc: 'ریش‌تراش ضد آب با پایه شارژ و تمیزکننده',
    image_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800&q=80',
    specs: { 'ضد آب': 'دارد', 'شارژ': '60 دقیقه', 'تیغه': '5 المان برش', 'گارانتی': '24 ماه' },
  },
  {
    name: 'تلویزیون هوشمند سامسونگ 55 اینچ Crystal UHD',
    brand: 'Samsung', category: 'audio-video', price: 44900000, compare_price: 49900000,
    stock: 16, is_featured: true, is_trending: true,
    short_desc: 'تلویزیون 4K با سیستم عامل Tizen',
    image_url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
    specs: { 'سایز': '55 اینچ', 'کیفیت': '4K UHD', 'هوشمند': 'Tizen OS', 'گارانتی': '24 ماه' },
  },
  {
    name: 'ساندبار ال‌جی 3.1 کانال با ساب‌ووفر',
    brand: 'LG', category: 'audio-video', price: 19800000,
    stock: 18,
    short_desc: 'سیستم صوتی خانگی با Dolby Atmos',
    image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
    specs: { 'کانال': '3.1', 'توان': '420 وات', 'بلوتوث': 'دارد', 'گارانتی': '18 ماه' },
  },
  {
    name: 'چای‌ساز و کتری برقی فلر TS091',
    brand: 'Feller', category: 'kitchen', price: 3100000, compare_price: 3600000,
    stock: 60,
    short_desc: 'چای‌ساز استیل با قوری شیشه‌ای ۱.۵ لیتری',
    image_url: 'https://images.unsplash.com/photo-1556909211-36987daf7b4d?w=800&q=80',
    specs: { 'توان': '2200 وات', 'حجم': '1.7 لیتر', 'جنس': 'استیل', 'گارانتی': '12 ماه' },
  },
];

const coupons = [
  { code: 'WELCOME10', type: 'percent', value: 10, min_subtotal: 5000000, max_discount: 5000000 },
  { code: 'MK500K', type: 'fixed', value: 5000000, min_subtotal: 30000000 },
  { code: 'SUMMER15', type: 'percent', value: 15, min_subtotal: 20000000, max_discount: 10000000, usage_limit: 100 },
];

function clearAll() {
  const tables = ['inventory_logs', 'reviews', 'payments', 'order_items', 'orders', 'products', 'categories', 'coupons', 'users'];
  db.pragma('foreign_keys = OFF');
  for (const t of tables) db.prepare(`DELETE FROM ${t}`).run();
  db.prepare("DELETE FROM sqlite_sequence").run();
  db.pragma('foreign_keys = ON');
  logger.info('Cleared all tables');
}

async function seed(reset = RESET) {
  if (reset) clearAll();

  const existing = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (existing > 0 && !reset) {
    logger.info('Database already seeded — skipping (use npm run reset to rebuild)');
    return false;
  }

  // Bcrypt is async, but better-sqlite3 transactions must be synchronous —
  // so we compute the hashes up front and pass them into the transaction.
  const adminHash = await hashPassword(config.seed.adminPassword);
  const custHash = await hashPassword('Customer@123');

  const insertMany = db.transaction(() => {
    // Categories
    const catIds = {};
    const insCat = db.prepare(
      'INSERT INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    categories.forEach((c, i) => {
      const info = insCat.run(c.name, c.slug, c.description, c.icon, i);
      catIds[c.slug] = info.lastInsertRowid;
    });

    // Products
    const insProd = db.prepare(
      `INSERT INTO products
        (name, slug, brand, sku, description, short_desc, price, compare_price, category_id,
         stock, image_url, gallery, specs, is_featured, is_trending, rating_avg, rating_count)
       VALUES
        (@name, @slug, @brand, @sku, @description, @short_desc, @price, @compare_price, @category_id,
         @stock, @image_url, @gallery, @specs, @is_featured, @is_trending, @rating_avg, @rating_count)`
    );
    const productIds = [];
    products.forEach((p, i) => {
      const slug = `${slugify(p.brand)}-${slugify(p.name).slice(0, 40)}-${i}`;
      const info = insProd.run({
        name: p.name,
        slug,
        brand: p.brand,
        sku: `MK-${1000 + i}`,
        description:
          (p.short_desc || '') +
          ' — این محصول اورجینال بوده و دارای گارانتی معتبر شرکتی است. ارسال سریع به سراسر کشور و امکان پرداخت در محل برای شهرهای منتخب.',
        short_desc: p.short_desc,
        price: p.price,
        compare_price: p.compare_price ?? null,
        category_id: catIds[p.category],
        stock: p.stock,
        image_url: p.image_url,
        gallery: JSON.stringify([p.image_url]),
        specs: JSON.stringify(p.specs || {}),
        is_featured: p.is_featured ? 1 : 0,
        is_trending: p.is_trending ? 1 : 0,
        rating_avg: 0,
        rating_count: 0,
      });
      productIds.push(info.lastInsertRowid);
    });

    // Coupons
    const insCoupon = db.prepare(
      `INSERT INTO coupons (code, type, value, min_subtotal, max_discount, usage_limit)
       VALUES (@code, @type, @value, @min_subtotal, @max_discount, @usage_limit)`
    );
    coupons.forEach((c) =>
      insCoupon.run({
        code: c.code,
        type: c.type,
        value: c.value,
        min_subtotal: c.min_subtotal ?? 0,
        max_discount: c.max_discount ?? null,
        usage_limit: c.usage_limit ?? null,
      })
    );

    // Users
    db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('مدیر فروشگاه', config.seed.adminEmail.toLowerCase(), adminHash, 'admin');
    const customer = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run('کاربر نمونه', 'customer@manojankala.com', custHash, 'customer');

    // A few reviews on the first products
    const insReview = db.prepare(
      'INSERT INTO reviews (product_id, user_id, author_name, rating, title, body) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const sampleReviews = [
      [productIds[0], 5, 'عالی و باکیفیت', 'کیفیت ساخت فوق‌العاده است و خیلی کم‌صدا کار می‌کند.'],
      [productIds[1], 4, 'راضی هستم', 'لباسشویی خوبیه، فقط راهنمای فارسی کامل‌تری می‌خواست.'],
      [productIds[4], 5, 'بهترین خرید', 'سرخ‌کن بدون روغن واقعا کارمو راحت کرده، پیشنهاد می‌کنم.'],
      [productIds[9], 5, 'هوشمند و کاربردی', 'نقشه خونه رو دقیق می‌کشه و تمیزکاری عالیه.'],
    ];
    sampleReviews.forEach(([pid, rating, title, body], idx) => {
      insReview.run(pid, customer.lastInsertRowid, idx % 2 ? 'سارا محمدی' : 'علی رضایی', rating, title, body);
    });

    // Refresh rating aggregates
    const { ProductModel } = require('../models/productModel');
    [...new Set(sampleReviews.map((r) => r[0]))].forEach((pid) => ProductModel.refreshRating(pid));
  });

  insertMany();

  logger.info('Seed complete', {
    categories: categories.length,
    products: products.length,
    coupons: coupons.length,
    admin: config.seed.adminEmail,
  });
  return true;
}

module.exports = seed;

// Run as a CLI when invoked directly (`npm run seed` / `npm run reset`).
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Seed failed', { error: err.message, stack: err.stack });
      process.exit(1);
    });
}
