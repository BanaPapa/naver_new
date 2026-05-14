import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/naver-api': {
        target: 'https://fin.land.naver.com/front-api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/naver-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // X-Naver-Cookie 커스텀 헤더 → Cookie 헤더로 변환
            const cookie = req.headers['x-naver-cookie'];
            if (cookie) {
              proxyReq.setHeader('Cookie', Array.isArray(cookie) ? cookie.join('; ') : cookie);
              proxyReq.removeHeader('x-naver-cookie');
            }
            // Naver 필수 헤더 주입
            proxyReq.setHeader('Host', 'fin.land.naver.com');
            proxyReq.setHeader('Origin', 'https://fin.land.naver.com');
            proxyReq.setHeader('Referer', 'https://fin.land.naver.com/map');
            proxyReq.setHeader('Accept-Language', 'ko-KR,ko;q=0.9');
            proxyReq.setHeader('Sec-Fetch-Site', 'same-origin');
            proxyReq.setHeader('Sec-Fetch-Mode', 'cors');
            proxyReq.setHeader('Sec-Fetch-Dest', 'empty');
            proxyReq.setHeader(
              'User-Agent',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
            );
          });
        },
      },
    },
  },
});

