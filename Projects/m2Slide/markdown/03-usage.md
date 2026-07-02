---
title: 사용법
type: ppt
---

* 마크다운 작성 → 한 줄 명령어 → 끝

---

## 두 가지 모드

::: htmlart compare
* **단일 페이지 모드** / 한 파일
  - `{이름}.md` 단일 파일
  - 짧은 발표·요약 자료
  - 빠른 시작, 단순 구조
* **챕터 모드** / AGENDA.md
  - `markdown/` + 챕터별 `.md`
  - 긴 강의·다중 섹션
  - 계층 네비게이션 자동 생성
:::

---

## 빌드 명령어

```bash
## HTML 슬라이드 생성
./m2slide.sh m2Slide

## HTML + EPUB 동시 생성
./m2slide.sh m2Slide --epub

## 브라우저로 바로 확인
./run.sh m2Slide
```

* 마크다운만 알면 누구나 작성 가능
