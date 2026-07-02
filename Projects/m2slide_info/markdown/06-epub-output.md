---
title: "EPUB & 산출물"
type: ppt
---

# 06. EPUB & 산출물

#layout-chapter

::: part
Chapter 6.
:::

## HTML · EPUB · PDF · PPTX 4종 산출물과 배포

---

## HTML 슬라이드 산출물 구조

* 빌드하면 `slide/`에 HTML이 자동 생성됨

```text
slide/
├── index.html        # Cover Page (진입점)
├── agenda.html       # Agenda Page (Markmap TOC)
├── 01-what-is-m2slide.html
└── ...               # 챕터별 Reveal.js deck
```

---

## 3-Page Model — Cover · Agenda · TOC

| 페이지 | 파일 | 역할 |
| :--- | :--- | :--- |
| Cover | `index.html` | 발표 표지 + 진입 |
| Agenda | `agenda.html` | Markmap 전체 목차 |
| TOC | 챕터 deck 내 | Cards 형 챕터 목차 |

```mermaid
graph LR
  Cover["Cover (index.html)"] --> Agenda["Agenda (agenda.html)"]
  Agenda --> TOC["챕터 TOC Cards"] --> Deck["본문 슬라이드"]
```

---

## EPUB 동시 생성

* `--epub` 한 옵션이면 전자책이 함께 생성됨

```bash
./m2slide.sh m2slide_info --epub
```

* EPUB 3.0 표준 — **iBooks · Calibre · Google Play Books** 호환
* AGENDA.md에서 책 제목·목차 자동 추출, Mermaid는 SVG로 변환
* 슬라이드 한 벌로 발표용 HTML과 읽기용 전자책을 동시에 확보

---

## PDF · PPTX 변환

* HTML·EPUB 외에 **PDF·PowerPoint**도 옵션 하나로 함께 생성됨

| 형식 | 옵션 | 기반 | 용도 |
| :--- | :--- | :--- | :--- |
| PDF | `--pdf` | decktape | 챕터별 합본 PDF 배포 |
| PPTX | `--pptx` | pandoc | PowerPoint 호환 편집 |

```bash
./m2slide.sh m2slide_info --pdf
./m2slide.sh m2slide_info --pptx
```

* 마크다운 한 벌 → **HTML · EPUB · PDF · PPTX** 4종 산출물로 일원화

---

## 배포 — file:// 단독 동작 보장

* 빌드 산출물은 **단일 `.html` + `img/` 폴더**만으로 동작
* 인터넷 없이 `file://`로 열어도 정상 (CDN 자산만 온라인 필요)

> server-side 의존(localhost·동적 endpoint·WebSocket) 금지 — 배포 SSOT 정책

* 다른 머신·다른 디렉토리로 복사해도 그대로 재생됨

---

## dev-server 실시간 미리보기

* 빌드 시 **port 9877** dev-server가 자동 시동됨 (idempotent)

```bash
http://localhost:9877/p/m2slide_info/s/1/1   # 챕터1 / 슬라이드1
./m2slide.sh --serve status                   # 수동 제어
```

* file:// 배포가 SSOT, dev-server는 헤드리스 검증용 보조 채널
