# تقرير PassengerApp GitLab CI/CD

## النطاق

تمت مراجعة وتعديل مجلد PassengerApp فقط. لم يتم تعديل أي مشروع آخر ولم يتم إنشاء تطبيق جديد أو إعادة هيكلة التطبيق.

## المنجز

- إنشاء `.gitlab-ci.yml` مستقل من جذر PassengerApp.
- إزالة جميع اعتمادات CI على مسارات أو أدوات خارج المستودع.
- المراحل: Install، Validate، Expo Doctor، TypeScript، Lint، Expo Prebuild، Android Preview APK، Android Production AAB.
- التشغيل التلقائي على `main`، بالإضافة إلى Merge Requests للتحقق قبل الدمج.
- تثبيت Node 20.15.1 وnpm 10.8.2 في CI وملفات runtime.
- Cache موحد لـnpm وExpo وEAS مبني على `package-lock.json`.
- رفع logs دائمًا، ورفع APK/AAB التي يتم تنزيلها من نتائج EAS.
- أدوات التحقق وتنزيل EAS أصبحت داخل `scripts/ci` في المستودع نفسه.
- إضافة Quality Gate خاص بتطبيق الراكب فقط.
- مراجعة scripts المطلوبة في `package.json` وإضافة `quality:gate` وتحديث `ci:validate`.
- توثيق جميع متغيرات GitLab Protected/Masked في README.
- تثبيت مصفوفة Expo SDK 52 وReact Native 0.76.9 وReact 18.3.1 وFirebase 21.12.3 وexpo-three 8.0.0 وthree 0.166.1.
- التحقق من عدم تعريف Auth وMessaging وPerformance كـExpo plugins غير صالحة، مع إبقاء native autolinking.

## نتائج التحقق الساكن

نجح تحليل YAML وJSON، وفحص JavaScript syntax، وحقن إعدادات Maps/EAS عبر `app.config.js`، وفحص عدم وجود مراجع CI خارجية، وفحوصات عدم تضمين صور المركبات أو بيانات تشغيل تجريبية أو أسرار داخل source.

## العائق المتبقي

تعذر إنشاء `package-lock.json` لأن بيئة التنفيذ لا تصل إلى npm Registry:

```text
ENOTFOUND registry.npmjs.org
```

لذلك لم يتم إثبات نجاح `npm install` و`npm ci` وExpo Doctor وTypeScript وLint وPrebuild أو EAS APK/AAB. لا يجوز إنشاء lockfile يدوي أو جزئي.

## القرار

**المشروع غير معتمد Build Ready/CI Ready بنسبة 100% بعد.** مصدر CI أصبح خاصًا بـPassengerApp فقط، لكن الاعتماد النهائي ينتظر lockfile رسميًا وPipeline أخضر ينتج APK وAAB فعليين.

## تحديث: الجلسة الثانية

بيئة هذه الجلسة تصل فعليًا لـnpm Registry، فتم إنشاء `package-lock.json` حقيقي عبر `npm install` فعلي (وليس يدويًا)، والتحقق من ثباته عبر `npm ci` متكرر.

تم اكتشاف وإصلاح أخطاء حقيقية أثناء التحقق المحلي: استخدام API غير موجود في `react-native-mmkv` v3 (`createMMKV`, `.remove()`) في 3 ملفات، مسار `expo-file-system/legacy` غير موجود في v18، باغ self-reference حقيقي في `TripCommunicationScreen.tsx` (متغير يُستخدم قبل تعريفه داخل نفس `useQuery`)، قيمة `fontWeight: "650"` غير صالحة في React Native، ثغرة typing في `react-native-maps` (تم التحقق من الكود المصدري للمكتبة مباشرة)، ونطاق `platforms` غير محدد في `app.json` كان يسبب فشل `expo export`، وتحذير `expo-doctor` حول عدم استخدام `app.config.js` لقيم `app.json` (تم إصلاحه جذريًا باستخدام الكائن الممرَّر من Expo بدل `require` منفصل).

تم تشغيل Pipeline فعلي في GitLab من طرف المستخدم وفشل على مرحلة `install_dependencies` بخطأ `EBADENGINE`: `eslint-visitor-keys@5.0.1` (تبعية غير مباشرة عبر `@typescript-eslint/visitor-keys`) يتطلب `node: "^20.19.0 || ^22.13.0 || >=24"`، وNode 20.15.1 المثبّت لا يحقق هذا الشرط. هذا لم يظهر محليًا لأن بيئة الجلسة تعمل بـNode 22.22.2 (يحقق `^22.13.0` بالصدفة).

**الإصلاح:** تحديث Node المثبّت إلى `20.19.6` في `.nvmrc`، `.node-version`، وصورة Docker في `.gitlab-ci.yml` (يبقى ضمن Node 20 كما طُلب صراحة). تم التحقق برمجيًا أن هذا الإصدار يحقق شرط `engines.node` لكل حزمة في `package-lock.json` بدون استثناء.

**ملاحظة مهمة يجب معرفتها:** Node.js 20 وصل لنهاية الدعم الرسمي (EOL) بتاريخ 30 أبريل 2026 ولم يعد يستلم تحديثات أمنية. طُلب صراحة استخدام Node 20 فتم الالتزام بذلك باستخدام آخر إصدار متاح ضمن نفس الخط، لكن الانتقال لاحقًا إلى Node 22 (Maintenance LTS حتى أبريل 2027) قرار يستحق التفكير فيه لتطبيق إنتاجي يتعامل مع مدفوعات وبيانات شخصية.

لا يمكن لهذه الجلسة الوصول لـgitlab.com أو تنفيذ push حقيقي (شبكة معزولة على npm/pypi/github فقط)، لذلك **الاعتماد النهائي على Pipeline أخضر فعلي وAPK/AAB منتج فعليًا ما زال بانتظار push من طرف المستخدم بعد هذا الإصلاح.**
