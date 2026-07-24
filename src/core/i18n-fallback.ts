// Bundled fallback translations.
//
// ROOT CAUSE THIS FIXES: `tr()` used to return "" for any missing key, and the
// translation bundle is fetched from the remote backend at runtime. On a cold
// start (or when the Render backend is slow/unavailable) `messages` is `{}`,
// so EVERY label/title/button rendered an empty string -> the UI looked like
// "most text is invisible". These bundled strings guarantee the app is always
// legible even with zero network, and remote translations are merged on top
// when they arrive.
//
// Default app locale is Arabic (see ProfileScreen / useMessages defaults).

export const FALLBACK_MESSAGES: Record<string, string> = {
  // common
  "common.back": "رجوع",
  "common.cancel": "إلغاء",
  "common.continue": "متابعة",
  "common.delete": "حذف",
  "common.disabled": "معطّل",
  "common.enabled": "مفعّل",
  "common.error": "حدث خطأ، يرجى المحاولة مرة أخرى",
  "common.retry": "إعادة المحاولة",
  "common.save": "حفظ",
  "common.unavailable": "غير متاح",

  // auth
  "auth.continuePhone": "المتابعة عبر رقم الهاتف",
  "auth.continueEmail": "المتابعة عبر البريد الإلكتروني",
  "auth.phone": "رقم الهاتف",
  "auth.otp": "رمز التحقق",
  "auth.verifyOtp": "تأكيد الرمز",
  "auth.email": "البريد الإلكتروني",
  "auth.sendEmailLink": "إرسال رابط الدخول",
  "auth.emailLinkSent": "تم إرسال رابط الدخول إلى بريدك الإلكتروني",
  "auth.resendEmailLink": "إعادة إرسال الرابط",

  // home
  "home.pickup": "نقطة الانطلاق",
  "home.destination": "الوجهة",
  "home.destinationHint": "إلى أين تريد الذهاب؟",
  "home.chooseDestination": "اختر الوجهة",
  "home.currentLocation": "موقعك الحالي",
  "home.chooseRide": "اختر رحلتك",
  "home.requestRide": "اطلب الرحلة",
  "home.negotiate": "تفاوض على السعر",
  "home.price": "السعر",
  "home.eta": "دقيقة",
  "home.capacity": "مقاعد",
  "home.noVehicles": "لا تتوفر مركبات حالياً",
  "home.locationRequired": "نحتاج إلى موقعك لعرض الرحلات المتاحة",
  "home.searching": "جارٍ البحث عن سائق",
  "home.searchingHint": "نبحث عن أقرب سائق إليك",
  "home.driverArriving": "السائق في الطريق إليك",
  "home.tripInProgress": "الرحلة جارية",
  "home.tripCompleted": "اكتملت الرحلة",
  "home.cancelRide": "إلغاء الرحلة",
  "home.close": "إغلاق",
  "home.from": "من",
  "home.to": "إلى",
  "home.vehicle": "المركبة",
  "home.plate": "رقم اللوحة",
  "home.payment": "طريقة الدفع",
  "home.rating": "التقييم",
  "home.driver": "السائق",
  "home.negotiationTitle": "تفاوض على الأجرة",
  "home.negotiationHint": "اقترح السعر الذي يناسبك",
  "home.sendOffer": "إرسال العرض",
  "home.driverOffers": "عروض السائقين",
  "home.acceptOffer": "قبول العرض",
  "home.noOffers": "لا توجد عروض بعد",

  // menu
  "menu.title": "القائمة",
  "menu.logout": "تسجيل الخروج",

  // profile
  "profile.completeTitle": "أكمل ملفك الشخصي",
  "profile.title": "الملف الشخصي",
  "profile.name": "الاسم",
  "profile.phone": "الهاتف",
  "profile.email": "البريد الإلكتروني",
  "profile.choosePhoto": "اختر صورة",
  "profile.photoSelected": "تم اختيار الصورة",

  // trips
  "trips.title": "رحلاتي",
  "trips.empty": "لا توجد رحلات بعد",
  "trips.details": "تفاصيل الرحلة",
  "trips.date": "التاريخ",
  "trips.driver": "السائق",
  "trips.destinationUnavailable": "وجهة غير متاحة",
  "trip.actions": "إجراءات الرحلة",

  // places
  "places.title": "الأماكن المحفوظة",
  "places.add": "إضافة مكان",
  "places.label": "الاسم",
  "places.address": "العنوان",
  "places.empty": "لا توجد أماكن محفوظة",
  "places.recents": "الأماكن الأخيرة",
  "places.kind.HOME": "المنزل",
  "places.kind.WORK": "العمل",
  "places.kind.OTHER": "أخرى",
  "places.kind.RECENT": "الأخيرة",

  // wallet
  "wallet.title": "المحفظة",
  "wallet.available": "الرصيد المتاح",
  "wallet.locked": "رصيد محجوز",
  "wallet.transactions": "المعاملات",
  "wallet.empty": "لا توجد معاملات",

  // coupons
  "coupons.title": "القسائم",
  "coupons.code": "رمز القسيمة",
  "coupons.fare": "قيمة الرحلة",
  "coupons.validate": "تحقّق",
  "coupons.discount": "الخصم",
  "coupons.finalFare": "السعر النهائي",
  "coupons.invalid": "قسيمة غير صالحة",

  // referrals
  "referrals.title": "الإحالات",
  "referrals.myCode": "رمز الإحالة الخاص بك",
  "referrals.share": "مشاركة",
  "referrals.enterCode": "أدخل رمز الإحالة",
  "referrals.apply": "تطبيق",
  "referrals.history": "سجل الإحالات",

  // subscriptions
  "subscriptions.title": "الاشتراكات",
  "subscriptions.status": "الحالة",
  "subscriptions.renewal": "التجديد التلقائي",
  "subscriptions.cancelRenewal": "إلغاء التجديد",
  "subscriptions.price": "السعر",
  "subscriptions.subscribe": "اشترك",

  // notifications
  "notifications.title": "الإشعارات",
  "notifications.empty": "لا توجد إشعارات",
  "notifications.readAll": "تعليم الكل كمقروء",
  "notifications.deleteAll": "حذف الكل",
  "notifications.markRead": "تعليم كمقروء",
  "notifications.markUnread": "تعليم كغير مقروء",
  "notifications.unread": "غير مقروء",

  // support
  "support.title": "الدعم",
  "support.myTickets": "تذاكري",
  "support.subject": "الموضوع",
  "support.message": "الرسالة",
  "support.send": "إرسال",
  "support.empty": "لا توجد تذاكر",
  "support.details": "تفاصيل التذكرة",
  "support.reply": "رد",

  // legal
  "legal.title": "المستندات القانونية",
  "legal.version": "الإصدار",
  "legal.accept": "موافقة",
  "legal.accepted": "تمت الموافقة",

  // about / contact
  "about.title": "عن التطبيق",
  "contact.title": "تواصل معنا",
  "contact.phone": "الهاتف",
  "contact.email": "البريد الإلكتروني",
  "contact.website": "الموقع الإلكتروني",

  // settings
  "settings.title": "الإعدادات",
  "settings.language": "اللغة",

  // account deletion
  "accountDeletion.title": "حذف الحساب",
  "accountDeletion.warning": "سيؤدي هذا إلى حذف حسابك نهائياً",
  "accountDeletion.reason": "السبب (اختياري)",
  "accountDeletion.confirmation": "نص التأكيد",
  "accountDeletion.submit": "طلب الحذف",
  "accountDeletion.pending": "طلب الحذف قيد المعالجة",
  "accountDeletion.scheduledFor": "مجدول في",
  "accountDeletion.cancel": "إلغاء الطلب",

  // communication
  "communication.title": "التواصل",
  "communication.participant": "الطرف الآخر",
  "communication.active": "نشط",
  "communication.inactive": "غير نشط",
  "communication.call": "اتصال",
  "communication.message": "الرسالة",
  "communication.send": "إرسال",
  "communication.empty": "لا توجد رسائل",
  "communication.closed": "المحادثة مغلقة",

  // payment
  "payment.title": "الدفع",
  "payment.current": "الدفعة الحالية",
  "payment.method": "الطريقة",
  "payment.methods": "طرق الدفع",
  "payment.status": "الحالة",
  "payment.amount": "المبلغ",
  "payment.useMethod": "استخدم هذه الطريقة",
  "payment.none": "لا توجد طرق دفع",
  "payment.method.CASH": "نقداً",
  "payment.method.WALLET": "المحفظة",
  "payment.method.CARD": "بطاقة",

  // rating
  "rating.title": "قيّم رحلتك",
  "rating.stars": "النجوم",
  "rating.comment": "تعليق",
  "rating.submit": "إرسال التقييم",
  "rating.success": "شكراً لتقييمك",

  // report
  "report.title": "الإبلاغ عن مشكلة",
  "report.message": "الرسالة",
  "report.submit": "إرسال البلاغ",
  "report.success": "تم استلام بلاغك",

  // trip share
  "tripShare.title": "تفاصيل الرحلة",
  "tripShare.button": "مشاركة الرحلة",
  "tripShare.reference": "المرجع",

  // enums used via dynamic keys
  "gender.MALE": "ذكر",
  "gender.FEMALE": "أنثى",
  "gender.OTHER": "آخر",
  "gender.PREFER_NOT_TO_SAY": "أفضّل عدم الإفصاح",
  "locale.ar": "العربية",
  "locale.fr": "الفرنسية",
  "locale.en": "الإنجليزية",
  "language.ar": "العربية",
  "language.fr": "الفرنسية",
  "language.en": "الإنجليزية",
  "vehicle.category.economy": "اقتصادي",
  "vehicle.category.comfort": "مريح",
  "vehicle.category.family": "عائلي",
  "vehicle.category.bike": "دراجة",
};

// Last-resort humaniser so an unknown key (e.g. a backend enum we do not have a
// bundled string for) still renders something legible instead of an empty
// string. "trip.status.IN_PROGRESS" -> "In Progress", "home.newThing" -> "New Thing".
export function humanizeKey(key: string): string {
  const last = key.split(".").pop() ?? key;
  if (/^[A-Z0-9_]+$/.test(last)) {
    return last
      .split("_")
      .filter(Boolean)
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
