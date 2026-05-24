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

## model3d — GLB 없음 (오류 표시 확인)

```model3d
{
  "src": "./img/missing.glb",
  "alt": "존재하지 않는 GLB — model-viewer 로딩 실패 정상"
}
```

---

## model3d — JSON 파싱 오류 확인

```model3d
{ invalid json syntax }
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
let x, y, vx, vy;
p.setup = function() {
  p.createCanvas(600, 320);
  x = 300; y = 160; vx = 4; vy = 3;
};
p.draw = function() {
  p.background('#1a1a2e');
  p.noStroke();
  p.fill('#4ec9b0');
  p.ellipse(x, y, 40, 40);
  x += vx; y += vy;
  if (x < 20 || x > 580) vx = -vx;
  if (y < 20 || y > 300) vy = -vy;
};
```

---

## p5 — Mouse Interaction (마우스 추적 입자)

```p5
let trail = [];
p.setup = function() {
  p.createCanvas(600, 320);
};
p.draw = function() {
  p.background(20, 20, 40, 60);
  trail.push({ x: p.mouseX, y: p.mouseY });
  if (trail.length > 40) trail.shift();
  p.noStroke();
  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    const a = p.map(i, 0, trail.length, 30, 255);
    p.fill(78, 201, 176, a);
    p.ellipse(t.x, t.y, 14, 14);
  }
};
```

---

## p5 — Particle System (입자 시스템)

```p5
let parts = [];
p.setup = function() {
  p.createCanvas(600, 320);
  for (let i = 0; i < 60; i++) {
    parts.push({
      x: p.random(p.width),
      y: p.random(p.height),
      vx: p.random(-1.5, 1.5),
      vy: p.random(-1.5, 1.5),
      r: p.random(4, 12),
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

## p5 — 코드 오류 시 에러 표시 확인

```p5
this is invalid javascript;
```
