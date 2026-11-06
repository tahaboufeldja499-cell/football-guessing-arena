// BUILD_TARGET=app → تصدير ثابت (مجلد out) يُلفّ داخل تطبيق أندرويد عبر Capacitor.
// بدونه: موقع Next.js عادي (Vercel).
const isApp = process.env.BUILD_TARGET === "app";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isApp ? { output: "export", trailingSlash: true, images: { unoptimized: true } } : {}),
};
export default nextConfig;
