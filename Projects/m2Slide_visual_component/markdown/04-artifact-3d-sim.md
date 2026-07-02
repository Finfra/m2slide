---
title: React·WordArt·3D·Simulation
type: ppt
release_date: 2026-06-30
---

# 4. React·WordArt·3D·Simulation
#layout-chapter

---

## 4.1 React Artifact — 카운터
#layout-contents

렌더 백엔드: React 18.3.1 + Babel-standalone (CDN 조건부). fenced lang `react`.
인자: `React`, `ReactDOM`, `el` (컨테이너), `render(<App />)` 마운트 헬퍼.
JSX → Babel-standalone이 브라우저에서 트랜스파일.

```react
function Counter() {
  const [count, setCount] = React.useState(0);
  const [color, setColor] = React.useState('#4ec9b0');

  const colors = ['#4ec9b0', '#ce9178', '#569cd6', '#dcdcaa', '#c586c0'];
  const nextColor = () => {
    const idx = colors.indexOf(color);
    setColor(colors[(idx + 1) % colors.length]);
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{
        fontSize: '72px',
        fontWeight: 'bold',
        color: color,
        transition: 'color 0.3s',
        marginBottom: '20px'
      }}>
        {count}
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => setCount(c => c - 1)}
          style={{ padding: '8px 24px', fontSize: '20px', borderRadius: '6px',
                   background: '#3c3c3c', color: '#fff', border: '1px solid #555', cursor: 'pointer' }}>
          −
        </button>
        <button
          onClick={() => setCount(0)}
          style={{ padding: '8px 24px', fontSize: '16px', borderRadius: '6px',
                   background: '#3c3c3c', color: '#aaa', border: '1px solid #555', cursor: 'pointer' }}>
          리셋
        </button>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{ padding: '8px 24px', fontSize: '20px', borderRadius: '6px',
                   background: '#3c3c3c', color: '#fff', border: '1px solid #555', cursor: 'pointer' }}>
          +
        </button>
      </div>
      <button
        onClick={nextColor}
        style={{ marginTop: '16px', padding: '6px 16px', fontSize: '13px', borderRadius: '6px',
                 background: color, color: '#000', border: 'none', cursor: 'pointer' }}>
        색상 변경
      </button>
    </div>
  );
}
render(<Counter />);
```

---

## 4.1b React — 아코디언 컴포넌트
#layout-contents

```react
const sections = [
  { title: '텍스트·구조', content: '표, 코드블록, 카드, 멀티컬럼, markmap TOC' },
  { title: '다이어그램·수식', content: 'Mermaid, Kroki, KaTeX, Font Awesome' },
  { title: '차트·지도', content: 'Chart.js, Leaflet, d3 인포그래픽' },
  { title: '인터랙티브', content: 'React, WordArt, model3d, p5.js Simulation' },
  { title: 'htmlArt 27종', content: 'process, cycle, hierarchy, ... callout, annotate' },
];

function Accordion() {
  const [open, setOpen] = React.useState(null);

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: '6px', borderRadius: '6px', overflow: 'hidden',
                               border: '1px solid #444' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', textAlign: 'left', padding: '12px 16px',
                     background: open === i ? '#4ec9b0' : '#2d2d2d',
                     color: open === i ? '#000' : '#ccc',
                     border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
            {open === i ? '▼' : '▶'} {s.title}
          </button>
          {open === i && (
            <div style={{ padding: '12px 16px', background: '#1e1e1e', color: '#9cdcfe', fontSize: '14px' }}>
              {s.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
render(<Accordion />);
```

---

## 4.2 WordArt — 텍스트 장식
#layout-contents

렌더 백엔드: 순수 CSS (추가 CDN 없음). fenced lang `wordart`. 본문 = raw HTML.
유틸 클래스: `.wordart-gradient` / `.wordart-outline` / `.wordart-shadow` / `.wordart-3d` / `.wordart-glow`.

```wordart
<div style="text-align:center; padding: 20px 0;">
  <h1 class="wordart-gradient" style="font-size:3em; margin-bottom:16px;">
    그라데이션 타이틀
  </h1>
  <h2 class="wordart-3d" style="font-size:2.2em; margin-bottom:16px;">
    입체(3D) 텍스트
  </h2>
  <h2 class="wordart-outline" style="font-size:2.2em; margin-bottom:16px;">
    외곽선(Outline) 텍스트
  </h2>
  <h2 class="wordart-shadow" style="font-size:2.2em; margin-bottom:16px;">
    그림자(Shadow) 텍스트
  </h2>
  <h2 class="wordart-glow" style="font-size:2.2em; margin-bottom:0;">
    발광(Glow) 텍스트
  </h2>
</div>
```

---

## 4.2b WordArt — SVG 곡선 텍스트
#layout-contents

```wordart
<svg viewBox="0 0 500 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:600px;display:block;margin:0 auto;">
  <defs>
    <path id="arc1" d="M 50 140 Q 250 20 450 140"/>
    <path id="arc2" d="M 80 160 Q 250 60 420 160"/>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4ec9b0"/>
      <stop offset="100%" style="stop-color:#569cd6"/>
    </linearGradient>
  </defs>
  <text font-size="36" font-weight="bold" fill="url(#grad1)" letter-spacing="3">
    <textPath href="#arc1">m2slide Visual Components</textPath>
  </text>
  <text font-size="20" fill="#ce9178" opacity="0.8" letter-spacing="2">
    <textPath href="#arc2">슬라이드 시각 구성요소 쇼케이스 2026</textPath>
  </text>
</svg>
```

---

## 4.3 3D 모델 뷰어 (model3d)
#layout-contents

렌더 백엔드: `<model-viewer>` Web Component (model-viewer 3.5.0 CDN). fenced lang `model3d`.
`src`: GLB/GLTF 파일 경로 필수. `Projects/{Name}/img/`에 배치 → `slide/img/` 자동 복사.

**참고**: 아래 예시는 `Projects/m2Slide_visual_component_v1.0/img/sample-model.glb`
(Khronos Duck 샘플)을 사용함. 빌드 시 GLB가 data: URI로 인라인되어 단일 HTML 파일로 배포 가능.
다른 모델로 교체하려면 `img/sample-model.glb`를 덮어쓰고 재빌드.

```model3d
{
  "src": "./img/sample-model.glb",
  "alt": "3D 샘플 모델 — GLB 파일 배치 필요",
  "autoRotate": true,
  "rotationPerSecond": "30deg",
  "height": "380px",
  "backgroundColor": "#1e1e1e",
  "camera-controls": true
}
```

**GLB 자산 취득 방법**
* Sketchfab (오픈소스 모델) — `.glb` 직접 다운로드
* Blender → File > Export > glTF 2.0 (.glb)
* Three.js 예제 모델: `https://threejs.org/examples/models/`

---

## 4.4 Simulation — p5.js 바운싱 볼
#layout-contents

렌더 백엔드: p5.js 1.11.2 (CDN 조건부). fenced lang `p5`. instance mode 필수.
인자: `p` (p5 인스턴스), `el` (컨테이너). 모든 p5 API = `p.` prefix.

```p5
const balls = [];
const N = 12;

p.setup = function() {
  p.createCanvas(el.clientWidth, el.clientHeight);
  p.colorMode(p.HSB, 360, 100, 100, 100);
  for (let i = 0; i < N; i++) {
    balls.push({
      x: p.random(30, p.width - 30),
      y: p.random(30, p.height - 30),
      vx: p.random(-3, 3),
      vy: p.random(-3, 3),
      r: p.random(14, 28),
      hue: p.random(360)
    });
  }
};

p.draw = function() {
  p.background(220, 20, 12, 30);
  for (const b of balls) {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < b.r || b.x > p.width - b.r) b.vx *= -1;
    if (b.y < b.r || b.y > p.height - b.r) b.vy *= -1;
    b.hue = (b.hue + 0.5) % 360;

    p.noStroke();
    p.fill(b.hue, 80, 95, 85);
    p.ellipse(b.x, b.y, b.r * 2);

    p.fill(b.hue, 30, 100, 60);
    p.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.5);
  }
};
```

---

## 4.4b p5.js — Lissajous 곡선
#layout-contents

```p5
let t = 0;
const points = [];
const MAX_PTS = 400;

p.setup = function() {
  p.createCanvas(el.clientWidth, el.clientHeight);
  p.strokeWeight(2);
  p.noFill();
};

p.draw = function() {
  p.background(30, 30, 46);
  const cx = p.width / 2;
  const cy = p.height / 2;
  const rx = Math.min(cx, cy) * 0.75;
  const ry = rx * 0.6;

  const x = cx + rx * Math.sin(3 * t + Math.PI / 4);
  const y = cy + ry * Math.sin(2 * t);
  points.push({ x, y });
  if (points.length > MAX_PTS) points.shift();

  for (let i = 1; i < points.length; i++) {
    const alpha = Math.floor(255 * i / points.length);
    const hue = (i * 360 / MAX_PTS) % 360;
    p.stroke(p.color(`hsla(${hue}, 80%, 65%, ${alpha / 255})`));
    p.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
  }

  p.noStroke();
  p.fill(78, 201, 176);
  p.ellipse(x, y, 10);

  t += 0.025;
};
```

---

## 4.4c p5.js — Boids 군집 시뮬레이션
#layout-contents

Craig Reynolds(1986) Boids 알고리즘 — align(정렬) + cohesion(응집) + separation(분리)
3규칙으로 새떼·물고기떼 같은 자율 군집 형성. edge wrap-around로 화면 순환.

```p5
let boids = [];
const N = 80;
const VIS = 80, SEP = 36, MAX_V = 3.5;

class Boid {
  constructor(w, h) {
    this.pos = p.createVector(p.random(w), p.random(h));
    this.vel = p5.Vector.random2D().mult(p.random(1, MAX_V));
    this.acc = p.createVector(0, 0);
  }
  edges(w, h) {
    if (this.pos.x < 0) this.pos.x = w;
    if (this.pos.x > w) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = h;
    if (this.pos.y > h) this.pos.y = 0;
  }
  flock(others) {
    let align = p.createVector(), cohes = p.createVector(), sep = p.createVector();
    let nA = 0, nC = 0, nS = 0;
    for (const o of others) {
      if (o === this) continue;
      const d = p5.Vector.dist(this.pos, o.pos);
      if (d < VIS) { align.add(o.vel); nA++; cohes.add(o.pos); nC++; }
      if (d < SEP && d > 0) {
        const diff = p5.Vector.sub(this.pos, o.pos).div(d * d);
        sep.add(diff); nS++;
      }
    }
    if (nA) { align.div(nA).setMag(MAX_V).sub(this.vel).limit(0.15); this.acc.add(align); }
    if (nC) { cohes.div(nC).sub(this.pos).setMag(MAX_V).sub(this.vel).limit(0.08); this.acc.add(cohes); }
    if (nS) { sep.div(nS).setMag(MAX_V).sub(this.vel).limit(0.2); this.acc.add(sep); }
  }
  update() {
    this.vel.add(this.acc).limit(MAX_V);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }
  draw() {
    const a = this.vel.heading();
    p.push();
    p.translate(this.pos.x, this.pos.y);
    p.rotate(a);
    p.fill('#58a6ff');
    p.stroke('#1f6feb');
    p.strokeWeight(1.5);
    p.triangle(-14, -9, -14, 9, 20, 0);
    p.pop();
  }
}

p.setup = function() {
  p.createCanvas(el.clientWidth, el.clientHeight);
  for (let i = 0; i < N; i++) boids.push(new Boid(p.width, p.height));
};
p.draw = function() {
  p.background('#0d1117');
  for (const b of boids) { b.edges(p.width, p.height); b.flock(boids); }
  for (const b of boids) { b.update(); b.draw(); }
};
```

---

## 4.4d p5.js — Wave Field (사인파 격자)
#layout-contents

중심에서 동심원으로 퍼지는 사인파를 격자 점의 크기·색상으로 가시화.
`p.dist` + `p.sin(d - t)` 조합으로 중심 기준 phase 시각화 — 28×16 = 448점 60fps.

```p5
let t = 0;
p.setup = function() {
  p.createCanvas(el.clientWidth, el.clientHeight);
};
p.draw = function() {
  p.background('#0d1117');
  p.noStroke();
  const cols = 28, rows = 16;
  const dx = p.width / cols, dy = p.height / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * dx + dx / 2;
      const y = j * dy + dy / 2;
      const d = p.dist(x, y, p.width / 2, p.height / 2);
      const v = p.sin(d * 0.02 - t) * 0.5 + 0.5;
      const r = p.map(v, 0, 1, 4, dx * 0.45);
      p.fill(88 + v * 100, 166 + v * 50, 255, 200);
      p.ellipse(x, y, r, r);
    }
  }
  t += 0.06;
};
```
