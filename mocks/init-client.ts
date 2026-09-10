// MSW 客户端启动器
// 通过 NEXT_PUBLIC_MSW_ENABLE=true 开启浏览器端 API mock。
// 在模块顶层调用 enableMocking()，保证在客户端组件 useEffect 发起 /api 请求前注册 Service Worker。
'use client';

export const isMockingEnabled = () =>
  process.env.NEXT_PUBLIC_MSW_ENABLE === 'true' &&
  typeof window !== 'undefined';

export async function enableMocking() {
  if (!isMockingEnabled()) return;
  // 动态 import：避免把 msw 打进生产/服务端 bundle
  const { worker } = await import('@/mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass', // 未被 mock 的请求（如真实 Podcast Index 图片）正常放行
  });
}

// 模块顶层启动（客户端 bundle 初始化阶段执行，早于任何 useEffect）
if (typeof window !== 'undefined') {
  void enableMocking();
}
