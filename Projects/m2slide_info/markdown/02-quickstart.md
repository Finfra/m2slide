---
title: 빠른 시작
type: ppt
---

# 02. 빠른 시작

#layout-chapter

::: part
Chapter 2.
:::

## 설치 · 프로젝트 생성 · 첫 빌드

---

## 설치 — 필요한 것

* **Node.js + npm** (외부 dependency 0 — 표준 라이브러리만 사용)
* git으로 저장소 클론 후 바로 사용

```bash
node --version    # v18 이상 권장
npm --version
git clone <m2slide-repo>
```

---

## 프로젝트 구조 만들기

* `Projects/<Name>/` 아래에 파일 3종만 있으면 시작 가능

```text
Projects/MyDeck/
├── _config.yml          # 빌드·렌더링 설정
└── markdown/
    ├── AGENDA.md        # 챕터 인덱스
    └── 01-intro.md      # 챕터 마크다운
```

---

## 첫 빌드 실행

* 빌드는 명령 한 줄

```bash
./m2slide.sh MyDeck
```

* **출력**: `Theme applied: default_lec` → `HTML generated` → `slide/*.html` 생성 + dev-server 자동 시동
* 빌드 완료와 함께 브라우저에서 `index.html` Cover Page가 열림

---

## 브라우저에서 확인

* `slide/index.html` = Cover Page (진입점)
* `slide/agenda.html` = Markmap 전체 목차

| 키 | 동작 |
| :--- | :--- |
| `←` `→` | 이전 / 다음 슬라이드 |
| `↑` | 상위 페이지로 이동 |
| `ESC` | 전체 개요 보기 |
| `S` | 발표자 노트 모드 |

---

## 프로젝트 구조 전체

```text
Projects/<Name>/
├── Info.md          # 기획 메타 (단계 1)
├── _config.yml      # 빌드 설정
├── refs/            # 수집 자료 (단계 2)
├── markdown/        # 챕터 소스 (AGENDA.md + XX-*.md)
├── img/             # 공유 이미지
└── slide/           # 빌드 산출 HTML (자동 생성)
```

* `slide/`는 빌드 산출물 — 직접 편집하지 않음
