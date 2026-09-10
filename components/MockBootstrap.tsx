'use client';
// 模块顶层 import 触发 MSW 启动（NEXT_PUBLIC_MSW_ENABLE=true 时）。
// 由于 client bundle 按 import 顺序求值，此副作用会在页面组件挂载/useEffect 之前执行，
// 从而保证 /api/* 的浏览器 fetch 能被 Service Worker 拦截到。
import '@/mocks/init-client';

export default function MockBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  // child 由服务端/客户端同步渲染，本组件不 gating，避免 hydration mismatch
  return <>{children}</>;
}
