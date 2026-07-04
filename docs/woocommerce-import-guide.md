# راهنمای درون‌ریزی محصولات ووکامرس — فروشگاه منوجان کالا

این راهنما نحوه درون‌ریزی (Import) فایل `woocommerce-products.csv` شامل **۲۰ محصول لوازم خانگی سئوشده** به‌همراه تصاویر اختصاصی را توضیح می‌دهد.

## محتویات پکیج

| فایل | توضیح |
|---|---|
| `woocommerce-products.csv` | فایل درون‌ریزی ۲۰ محصول با توضیحات کامل HTML و فیلدهای سئو |
| `wordpress/product-images/*.jpg` | ۲۰ تصویر ۱۰۰۰×۱۰۰۰ پیکسل: **عکس واقعی محصول** داخل قاب برنددار منوجان کالا، با نام فایل سئوشده |

## ویژگی‌های سئوی محصولات

- **عنوان سئوشده** شامل کلمه کلیدی اصلی + برند + مدل
- **توضیحات کامل HTML** با ساختار H2/H3، لیست مشخصات فنی و بخش سوالات متداول (مناسب برای اسنیپت گوگل)
- **توضیح کوتاه** شامل کلمه کلیدی و مزیت‌های اصلی
- **متا تایتل و متا دیسکریپشن** برای افزونه **Yoast SEO** (ستون‌های `meta:_yoast_wpseo_*`) و همچنین **Rank Math** (ستون‌های `meta:rank_math_*`) — هر افزونه‌ای که نصب باشد، فیلدهای خودش را می‌خواند
- **کلمه کلیدی کانونی** برای هر محصول
- **دسته‌بندی سلسله‌مراتبی** (لوازم خانگی > لوازم آشپزخانه و…) و برچسب‌ها
- **نام فایل تصاویر لاتین و سئوشده** (مثل `yakhchal-side-by-side-samsung-rs68.jpg`)

## مراحل درون‌ریزی

1. وارد پیشخوان وردپرس شوید: **محصولات ← همه محصولات ← درون‌ریزی (Import)**
2. فایل `woocommerce-products.csv` را انتخاب کنید.
3. گزینه **«محصولات موجود که شناسه یا SKU یکسان دارند به‌روزرسانی شوند»** را در صورت نیاز فعال کنید.
4. در صفحه نگاشت ستون‌ها (Column Mapping)، ووکامرس ستون‌های اصلی را خودکار تشخیص می‌دهد. برای ستون‌های متا (`meta:...`) گزینه **Import as meta data** را انتخاب کنید (معمولاً پیش‌فرض همین است).
5. روی **اجرای درون‌ریز** کلیک کنید.

## تصاویر محصولات

ستون `Images` در CSV فقط **نام فایل** تصویر است (بدون آدرس اینترنتی)، چون بسیاری از هاست‌های داخل ایران به‌دلیل فیلترینگ نمی‌توانند از GitHub یا سرورهای خارجی عکس دانلود کنند. ووکامرس تصویر هم‌نام را از **کتابخانه رسانه خود سایت** برمی‌دارد.

ترتیب صحیح:

1. **اول** همه ۲۰ تصویر پوشه `wordpress/product-images/` را از مسیر **رسانه ← افزودن** در وردپرس بارگذاری کنید.
2. **بعد** فایل CSV را درون‌ریزی کنید — ووکامرس هر تصویر را بر اساس نام فایل به محصولش وصل می‌کند.

> ⚠️ اگر ترتیب برعکس شود (اول CSV)، محصولات بدون تصویر ساخته می‌شوند. در این حالت کافی است تصاویر را آپلود کنید و CSV را دوباره با گزینه «به‌روزرسانی محصولات موجود» درون‌ریزی کنید.

### نکته سئو برای تصاویر

بعد از درون‌ریزی، در کتابخانه رسانه برای هر تصویر **متن جایگزین (Alt Text)** را برابر نام فارسی محصول قرار دهید (درون‌ریز ووکامرس Alt را از CSV نمی‌خواند).

## قیمت‌ها

قیمت‌ها به **تومان** و شامل «قیمت عادی» و در اکثر محصولات «قیمت فروش ویژه» است. قبل از انتشار، قیمت‌ها را با نرخ روز بازار به‌روزرسانی کنید.

## اعتبار و مجوز عکس‌ها (Image Credits)

عکس‌های واقعی محصولات از منابع دارای مجوز آزاد (Wikimedia Commons، Flickr از طریق Openverse) برداشته شده و داخل قاب گرافیکی فروشگاه قرار گرفته‌اند. مجوزهای CC BY و CC BY-SA **الزام ذکر منبع** دارند — این جدول را نگه دارید (مثلاً در صفحه «درباره ما» یا همین مخزن). عکس‌های Public Domain نیاز به ذکر منبع ندارند.

> 💡 پیشنهاد: این عکس‌ها برای شروع کار مناسب‌اند، اما در بلندمدت بهترین نتیجه سئو و اعتماد مشتری با **عکس‌های رسمی تأمین‌کننده یا عکاسی اختصاصی** به‌دست می‌آید.

| SKU | محصول | عکس / عکاس | مجوز | منبع |
|---|---|---|---|---|
| MK-1000 | یخچال فریزر ساید بای ساید سامسونگ مدل RS68 | Goedeker's | CC BY 2.0 | [پیوند](https://commons.wikimedia.org/wiki/File:Samsung_Refrigerator_RF24FSEDBSR.jpg) |
| MK-1001 | ماشین لباسشویی ال جی ۹ کیلویی سری F4 | Fanti Salms | CC BY-SA 3.0 | [پیوند](https://commons.wikimedia.org/wiki/File:Front_Load_Washing_Machine.jpg) |
| MK-1002 | ماشین ظرفشویی بوش سری ۶ مدل ۱۴ نفره | Wikimedia Commons | Copyrighted free use | [پیوند](https://upload.wikimedia.org/wikipedia/commons/8/82/Dishwasher_open_for_loading.jpg) |
| MK-1003 | مایکروویو پاناسونیک ۳۲ لیتری اینورتر با گریل | NeoMeesje | CC BY-SA 4.0 | [پیوند](https://commons.wikimedia.org/wiki/File:Microwave_Kitchen.jpg) |
| MK-1004 | سرخ کن بدون روغن فیلیپس مدل Airfryer XXL | sarahstierch | CC BY | [پیوند](https://www.flickr.com/photos/7633518@N08/53004812098) |
| MK-1005 | غذاساز و همزن حرفه‌ای کنوود سری Chef | Nicola since 1972 | CC BY | [پیوند](https://www.flickr.com/photos/15216811@N06/9531154529) |
| MK-1006 | اسپرسوساز دلونگی مدل Dedica EC685 | Feťour | Public domain | [پیوند](https://commons.wikimedia.org/wiki/File:Automatic_espresso_machine_02.JPG) |
| MK-1007 | کولر گازی اینورتر گری ۱۸۰۰۰ سرد و گرم | Tony Webster | CC BY | [پیوند](https://commons.wikimedia.org/w/index.php?curid=181382673) |
| MK-1008 | دستگاه تصفیه هوا شیائومی مدل Air Purifier 4 Pro | GEEK KAZU | CC BY 2.0 | [پیوند](https://commons.wikimedia.org/wiki/File:Xiaomi_Smart_Air_Purifier_2S.jpg) |
| MK-1009 | جارو رباتیک آی روبات مدل Roomba i7 | Peter Kaminski | CC BY | [پیوند](https://www.flickr.com/photos/35034359460@N01/1486730) |
| MK-1010 | جاروبرقی بدون کیسه بوش سری ۴ توان ۲۲۰۰ وات | twicepix | CC BY-SA | [پیوند](https://www.flickr.com/photos/30713600@N00/2186872393) |
| MK-1011 | سشوار حرفه‌ای فیلیپس مدل BHD340 | Batholith (talk) | Public domain | [پیوند](https://commons.wikimedia.org/wiki/File:Hairdryer_20101109.jpg) |
| MK-1012 | ریش تراش براون سری ۹ پرو | photosteve101 | CC BY | [پیوند](https://www.flickr.com/photos/42931449@N07/5506706668) |
| MK-1013 | تلویزیون هوشمند سامسونگ ۵۵ اینچ Crystal UHD | Kskhh | CC BY-SA 4.0 | [پیوند](https://commons.wikimedia.org/wiki/File:Samsung_LED_TV.jpg) |
| MK-1014 | ساندبار ال جی ۳.۱ کانال با ساب ووفر بی‌سیم | Dinkun Chen | CC BY-SA 4.0 | [پیوند](https://commons.wikimedia.org/wiki/File:SAMSUNG_SOUNDBAR_HW-J250.jpg) |
| MK-1015 | چای ساز و کتری برقی فلر مدل TS091 | Rafa | Public domain | [پیوند](https://commons.wikimedia.org/wiki/File:Electric_kettle_phillips_white.JPG) |
| MK-1016 | پلوپز پارس خزر ۸ نفره مدل تیان | alex.shultz | CC BY | [پیوند](https://www.flickr.com/photos/98288842@N00/40716143) |
| MK-1017 | اتو بخار تفال مدل Ultragliss با کف سرامیکی | Santeri Viinamäki | CC BY-SA 4.0 | [پیوند](https://commons.wikimedia.org/wiki/File:Philips_EasyCare_3220_steam_iron.jpg) |
| MK-1018 | بخارشوی کارچر مدل SC3 EasyFix | Cjp24 | CC BY-SA 4.0 | [پیوند](https://commons.wikimedia.org/wiki/File:Polti_steam_mop_or_portable.jpg) |
| MK-1019 | آبمیوه گیری فیلیپس سری Viva با فناوری QuickClean | Fa. eujuicers / Fritzs | CC BY-SA 3.0 | [پیوند](https://commons.wikimedia.org/wiki/File:Hurom_juicer3.jpg) |

## پیشنهادهای تکمیلی سئو

- پیوندهای یکتا (Permalink) را روی ساختار `نام محصول` تنظیم کنید.
- افزونه Yoast SEO یا Rank Math را قبل از درون‌ریزی نصب کنید تا فیلدهای متا اعمال شوند.
- برای هر دسته‌بندی یک توضیح ۱۵۰–۳۰۰ کلمه‌ای بنویسید.
- نقشه سایت XML را در Google Search Console ثبت کنید.
