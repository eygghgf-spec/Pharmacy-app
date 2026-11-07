# بناء APK عبر EAS

من جهاز يملك نسخة المشروع، وليس من خدمة Metro/API داخل Sandbox:

```bash
npm install --global eas-cli
cd /path/to/smartchat
eas login
eas build --platform android --profile preview
```

ملف `eas.json` يعرّف `preview` كتوزيع داخلي ويطلب صيغة APK. إذا طلب EAS ربط المشروع بحساب Expo، اختر إنشاء مشروع جديد أو ربط المشروع الموجود. إذا طلب إنشاء Android Keystore، وافق على الإنشاء المُدار.

بعد انتهاء البناء، افتح رابط صفحة البناء الذي يطبعه EAS أو صفحة Builds في Expo Dashboard، ثم استخدم Install/Download لتنزيل APK إلى Android. لا تستخدم `production` أو AAB إذا كان الهدف تثبيتًا مباشرًا على الهاتف.

المراجع الرسمية:

- https://docs.expo.dev/tutorial/eas/internal-distribution-builds/
- https://docs.expo.dev/build/eas-json/
- https://docs.expo.dev/eas/cli/
