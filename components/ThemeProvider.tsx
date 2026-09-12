'use client';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// 主题提供器：class 策略切换 <html class="dark">，默认跟随系统，选择持久化到 localStorage
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}