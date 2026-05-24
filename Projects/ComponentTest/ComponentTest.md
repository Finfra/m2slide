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
