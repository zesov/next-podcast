// MSW Browser（Service Worker）客户端入口
// 由 MswBootstrap 在应用渲染前调用 start()，拦截 /api/* mock
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
