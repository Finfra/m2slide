---
title: 내장 컴포넌트
type: ppt
---

# 05. 내장 컴포넌트

#layout-chapter

::: part
Chapter 5.
:::

## chart · d3 · React · p5 · model3d · cards · htmlArt

---

## 컴포넌트 카탈로그 — 한눈에

::: cards
* **수식 / 심벌**
  - KaTeX · Font Awesome
* **차트 / 지도**
  - chart.js · Leaflet
* **인포그래픽**
  - d3.js · mermaid
* **인터랙티브**
  - React · p5.js · model-viewer
:::

* 추가 설치 0 — CDN 조건부 자동 주입, `file://` 단독 동작 보장
* 아래 슬라이드의 예시는 전부 **이 deck 안에서 실제 렌더**됨 (기능 자체가 예시)

---

## chart.js — 데이터 시각화

```chart
{
  "type": "bar",
  "data": {
    "labels": ["Single", "Chapter", "EPUB"],
    "datasets": [{ "label": "사용 빈도", "data": [12, 19, 7] }]
  }
}
```

* `chart` 블록 본문 = Chart.js config JSON → 빌드 시 `<canvas>` 렌더

---

## d3 — 커스텀 인포그래픽

```d3
const svg = d3.select(el).append('svg').attr('width', 400).attr('height', 200);
svg.selectAll('rect').data([40, 80, 120]).enter().append('rect')
  .attr('x', (d, i) => i * 90).attr('y', d => 200 - d)
  .attr('width', 70).attr('height', d => d).attr('fill', '#4ec9b0');
```

* `el` = 컨테이너 div. d3 API로 SVG를 자유롭게 그림

---

## React — 인터랙티브 컴포넌트

```react
function Counter() {
  const [n, setN] = React.useState(0);
  return <button onClick={() => setN(n + 1)}>클릭 {n}회</button>;
}
render(<Counter />);
```

* JSX는 브라우저에서 Babel로 변환 — 빌드 의존성 0

---

## p5.js — 캔버스 애니메이션

```p5
p.setup = function() { p.createCanvas(el.clientWidth, el.clientHeight); };
p.draw = function() {
  p.background('#1a1a2e');
  p.fill('#4ec9b0');
  p.ellipse(p.frameCount % p.width, p.height / 2, 40, 40);
};
```

* p5 instance mode — 모든 API는 `p.` prefix로 호출

---

## model3d — 3D 모델 뷰어

```model3d
{
  "src": "./img/model.glb",
  "alt": "3D 모델 예시",
  "autoRotate": true
}
```

* `src`에 GLB/GLTF 경로. 마우스·터치로 회전·확대 (camera-controls 기본)
* GLB 파일은 `img/`에 배치 후 상대 경로로 참조

---

## cards & htmlArt — 구조 도해

::: cards
* **cards**
  - 균질 항목 N개를 박스 그리드로
* **htmlArt**
  - 프로세스·계층 등 도해
:::

```htmlart process
* 입력
* 처리
* 출력
```

* 두 컴포넌트 모두 라이브러리 없이 CSS만으로 렌더됨

---

## 수식 · 심벌 · mermaid

* 블록 수식: $$E = mc^2$$
* 인라인 수식: \(a^2 + b^2 = c^2\)
* 심벌: :fa-rocket: 시작  :fa-check-circle: 완료

```mermaid
graph LR
  A[마크다운] --> B[컴포넌트] --> C[렌더]
```

* 단일 `$`는 통화·셸 변수와 충돌하므로 `$$`·`\(...\)`만 사용
