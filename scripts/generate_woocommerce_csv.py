#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate a WooCommerce-compatible product import CSV for منوجان کالا,
using the exact same product data as the demo storefront (index.html)."""

import csv

BRANDS = ["سامسونگ", "ال‌جی", "اسنوا", "بوش", "هیمالیا", "پاکشوما", "گری", "دوو", "میدیا", "تی‌سی‌ال"]

CAT_FA = {
    "fridge": "یخچال و فریزر",
    "washer": "ماشین لباسشویی",
    "ac": "کولر گازی",
    "vacuum": "جاروبرقی",
    "kitchen": "لوازم آشپزخانه",
    "tv": "تلویزیون",
}

IMG = {
    "fridge": [
        "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1536353284924-9220c464e262?auto=format&fit=crop&w=600&q=80",
    ],
    "washer": [
        "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=600&q=80",
    ],
    "ac": [
        "https://images.unsplash.com/photo-1631545806609-c2b999c9f5ba?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1606394758429-89c705a8d1b1?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1635007841463-78c8f7a0f3d2?auto=format&fit=crop&w=600&q=80",
    ],
    "vacuum": [
        "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1603468620905-8de7d86b781e?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=600&q=80",
    ],
    "kitchen": [
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=600&q=80",
    ],
    "tv": [
        "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1601944177325-f8867652837f?auto=format&fit=crop&w=600&q=80",
    ],
}

FEATURES = {
    "fridge": ["سیستم نوفراست", "موتور اینورتر کم‌مصرف", "نمایشگر دیجیتال دما", "یخ‌ساز خودکار", "آبسردکن داخلی", "درجه انرژی A++"],
    "washer": ["ظرفیت بالا", "موتور دایرکت درایو", "برنامه ضد حساسیت", "بخارشوی هوشمند", "قفل کودک", "کم‌مصرف کلاس A"],
    "ac": ["سرمایش و گرمایش", "تکنولوژی اینورتر", "فیلتر آنتی‌باکتریال", "حالت توربو", "کنترل از راه دور", "کم‌صدا"],
    "vacuum": ["مکش قدرتمند", "فیلتر هپا", "بدون کیسه", "باتری قابل شارژ", "سری چندکاره", "سبک و کم‌وزن"],
    "kitchen": ["بدنه ضدزنگ", "صفحه لمسی", "ایمنی حرارتی", "طراحی مدرن", "مصرف بهینه انرژی", "گارانتی معتبر"],
    "tv": ["کیفیت 4K Ultra HD", "سیستم‌عامل هوشمند", "پنل QLED", "صدای دالبی", "اتصال وای‌فای", "حالت بازی"],
}

SPEC_LABELS = {
    "fridge": [["حجم", "۶۳۰ لیتر"], ["نوع", "ساید بای ساید"], ["رنگ", "نقره‌ای"], ["گارانتی", "۲۴ ماه"]],
    "washer": [["ظرفیت", "۹ کیلوگرم"], ["دور موتور", "۱۴۰۰ دور"], ["رنگ", "سفید"], ["گارانتی", "۱۸ ماه"]],
    "ac": [["ظرفیت", "۲۴۰۰۰ BTU"], ["نوع", "اینورتر"], ["رنگ", "سفید"], ["گارانتی", "۳۶ ماه"]],
    "vacuum": [["توان", "۲۲۰۰ وات"], ["نوع", "بدون کیسه"], ["رنگ", "قرمز"], ["گارانتی", "۱۲ ماه"]],
    "kitchen": [["نوع", "گاز رومیزی"], ["تعداد شعله", "۵ شعله"], ["رنگ", "مشکی"], ["گارانتی", "۱۸ ماه"]],
    "tv": [["اندازه", "۵۵ اینچ"], ["رزولوشن", "4K UHD"], ["نوع پنل", "QLED"], ["گارانتی", "۲۴ ماه"]],
}

NAMES = {
    "fridge": ["یخچال فریزر ساید بای ساید", "یخچال فریزر دوقلو", "یخچال کمبی نوفراست", "فریزر عمودی", "یخچال فریزر دوو سری", "یخچال ساید استیل"],
    "washer": ["ماشین لباسشویی درب از جلو", "لباسشویی اتوماتیک", "ماشین لباسشویی دایرکت درایو", "لباسشویی بخارشور", "ماشین لباسشویی سیلوری", "لباسشویی کم‌مصرف"],
    "ac": ["کولر گازی اینورتر", "اسپلیت سرد و گرم", "کولر گازی دیواری", "اسپلیت اینورتر سری", "کولر گازی کم‌مصرف", "اسپلیت پرتابل"],
    "vacuum": ["جاروبرقی بدون کیسه", "جارو شارژی عمودی", "جاروبرقی سطلی", "جارو رباتیک هوشمند", "جاروبرقی سیکلونی", "جارو دستی شارژی"],
    "kitchen": ["اجاق گاز رومیزی", "مایکروویو دیجیتال", "هود آشپزخانه شومینه‌ای", "ماشین ظرفشویی", "سرخ‌کن بدون روغن", "مخلوط‌کن حرفه‌ای"],
    "tv": ["تلویزیون هوشمند QLED", "تلویزیون 4K Ultra HD", "تلویزیون LED Full HD", "تلویزیون OLED هوشمند", "تلویزیون اندرویدی", "تلویزیون نئو کیولد"],
}

BASE_PRICE = {
    "fridge": 45000000, "washer": 28000000, "ac": 32000000,
    "vacuum": 9000000, "kitchen": 14000000, "tv": 38000000,
}

DISCOUNTS = [0, 0, 8, 12, 15, 18, 22, 30]


def build_products():
    out = []
    pid = 1
    for cat in NAMES.keys():
        for i in range(4):
            brand = BRANDS[(pid * 3) % len(BRANDS)]
            base_name = NAMES[cat][i % len(NAMES[cat])]
            model = chr(65 + (pid % 26)) + str(1000 + pid * 7)
            base_price = BASE_PRICE[cat] + ((pid * 13) % 9) * 3500000
            discount = DISCOUNTS[pid % 8]
            if discount:
                old_price = round(base_price / (1 - discount / 100) / 100000) * 100000
            else:
                old_price = None
            rating = round(3.8 + ((pid * 7) % 12) / 10, 1)
            reviews = 18 + (pid * 17) % 480
            pool = IMG[cat]
            gallery = [pool[i % 3], pool[(i + 1) % 3], pool[(i + 2) % 3]]
            specs = [["برند", brand], ["مدل", model]] + [list(s) for s in SPEC_LABELS[cat]]
            out.append({
                "id": pid,
                "name": f"{base_name} {brand} مدل {model}",
                "cat": cat,
                "brand": brand,
                "model": model,
                "price": base_price,
                "old_price": old_price,
                "discount": discount,
                "rating": rating,
                "reviews": reviews,
                "images": gallery,
                "features": FEATURES[cat],
                "specs": specs,
            })
            pid += 1
    return out


def build_description(p):
    feats = "".join(f"<li>{f}</li>" for f in p["features"])
    rows = "".join(
        f"<tr><th style='text-align:right;padding:6px 10px'>{k}</th>"
        f"<td style='padding:6px 10px'>{v}</td></tr>"
        for k, v in p["specs"]
    )
    cat_fa = CAT_FA[p["cat"]]
    return (
        f"<p>{p['name']} از سری محصولات با کیفیت برند {p['brand']} در دسته‌بندی "
        f"{cat_fa} است. این محصول با گارانتی اصل و خدمات پس از فروش معتبر عرضه می‌شود "
        f"و انتخابی مطمئن برای خانه‌ی شماست.</p>"
        f"<h3>ویژگی‌های کلیدی</h3><ul>{feats}</ul>"
        f"<h3>مشخصات فنی</h3>"
        f"<table style='border-collapse:collapse;width:100%'><tbody>{rows}</tbody></table>"
    )


def main():
    products = build_products()
    headers = [
        "ID", "Type", "SKU", "Name", "Published", "Is featured?",
        "Visibility in catalog", "Short description", "Description",
        "Tax status", "In stock?", "Stock", "Regular price", "Sale price",
        "Categories", "Tags", "Images",
        "Attribute 1 name", "Attribute 1 value(s)", "Attribute 1 visible", "Attribute 1 global",
        "Attribute 2 name", "Attribute 2 value(s)", "Attribute 2 visible", "Attribute 2 global",
    ]

    rows = []
    for p in products:
        if p["old_price"]:
            regular = p["old_price"]
            sale = p["price"]
        else:
            regular = p["price"]
            sale = ""
        featured = 1 if p["discount"] >= 18 else 0
        short_desc = "، ".join(p["features"][:4])
        rows.append({
            "ID": "",
            "Type": "simple",
            "SKU": f"MK-{p['model']}",
            "Name": p["name"],
            "Published": 1,
            "Is featured?": featured,
            "Visibility in catalog": "visible",
            "Short description": short_desc,
            "Description": build_description(p),
            "Tax status": "taxable",
            "In stock?": 1,
            "Stock": 25,
            "Regular price": regular,
            "Sale price": sale,
            "Categories": CAT_FA[p["cat"]],
            "Tags": f"{p['brand']}, {CAT_FA[p['cat']]}",
            "Images": ", ".join(p["images"]),
            "Attribute 1 name": "برند",
            "Attribute 1 value(s)": p["brand"],
            "Attribute 1 visible": 1,
            "Attribute 1 global": 1,
            "Attribute 2 name": "گارانتی",
            "Attribute 2 value(s)": dict(p["specs"]).get("گارانتی", ""),
            "Attribute 2 visible": 1,
            "Attribute 2 global": 1,
        })

    out_path = "/home/user/new-projekt/woocommerce-products.csv"
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} products to {out_path}")


if __name__ == "__main__":
    main()
