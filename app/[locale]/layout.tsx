import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import MockBootstrap from "@/components/MockBootstrap";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 为每个语言开启静态渲染所需的请求语言设置
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 确保语言合法，否则返回 404
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // 静态渲染所需（next-intl 要求）
  setRequestLocale(locale);

  // 加载当前语言的翻译消息
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <MockBootstrap>{children}</MockBootstrap>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
