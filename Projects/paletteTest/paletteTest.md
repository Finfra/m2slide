---
title: 컬러 팔레트 시스템 데모
subtitle: Issue210 — theme variant + htmlArt 객체 단위 컬러 override
type: ppt
version: 0.1.0
date: 2026-05-24
release_date: 2026-05-24
tags: []
---

# 컬러 팔레트 시스템

* `_config.yml palette: <name>` 한 줄로 전체 데크 컬러 톤 교체.
* htmlArt 블록은 `{.palette-X}` `{.accent-N}` 으로 개별 색 override.
* 9 슬롯 = Accent 1-6 + Text + Bg + Surface (PowerPoint Office Theme 대응).

> 본 데크의 `palette:` 값을 default → warm → cool → mono 로 교체하며 빌드하면
> 같은 슬라이드들의 시각 톤이 한꺼번에 바뀐다. htmlArt 슬라이드 색이 자동으로 따라간다.

---

## pie — 균질형 (6 accent 순환)

* default 팔레트 = 노랑·청록·주황·보라 4색.
* palette 교체 시 자동 변경.

::: htmlart pie
* 모바일 45%
  - iOS·Android
* 데스크탑 30%
  - Windows·macOS
* 태블릿 15%
* 기타 10%
:::

---

## cycle — 순환

::: htmlart cycle
* 학습
* 적용
* 피드백
* 개선
:::

---

## matrix — 사분면

::: htmlart matrix
* 긴급·중요
  - 즉시 처리
* 비긴급·중요
  - 계획 수립
* 긴급·비중요
  - 위임
* 비긴급·비중요
  - 제거
:::

---

## process — 순차 단계 (단색 + opacity 점층)

::: htmlart process
* 기획
  - 주제 정의
* 설계
  - 구조 확정
* 구현
  - 코드 작성
* 배포
  - 빌드·공유
:::

---

## 블록 단위 override — `{.palette-cool}`

* 같은 데크 안에서 한 블록만 cool 팔레트 강제.

::: htmlart pie {.palette-cool}
* A 40%
* B 30%
* C 20%
* D 10%
:::

---

## 단일 색 강제 — `{.accent-3}`

* 균질형 순환 대신 accent 3번만 단색 + opacity 점층.

::: htmlart pie {.accent-3}
* 1분기 25
* 2분기 30
* 3분기 20
* 4분기 25
:::

---

## 사용 예 — _config.yml

```yaml
theme: default
palette: warm        # default | warm | cool | mono
```

* 미지정 시 default (회귀 0 보증 — 현 m2slide 기본 톤 유지).
* 신규 팔레트 추가: `data/palettes/catalog.yml` + `theme/{name}/palettes/{name}.css` 동시 생성.
* lint: `_config.yml palette:` 값이 실제 파일 존재하는지 빌드 시 검증.

---

## 차이 비교

* default: 노랑·청록·주황·보라·녹색·빨강 (m2slide 브랜드)
* warm: 빨강·주황·황금 (강렬·열정)
* cool: 파랑·청록·보라 (차분·기술·B2B)
* mono: 회색 명도 변형 (미니멀·고급·인쇄)

> 컬러 팔레트 SSOT: `_doc_arch/color-palette.md` · 카탈로그: `data/palettes/catalog.yml`
