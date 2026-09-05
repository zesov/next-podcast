// MSW request handlers —— 拦截客户端 fetch(`/api/...`) 请求并返回 mock 数据
// 仅作用于浏览器端（setupWorker），服务端 podcastdx-client 的直接调用不受影响
import { http, HttpResponse, delay } from 'msw';
import { podcastById, episodesByFeedId } from './data';

export const handlers = [
  // GET /api/podcastById?id=N  ->  { feed, episodes }
  http.get('/api/podcastById', async ({ request }) => {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    await delay(150); // 模拟网络延迟
    return HttpResponse.json(podcastById(id));
  }),

  // GET /api/episodesByFeedId?id=N  ->  Episode[]
  http.get('/api/episodesByFeedId', async ({ request }) => {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    await delay(150);
    return HttpResponse.json(episodesByFeedId(id));
  }),
];
