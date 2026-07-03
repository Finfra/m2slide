---
name: slide-tuner
description: m2slide 프로젝트 슬라이드를 페이지별로 캡처해 카드별 자유 텍스트 주석 폼으로 제시하고, 회수한 피드백을 분류→md 수정→재빌드→재확인 반복하는 slide-tuner agent의 슬래시 진입점. 원본 PDF/PPTX가 있으면 side-by-side 비교, 없으면 슬라이드 단독 검토.
date: 2026-06-28
---

# 사용법

```
/slide-tuner <project> [--pdf <path>] [--batch <N>] [--max-rounds <N>] [--mode init|batch|end] [--reset]
```

# 인자

| 인자 | 필수 | 기본값 | 설명 |
| :--- | :--: | :--- | :--- |
| `<project>` | 필수 | — | `Projects/<Name>` 또는 `<Name>` |
| `--pdf <path>` | 선택 | `Projects/_ppt/<Name>.pdf` | 원본 PDF 경로. 없으면 슬라이드 단독 검토 |
| `--batch <N>` | 선택 | 20 | 한 폼당 카드(페이지) 수. init·end 모드는 10 고정 |
| `--max-rounds <N>` | 선택 | 5 | 수정-재확인 반복 라운드 상한 |
| `--mode <m>` | 선택 | 자동 | `init`(첫 10 정렬 검증) / `batch`(HWM 20개) / `end`(마지막 10) |
| `--reset` | 선택 | off | HWM=1 클리어 후 batch 진행 |

자연어 트리거: "처음부터" = `--reset`, "끝부분"·"마지막" = `--mode end`.

# 모드 (HWM 기반 페이지 진행)

| 모드 | 트리거 | 범위 | 진행 후 HWM |
| :--- | :--- | :--- | :--- |
| `init` | 첫 시작(HWM 파일 미존재) 또는 `--mode init` | 1~10 (페어링 검증) | 11 |
| `batch` | 기본(HWM 존재) | HWM ~ HWM+batch-1 | HWM + batch |
| `end` | `--mode end` / "끝부분" | 마지막 10장 | 변경 없음 |
| `reset` | `--reset` / "처음부터" | 1 ~ batch | 1 + batch |

* HWM 파일: `_doc_work/tuner/<project>/hwm.yml` — 다음에 보여줄 global 슬라이드 인덱스 기억(이어보기)
* HWM ≥ total → "전부 완료" 보고 + `--reset` / `--mode end` 선택지 제시

# 동작

`slide-tuner` agent를 dispatch합니다. agent는 10 step을 순차 수행하며, 각 step 완료 후 사용자 컨펌을 받습니다.

1. 캡처 + 페어링 — `slide-compare` 스킬 위임 (dev-server + Playwright 캡처 + pairing.yml + 폼 HTML)
2. side-by-side(또는 slide-only) review 폼 생성 — 카드별 자유 텍스트 주석란 + "정상" 체크박스
3. 폼 "전송" → htm-server inbox POST → 피드백 회수
4. 4종 분류: `ok_checked` / `md_literal_needed` / `text_diff` / `novel`
5. md 단순 수정 + 재빌드 + 재확인
6. 다음 배치(HWM)로 반복 (최대 `--max-rounds`)
7. (Step 9·10) 피드백 집계 → `data/_proposals/` promotion 후보 생성 → 사용자 컨펌 후 머지

# 원본 PDF 유무

| 상황 | 동작 |
| :--- | :--- |
| `--pdf` 제공 또는 `Projects/_ppt/<Name>.pdf` 존재 | 원본 ↔ 빌드 슬라이드 side-by-side 비교 |
| 원본 없음 (저작 데크) | 슬라이드 단독 캡처 + 주석 폼 (원본 컬럼 생략) |

* 더미 PDF 자동 생성 금지. 무원본이면 단독 검토로 진행

# 사용 예시

```
/slide-tuner visual_component_v1.0                  # init 모드, 첫 10장
/slide-tuner visual_component_v1.0 --mode end       # 마지막 10장
/slide-tuner visual_component_v1.0 --reset          # 처음부터
/slide-tuner mylecture --pdf ~/Desktop/원본.pdf      # 원본 비교
```

# 사전 조건

* dev-server 가동 (`./m2slide.sh --serve start` — 빌드 시 자동)
* 빌드 완료된 `slide/*.html` 존재
* htm-server(피드백 회수용) 가동 권장 — 미가동 시 폼은 생성되나 자동 회수 불가

# 관련 문서

* agent 본체: [`../agents/slide-tuner.md`](../agents/slide-tuner.md)
* 설계 SSOT: [`../../_doc_arch/slide-tuner.md`](../../_doc_arch/slide-tuner.md)
* 공유 review 스킬: [`../skills/slide-compare/SKILL.md`](../skills/slide-compare/SKILL.md)
* 정책: [`../../data/slide-tuner/patterns.yml`](../../data/slide-tuner/patterns.yml)
* forward pipeline 진입점: [`m2.md`](m2.md)
