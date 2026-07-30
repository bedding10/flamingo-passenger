# إعداد الإصدار التجاري — flaminGO Passenger

هذه القيم لا تُحفظ في Git. يجب إعدادها في EAS/CI قبل بناء Production.

## 1. مفاتيح الخرائط وإعداد EAS

أضف الأسرار التالية إلى بيئة Production في EAS:

- `GOOGLE_MAPS_ANDROID_API_KEY`
- `GOOGLE_MAPS_IOS_API_KEY`
- `EAS_PROJECT_ID`

ملف `eas.json` لم يعد يحتوي على قيم المفاتيح، ويضبط `FLAMINGO_REQUIRE_NATIVE_CONFIG=1` في Production حتى يفشل البناء بوضوح إذا غاب أي سر.

المفاتيح القديمة ظهرت سابقاً في المستودع وملفات Firebase، لذلك يجب تدويرها في Google Cloud/Firebase ثم تنزيل نسخ جديدة من:

- `google-services.json`
- `GoogleService-Info.plist`

قيّد مفتاح Android باسم الحزمة وبصمة SHA-256، ومفتاح iOS بمعرّف الحزمة.

## 2. توقيع Android

Release لم يعد يستخدم `debug.keystore`. مرّر هذه القيم المحمية في CI:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

عند غيابها يبقى Release غير موقّع بدلاً من إنتاج حزمة تجارية بمفتاح Debug عام.

## 3. معرّف الحزمة

يجب حسم المعرّف النهائي في Firebase ومتجري التطبيقات قبل تغييره في المشروع. الحالة الحالية:

- Android: `com.novaride.passenger`
- iOS: `com.flamingo.passenger`

لا يمكن توحيدهما بأمان داخل الشيفرة فقط لأن ملفات Firebase الحالية مرتبطة بهذين المعرّفين. أنشئ/حدّث تطبيقي Firebase أولاً، ثم استبدل ملفات الإعداد وغيّر المعرّف.

## 4. تحقق محلي مطلوب

بعد استعادة الشبكة وتثبيت الحزم:

```bash
npm install
npm run typecheck
npm run lint
npm run quality:gate
npm run release:validate
```

ثم نفّذ بناء Preview واختبار رحلة كاملة قبل بناء Production.
