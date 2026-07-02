---
title: 사용법
type: ppt
---

* 마크다운 작성 → 한 줄 명령어 → 끝

---

## 동작 모드 두 가지

* **단일 페이지 모드**: `Projects/{이름}/{이름}.md` 한 파일
    - 짧은 발표·요약 자료에 적합
* **챕터 모드**: `Projects/{이름}/markdown/AGENDA.md` + 챕터별 `.md`
    - 긴 강의·다중 섹션 자료에 적합
    - `markdown/` 폴더 안 `AGENDA.md` 존재 여부로 자동 판정

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

---

## 슬라이드 작성 예시

```markdown
---
title: 발표 제목
type: ppt
---

## 첫 슬라이드

* 항목 1
* 항목 2

---

## 두 번째 슬라이드

* `---` 한 줄로 슬라이드 분리
```

* 마크다운만 알면 누구나 작성 가능
