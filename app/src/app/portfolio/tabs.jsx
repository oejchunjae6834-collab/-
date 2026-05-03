'use client';
import { useState } from 'react';

const SECTIONS = {
  adult: {
    label: '🎯 어른 공부 모임',
    items: [
      { h: '딥리서치 활용', p: '특정 주제를 깊이 파보는 AI 도구로 자료 수집·정리 실험.', tag: '2026 진행중' },
      { h: 'Agentic AI 실습', p: '에이전트형 AI가 어디까지 자율적으로 작업을 수행하는지 함께 검증.', tag: '2026 진행중' },
      { h: '다리오 아모데이 「성장통 시기의 기술」', p: 'AI 시대의 기술 발전과 책임에 대한 독서 토론.', tag: '4월' },
      { h: '인공지능 폭발(Intelligence Explosion)', p: '“AI는 진짜 이해하는가?” 성찰적 질문 나눔.', tag: '이재포 이사장' },
    ],
  },
  kids: {
    label: '🎨 아이들 활동',
    items: [
      { h: '구글 아트&컬쳐 앱 기획', p: '체험 후 “내가 만들고 싶은 앱”을 가족별로 발표.', tag: '2월' },
      { h: 'Gemini로 봄 음악 작곡', p: '봄을 주제로 멜로디·가사 만들기. 가족 무대.', tag: '3월' },
      { h: 'Google Vids로 2040년 가족 영상', p: '1분 영상 만들기 — 영상·음악·편집을 한 도구로.', tag: '4월 과제' },
      { h: '모듈러 연산 / 시저 암호', p: '수학과 AI의 만남 — 직접 암호를 만들고 풀어보기.', tag: '수시' },
      { h: '나노 바나나 프로 체험', p: '3D 이미지 생성과 한글 텍스트 정확도 실험.', tag: '11월 온라인' },
    ],
  },
  math: {
    label: '📐 수학이랑 놀자',
    items: [
      { h: '한글 암호 풀이', p: '이산지나 선생님이 만들어 온 암호를 함께 풀었어요.', tag: '4월' },
      { h: '일본 고등 입시 1번', p: '겁먹지 않고 끝까지 — 모두 풀이 성공!', tag: '4월' },
      { h: '곱하기 규칙 찾기', p: '중1 대상 — 패턴을 스스로 발견하기.', tag: '7월' },
      { h: '피보나치 수열', p: '자연 속 수열을 찾아보고 0의 의미 이야기.', tag: '수시' },
    ],
  },
  play: {
    label: '🤝 공동체 놀이',
    items: [
      { h: '지하정원 그림책 읽기', p: '조용히 듣는 시간이 가장 멋진 풍경이 되곤 합니다.', tag: '4월' },
      { h: '디비디비딥', p: '몸으로 하는 가위바위보 — 왕이 되면 절을 받아요.', tag: '상시' },
      { h: '서로 이름 외우기', p: '공을 주고받으며 이름을 부르는 시간.', tag: '신입 환영' },
    ],
  },
};

export default function PortfolioTabs() {
  const [tab, setTab] = useState('adult');
  const items = SECTIONS[tab].items;

  return (
    <>
      <div className="tabs">
        {Object.entries(SECTIONS).map(([k, v]) => (
          <button
            key={k}
            className={`tab ${tab === k ? 'active' : ''}`}
            onClick={() => setTab(k)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="grid-3">
        {items.map((it, i) => (
          <article className="port-item" key={i}>
            <h4>{it.h}</h4>
            <p>{it.p}</p>
            <small className="muted">{it.tag}</small>
          </article>
        ))}
      </div>
    </>
  );
}
