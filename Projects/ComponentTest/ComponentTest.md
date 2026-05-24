---
title: Component Test — model3d
subtitle: Issue206 3D 모델 뷰어 컴포넌트 검증
type: ppt
release_date: 2026-05-24
---

## model3d — 실제 GLB 렌더 확인 (test-cube.glb)

```model3d
{
  "src": "./img/test-cube.glb",
  "alt": "파란 큐브 — model-viewer 실제 렌더 검증",
  "autoRotate": true,
  "rotationPerSecond": "30deg",
  "backgroundColor": "#1a1a2e"
}
```

---

## model3d — 카메라 위치 고정 (정면 뷰)

```model3d
{
  "src": "./img/test-cube.glb",
  "alt": "정면 카메라 + 자동회전 없음",
  "fieldOfView": "45deg",
  "minCameraOrbit": "0deg 75deg 4m",
  "maxCameraOrbit": "0deg 75deg 4m",
  "backgroundColor": "#222831"
}
```

* `minCameraOrbit == maxCameraOrbit` → 카메라 위치 완전 고정 (드래그 회전 차단)
* 자동회전 없이 정적 정면 뷰 — 단일 각도 강조 시 유용

---

## chart — 다중 데이터셋 line + pie 비교

```chart
{
  "type": "line",
  "data": {
    "labels": ["1월","2월","3월","4월","5월","6월"],
    "datasets": [
      { "label": "매출", "data": [12,19,15,25,22,30], "borderColor": "#58a6ff", "tension": 0.3 },
      { "label": "비용", "data": [8,11,9,14,13,18], "borderColor": "#f78166", "tension": 0.3 }
    ]
  },
  "options": {
    "responsive": true,
    "plugins": { "legend": { "position": "top" } }
  }
}
```

---

## model3d + chart 병존 확인

```chart
{
  "type": "bar",
  "data": {
    "labels": ["A", "B", "C"],
    "datasets": [{ "label": "값", "data": [12, 19, 7] }]
  }
}
```

---

## 일반 슬라이드 (CDN 미주입 무관)

* model3d CDN은 `model3d` 블록 있는 데크에만 조건 주입
* 이 슬라이드는 model3d 없음 — 동일 덱이므로 CDN 주입됨 (정상)
* GLB 파일을 `Projects/ComponentTest/img/`에 배치하면 실제 3D 렌더 확인 가능

---

## p5 — Bouncing Ball (자동 움직임 시뮬레이션)

```p5
let x, y, vx, vy, r;
p.setup = function() {
  p.createCanvas(el.clientWidth, el.clientHeight);
  r = 30;
  x = p.width / 2; y = p.height / 2;
  vx = 5; vy = 4;
};
p.draw = function() {
  p.background('#1a1a2e');
  p.noStroke();
  p.fill('#4ec9b0');
  p.ellipse(x, y, r * 2, r * 2);
  x += vx; y += vy;
  if (x < r || x > p.width - r) vx = -vx;
  if (y < r || y > p.height - r) vy = -vy;
};
```

---

## p5 — Mouse Interaction (마우스 추적 입자)

```p5
let trail = [];
p.setup = function() {
  p.createCanvas(el.clientWidth, el.clientHeight);
};
p.draw = function() {
  p.background(20, 20, 40, 60);
  trail.push({ x: p.mouseX, y: p.mouseY });
  if (trail.length > 60) trail.shift();
  p.noStroke();
  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    const a = p.map(i, 0, trail.length, 30, 255);
    const sz = p.map(i, 0, trail.length, 6, 24);
    p.fill(78, 201, 176, a);
    p.ellipse(t.x, t.y, sz, sz);
  }
};
```

---

## p5 — Particle System (입자 시스템)

```p5
let parts = [];
p.setup = function() {
  p.createCanvas(el.clientWidth, el.clientHeight);
  const n = Math.max(80, Math.floor(p.width * p.height / 8000));
  for (let i = 0; i < n; i++) {
    parts.push({
      x: p.random(p.width),
      y: p.random(p.height),
      vx: p.random(-2, 2),
      vy: p.random(-2, 2),
      r: p.random(4, 14),
    });
  }
};
p.draw = function() {
  p.background('#0d1117');
  p.noStroke();
  p.fill('#58a6ff');
  for (const pt of parts) {
    p.ellipse(pt.x, pt.y, pt.r * 2);
    pt.x += pt.vx; pt.y += pt.vy;
    if (pt.x < 0 || pt.x > p.width) pt.vx *= -1;
    if (pt.y < 0 || pt.y > p.height) pt.vy *= -1;
  }
};
```

---

## model3d — 복잡 예제 (AR + 카메라 제한 + 자동회전)

```model3d
{
  "src": "./img/test-cube.glb",
  "alt": "AR + 카메라 orbit 제한 + 자동회전 종합 예제",
  "ar": true,
  "autoRotate": true,
  "rotationPerSecond": "20deg",
  "fieldOfView": "30deg",
  "minCameraOrbit": "auto auto 2m",
  "maxCameraOrbit": "auto auto 8m",
  "backgroundColor": "#0d1117"
}
```

* `ar: true` — 모바일 지원 브라우저 AR 모드 활성화
* `minCameraOrbit` / `maxCameraOrbit` — zoom 거리 2m~8m 제한
* `fieldOfView: 30deg` — 망원 효과 (기본 45deg)
* `autoRotate` + `rotationPerSecond: 20deg` — 자동 회전 속도 제어

---

## p5 — 복잡 예제 (Boids 군집 시뮬레이션)

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

* **Boids 알고리즘** — Craig Reynolds (1986): align(정렬) + cohesion(응집) + separation(분리) 3규칙 자율 군집
* 80마리 화살표가 이웃과 상호작용하여 새떼·물고기떼 같은 자연스러운 무리 형성
* edge wrap-around로 화면 경계 순환

---

## p5 — Wave Field (사인파 격자)

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

* 중심에서 동심원으로 퍼지는 사인파 → 격자 점 크기·색상으로 가시화
* `p.dist` + `p.sin(d - t)` 조합으로 중심점 기준 phase 시각화
* GPU shader 없이도 28×16 = 448개 점 60fps 무리 없이 렌더
