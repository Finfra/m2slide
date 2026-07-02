---
title: 확장성
type: ppt
---

* theme + layout으로 디자인을 자유롭게

---

## Theme & Layout 시스템

* `theme/{name}/slide.css` — 전체 시각 스타일 SSOT
* `theme/{name}/layouts/*.html` — 슬라이드 레이아웃 템플릿
* 슬라이드별 override: 첫 줄 `#layout-blank`로 layout 변경
* 슬롯(`::: slotName ... :::`)으로 템플릿에 콘텐츠 주입

::: htmlart process
* slide.css — 전체 스타일
* layouts/*.html — 레이아웃 템플릿
* #layout-* — 슬라이드별 override
* ::: slotName — 콘텐츠 주입
:::

---

## 멀티 컬럼 레이아웃

```markdown
::: columns
::: {.column width="60%"}
좌측 콘텐츠
:::
::: {.column width="40%"}
우측 콘텐츠
:::
:::
```

* Pandoc 표준 호환
* 휴리스틱 자동 2분할: 텍스트 + 이미지 한 슬라이드 → 자동 좌·우 분할

---

## 커스터마이징 포인트

* **`_config.yml`**: theme, layout, markmap 깊이, slide 비율 등
* **frontmatter**: instructor·version·release_date·QR 등 운영 메타
* **슬라이드 디렉티브**: `#transition-*`, `#background-*`, `{.fragment}`
* **이미지·자산**: `Projects/{이름}/img/` 자동 복사
