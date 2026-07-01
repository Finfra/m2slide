# 11. Pandoc 출판 파이프라인

#layout-contents-full
## Pandoc — 범용 문서 변환기 개요

![Pandoc — 범용 문서 변환기 개요](img/GenContetntsProd_v10_31.png)

---

## Pandoc 핵심 개요

* Pandoc: 40+ 입력 ↔ 40+ 출력 포맷을 잇는 CLI 도구 (pandoc.org)
* 핵심 가치: Markdown 한 번 작성 → 7가지 포맷 동시 출판
* 본 강의 핵심 경로: Markdown → DOCX / PDF / PPTX / RevealJS / HTML
* 본 강의 슬라이드 자체가 Pandoc 산출물 — `01-part1.md` → `01-part1.pptx`
* 설치: macOS `brew install pandoc` / Windows 공식 .msi / Linux `apt install pandoc`

---

## 변환 매트릭스 — Markdown 1소스 멀티 출판

* 공식 문서: [pandoc.org](https://pandoc.org/)

| 입력 | <span style="color:#ffffff"> __→__ </span> | 출력 | 용도 |
| :-: | :-: | :-: | :-: |
| .md | → | .docx | Word 보고서·회의 자료 |
| .md | → | .pdf | 인쇄·정식 배포 |
| .md | → | .pptx | PowerPoint 슬라이드 |
| .md | → | .html | 정적 웹 페이지 |
| .md | → | RevealJS | 웹 슬라이드 (HTML 기반) |

---

## Pandoc는 역으로 변환 가능?

* 양방향 지원: `docx → md`도 가능 (legacy 문서 마이그레이션)
* PDF만 별도 의존성: LaTeX(texlive) 또는 wkhtmltopdf 백엔드 필요
* **주의**: 무조건 되는 것은 아님 — 포맷 복잡도에 따라 손실 발생 가능
* cf) “왜 PDF만 별도 설치?” → “PDF는 조판 엔진이 필요해서, 나머지는 Pandoc 단독”

---

#layout-contents-full
## Pandoc 변환 흐름 — 한 장으로 보는 파이프라인

![Pandoc 변환 흐름 — 한 장으로 보는 파이프라인](img/GenContetntsProd_v10_32.png)

---

## Pandoc 변환 파이프라인 — 단계별 흐름

* **입력**: 본인 작성 Markdown 1편 (Frontmatter + 본문)
* **처리**: Pandoc CLI — `pandoc {입력} -o {출력} [옵션]`
* **출력**: 5종 포맷 분기 (DOCX / PDF / PPTX / HTML / RevealJS)
* **옵션 영향**: `--slide-level`, `--reference-doc`, `--pdf-engine`, `--template`
* 한 번 작성 → 다중 출판이 핵심 메시지

---

## 설치 확인 + CLI 기본 문법

```bash
# 설치 확인
pandoc --version

# 기본 변환 패턴
pandoc input.md -o output.docx
pandoc input.md -o output.pdf
pandoc slides.md -o slides.pptx --slide-level=1
pandoc slides.md -o slides.html --to=revealjs --standalone
```

* 명령 구조: `pandoc {입력} -o {출력} [옵션]` — 확장자로 포맷 자동 판단
* `--slide-level=N` — N레벨 헤딩이 슬라이드 구분점 (본 강의는 `=1` 사용)
* `-o` 생략 시 stdout 출력 — 파이프 처리 가능

---

## 🙋 직접 따라 하세요 — Markdown → DOCX 변환

* 1단계: Part1에서 작성한 Markdown 파일 1개 준비 (없으면 본 강의 어젠다 발췌본 사용)
* 2단계: 터미널 열고 해당 파일 폴더로 이동: `cd ~/Documents/lec-vault`
* 3단계: `pandoc welcome.md -o welcome.docx` 실행
* 4단계: 생성된 welcome.docx 더블클릭 → Word·LibreOffice에서 정상 표시 확인
* ✅ 통과 조건: welcome.docx 파일 생성 + Word에서 제목·본문 정상 렌더링

---

## 🙋 직접 따라 하세요 — Markdown → PDF 변환

* 1단계: 동일 파일로 PDF 변환 시도: `pandoc welcome.md -o welcome.pdf`
* 2단계: LaTeX 미설치 시 오류 발생 → 대안 백엔드 사용
  - `pandoc welcome.md -o welcome.pdf --pdf-engine=wkhtmltopdf` (사전 wkhtmltopdf 설치 필요)
* 3단계: 또는 우회 — `pandoc welcome.md -o welcome.html`로 HTML 출력 후 브라우저 "PDF로 인쇄"
* 4단계: 생성된 PDF 열어서 한글 정상 표시 확인 (한글 깨지면 폰트 옵션 추가)
* ✅ 통과 조건: welcome.pdf 또는 welcome.html 어느 쪽이든 정상 생성

---

## 🙋 직접 따라 하세요 — Markdown → PPTX 변환

* 1단계: 슬라이드용 Markdown 1편 준비 — H1(`#`) 헤딩이 슬라이드 구분점
* 2단계: 본 강의 슬라이드 룰(`.claude/rules/slide-md-rules.md`) 확인 — content block 1개 유지
* 3단계: 변환 명령 실행: `pandoc slides.md -o slides.pptx --slide-level=1`
* 4단계: 생성된 .pptx 열어서 H1마다 슬라이드 1장씩 분리 확인
* ✅ 통과 조건: 슬라이드 수 = 입력 .md의 H1 개수

---

## 템플릿·메타데이터 — Frontmatter로 표지 자동화

```yaml
title: "강의 자료"
subtitle: "Generative Content Production"
author: "남중구"
date: 2026-05-14
```

* Pandoc은 Frontmatter YAML을 메타데이터로 자동 인식 → 표지·헤더·푸터에 채움
* `--reference-doc=template.pptx` — 회사·강의 디자인 템플릿 적용
* `--template=mytemplate.html` — HTML·LaTeX 출력 시 외형 통제
* 메타데이터 누락 시 표지가 비거나 파일명이 그대로 표지 — Frontmatter 습관화 권장

---

## 변환 실패 디버깅 — 자주 만나는 3패턴

* **패턴 1 — 이미지 경로**: 변환 시점 작업 디렉토리 기준으로 상대경로 해석. `cd` 위치가 어긋나면 이미지 누락
* **패턴 2 — Content block 충돌**: PPTX 변환 시 한 슬라이드에 table + blockquote + image 3개 동시 → overflow. 불릿으로 통일
* **패턴 3 — 한글 폰트**: PDF 출력 시 기본 폰트에 한글 없음 → `-V mainfont=NanumGothic` 같은 폰트 옵션 명시
* 디버깅 흐름: 변환 명령 + `--verbose` 옵션 → 어느 단계에서 실패했는지 추적
* 대안: `.html`로 먼저 출력 → 브라우저에서 확인 후 최종 포맷 재변환

---

## Pandoc 정리 — 출판 파이프라인의 최종 단계



* Pandoc의 가치: Markdown 단일 소스 → 다중 포맷 동시 출판 (1소스 N채널)
* 본 강의에서 익힌 경로: .md → .docx / .pdf / .pptx / .html / RevealJS
* 출력별 강점
  * DOCX: 협업·코멘트 요청에 최적
  * PDF: 정식 배포·인쇄
  * PPTX: 발표·강의
  * HTML·RevealJS: 웹 공유·반응형
* 미니 프로젝트 마지막 단계에서 그대로 적용 — DOCX 또는 PDF 1편 출력이 통과 조건
* 강사 메모: “Pandoc은 1줄 명령으로 시작해서 평생 쓰는 도구” — 청중에게 부담 없이 추천 가능한 단순함 강조
* Q&A 슬롯: 3분 — Pandoc 변환 옵션·템플릿 질문


