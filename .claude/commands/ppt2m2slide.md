---
name: ppt2m2slide
description: 기존 PowerPoint(.pptx) 파일을 m2slide 프로젝트로 역변환하는 ppt2m2slide agent의 슬래시 진입점. PPT 슬라이드·SmartArt·차트·색상을 m2slide 카탈로그에 매핑하고 미매칭 패턴은 data/_proposals/로 분리.
date: 2026-05-24
---

# 사용법

```
/ppt2m2slide <pptx 경로> [project-name] [--mode chapter|single|auto] [--no-checkpoint] [--copy]
```

# 인자

| 인자 | 필수 | 기본값 | 설명 |
| :--- | :--: | :--- | :--- |
| `<pptx 경로>` | 필수 | — | 변환할 .pptx 파일의 절대/상대 경로 |
| `[project-name]` | 선택 | PPT 파일명 sanitize | `Projects/<Name>/` 디렉토리 이름. 한글 자동 ASCII 변환 + kebab-case |
| `--mode` | 선택 | `auto` | `chapter` / `single` / `auto`. auto는 `data/ppt2m2slide/heuristics.yml mode_decision` 기준 자동 판정 |
| `--no-checkpoint` | 선택 | 미설정 (체크포인트 활성) | 체크포인트 3개 자동 통과. CI 자동 변환용 |
| `--copy` | 선택 | 미설정 (기본 `md_first`) | **카피 모드 — 사용자 명시 옵트인 전용**. 슬라이드 페이지 통째 PNG + `_blank` layout. 텍스트 복사·검색·접근성 손상 trade-off 감수가 필요한 시각 SSOT 보존 케이스에만 사용 |

# 변환 모드

| 모드 | 트리거 | 동작 |
| :--- | :--- | :--- |
| `md_first` (기본) | 인자 없음 | pptx2md + python-pptx + SmartArt XML 직접 파싱으로 의미 단위 마크다운 재구성. 텍스트 추출 실패 슬라이드는 `_proposals/`에 "수동 마크다운 작성 필요" 기록 (PNG 자동 생성 금지) |
| `copy` | `--copy` 플래그 명시 | libreoffice 슬라이드 PNG fallback 활성화. 텍스트 추출 빈약 슬라이드를 PNG 풀스크린으로 보존 |

**자동 승격 금지**: agent는 처리 도중 "텍스트가 빈약하니 PNG로" 같은 자체 판단으로 카피 모드 승격 불가. `--copy` 플래그 명시한 경우에만 활성화. 상세: [`../../data/ppt2m2slide/heuristics.yml conversion_mode`](../../data/ppt2m2slide/heuristics.yml)

# 동작

`ppt2m2slide` agent를 dispatch합니다. agent는 다음 6단계를 순차 수행:

1. **pptx2md 호출** — raw markdown + 이미지 추출
2. **PPT 메타 수집** — python-pptx로 슬라이드별 메타 추출 → `_pipeline/ppt-meta.yml`
3. **layout 판정** — heuristics.yml 기준 `#layout-*` 디렉티브 주입
4. **SmartArt → htmlart 변환** — mappings.yml 기준. 실패 시 `_proposals/` 기록
5. **palette 매칭** — PPT theme 색상 → palette 카탈로그 ΔE 비교. 실패 시 `_proposals/` 기록
6. **mode 판정 + 산출물 생성** — chapter (AGENDA.md + 다중 .md) 또는 single (.md 1개)

체크포인트 3개 (메타 검토 / 매핑 검토 / 빌드 직전)에서 사용자 승인 대기.

# 산출물

| 경로 | 내용 |
| :--- | :--- |
| `Projects/<Name>/` | 새 m2slide 프로젝트 디렉토리 |
| `Projects/<Name>/Info.md` | skeleton (사용자 후속 작성) |
| `Projects/<Name>/_config.yml` | theme·palette·mode 설정 |
| `Projects/<Name>/markdown/AGENDA.md` 또는 `<Name>.md` | mode별 슬라이드 소스 |
| `Projects/<Name>/img/` | 추출 이미지 |
| `data/_proposals/<Name>-YYYY-MM-DD.md` | 카탈로그 업데이트 후보 보고서 |

# 사용 예시

## 기본 변환 (auto mode, 체크포인트 활성)

```
/ppt2m2slide ~/Desktop/강의자료.pptx
```

* 프로젝트 이름은 PPT 파일명 sanitize (`강의자료` → `gangui-jaryo`)
* mode는 슬라이드 수 + H1 분포로 자동 판정

## 프로젝트 이름 명시 + chapter mode 강제

```
/ppt2m2slide slides.pptx llm-lecture --mode chapter
```

## CI 자동 변환 (체크포인트 미사용)

```
/ppt2m2slide slides.pptx --no-checkpoint
```

## 카피 모드 (시각 SSOT 우선, 텍스트 손상 감수)

```
/ppt2m2slide slides.pptx --copy
```

* 슬라이드 페이지 통째 PNG 풀스크린 배치. 텍스트 복사 안 됨
* PDF만 있고 PPTX 원본 없는 시각 자산·표지·복잡 다이어그램 보존이 절대 우선인 경우에만 사용

# 사전 조건

* `pptx2md` 설치 (`uv tool install pptx2md` 또는 `pip install pptx2md`)
* `python-pptx` 설치 (`pip install python-pptx`)
* `libreoffice` 설치 권장 (SmartArt SVG 추출용. 미설치 시 placeholder)

# 결과 확인

* 변환 완료 후 자동으로 빌드 단계 진입 (체크포인트 3 승인 시)
* 빌드 후 브라우저에서 `Projects/<Name>/slide/index.html` (chapter) 또는 단일 HTML 자동 열림
* `data/_proposals/<Name>-YYYY-MM-DD.md` 검토 후 사용자가 카탈로그 수동 머지

# 관련 문서

* 설계 SSOT: [`../../_doc_arch/ppt2m2slide.md`](../../_doc_arch/ppt2m2slide.md)
* agent 본체: [`../agents/ppt2m2slide.md`](../agents/ppt2m2slide.md)
* 카탈로그: [`../../data/ppt2m2slide/heuristics.yml`](../../data/ppt2m2slide/heuristics.yml), [`../../data/ppt2m2slide/mappings.yml`](../../data/ppt2m2slide/mappings.yml)
* forward pipeline 진입점: [`m2.md`](m2.md)
