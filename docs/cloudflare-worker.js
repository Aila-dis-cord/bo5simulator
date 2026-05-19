/**
 * Cloudflare Worker: strix.pm/simulator/* → bo5simulator.vercel.app/simulator/*
 *
 * Cloudflare Workers & Pages → Worker のコードエディタに貼り付けてください。
 * その後、Routes に strix.pm/simulator* を設定します。
 */

const VERCEL_BASE = 'https://bo5simulator.vercel.app';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // /simulator で始まるパスのみ処理
    if (!url.pathname.startsWith('/simulator')) {
      return new Response('Not Found', { status: 404 });
    }

    // Vercel URL に転送（パスから /simulator を取り除いて Vercel から取得）
    const cleanPath = url.pathname.slice('/simulator'.length) || '/';
    const targetUrl = VERCEL_BASE + cleanPath + url.search;

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: (() => {
        const h = new Headers(request.headers);
        // ホストヘッダーをVercelに合わせる
        h.set('host', 'bo5simulator.vercel.app');
        return h;
      })(),
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
    });

    const response = await fetch(newRequest);

    // レスポンスをそのまま返す（ヘッダーも含む）
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
