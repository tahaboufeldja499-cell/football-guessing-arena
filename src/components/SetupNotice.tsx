import { Logo } from "./ui";

export default function SetupNotice() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-6 flex justify-center"><Logo /></div>
      <div className="glass space-y-3 p-6">
        <h1 className="text-xl font-black text-gold">المشروع يحتاج إعداد Supabase أولًا</h1>
        <p className="text-white/75">لم يتم العثور على إعدادات الاتصال، ولذلك لا يمكن إنشاء الغرف حاليًا. المطلوب:</p>
        <p className="text-sm text-white/70">١) أنشئ مشروعًا في Supabase، وفعّل Anonymous sign-ins من Authentication ← Providers.</p>
        <p className="text-sm text-white/70">٢) شغّل الملفين supabase/schema.sql ثم supabase/seed.sql في SQL Editor.</p>
        <p className="text-sm text-white/70">٣) انسخ ‎.env.example‎ إلى ‎.env.local‎ وضع الرابط والمفتاح العام، ثم أعد تشغيل الخادم.</p>
        <p className="text-xs text-white/45">تفاصيل أكثر في ملف README.md.</p>
      </div>
    </main>
  );
}
