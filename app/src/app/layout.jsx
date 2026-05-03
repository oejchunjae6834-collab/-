import './globals.css';
import Nav from '@/components/Nav.jsx';
import Footer from '@/components/Footer.jsx';

export const metadata = {
  title: '디적디적 — AI 시대를 부모와 아이가 함께 공부하는 교육공동체',
  description: '월 1회 마하어린이도서관에서 모이고, 여름·겨울에는 캠프를 떠나는 가족 단위 학습 공동체. 어른이 먼저 배우는 모임.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
