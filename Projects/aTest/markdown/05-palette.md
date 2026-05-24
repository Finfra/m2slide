# 5. 컬러 팔레트 시스템

`_config.yml palette: <name>` 한 줄로 데크 전체 컬러 톤을 교체하고, htmlArt 블록은 `{.palette-X}` / `{.accent-N}`으로 개별 색 override한다. 9 슬롯 = Accent 1-6 + Text + Bg + Surface (PowerPoint Office Theme 대응). (구 paletteTest, Issue210)

* `palette:` 값을 default → warm → cool → mono로 교체하며 빌드하면 같은 슬라이드 시각 톤이 한꺼번에 바뀐다.
* htmlArt 슬라이드 색이 자동으로 따라간다.
* 컬러 팔레트 SSOT: `_doc_arch/color-palette.md` · 카탈로그: `data/palettes/catalog.yml`

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

## cycle — 순환 (균질형)

::: htmlart cycle
* 학습
* 적용
* 피드백
* 개선
:::

---

## matrix — 사분면 (균질형)

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

## 사용 예 — `_config.yml`

```yaml
theme: default
palette: warm        # default | warm | cool | mono
```

* 미지정 시 default (회귀 0 보증 — 현 m2slide 기본 톤 유지).
* 신규 팔레트 추가: `data/palettes/catalog.yml` + `theme/{name}/palettes/{name}.css` 동시 생성.
* lint: `_config.yml palette:` 값이 실제 파일 존재하는지 빌드 시 검증.

---

## 팔레트 톤 비교

* **default**: 노랑·청록·주황·보라·녹색·빨강 (m2slide 브랜드)
* **warm**: 빨강·주황·황금 (강렬·열정)
* **cool**: 파랑·청록·보라 (차분·기술·B2B)
* **mono**: 회색 명도 변형 (미니멀·고급·인쇄)

---

## 색 자동 순환 정책 요약

| 분류 | 타입 | 색 정책 |
| :--- | :--- | :--- |
| 균질형 | pie · cycle · gear · matrix · venn | accent 1~6 순환 |
| 순차/점층형 | process · timeline · chevron · step · funnel | accent-1 단색 + opacity 점층 |
| 중심+자식형 | hierarchy · radial · arrow | 중심 accent-1, 자식 accent-2 |
| 목록·계열형 | numbered · hexagon · block · bracket · tab · target | accent-1 단색 |
| 좌우 대비형 | balance · compare | 좌 accent-1, 우 accent-2 |
