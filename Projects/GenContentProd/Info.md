---
title: GenContentProd_v1.1 (AI Prompt Engineering으로 시작하는 AI기반 문서작성 실습)
description: ppt2m2slide md_first 재변환 산출물. 사용자 후속 작성 영역.
date: 2026-05-27
---

# 강의 개요

* 강사: 남중구 (핀프라)
* 연락처: nowage@gmail.com
* 버전: v1.1
* 원본 PPT: `Projects/_ppt/GenContentsProd_v1.0/GenContetntsProd_v1.0.pptx`
* 총 슬라이드: 약 100장 (PPT cover_root prepend 포함, chapter mode 14 챕터)

# 변환 모드

* **md_first 모드** — 텍스트·이미지 의미 단위 재구성 (카피 모드 아님)
* `auto_layout_detect: true` 로 image-only 슬라이드만 `_blank` 자동, 본문 슬라이드는 `_contents` (텍스트 검색·복사 가능)
* PNG 풀스크린 자동 fallback 금지 — `_proposals/GenContentProd_v1.1-2026-05-27.md` 의 "수동 마크다운 작성 필요" 섹션 참조

# 후속 작업 가이드
* 시연해보고 중요 스크린 샷 추가.
* `markdown/*.md` 의 텍스트·bullet 위계가 PPT 원본과 다르면 수정
* 이미지 alt 텍스트 (현재 H1 제목으로 자동 채움) 의 구체화
* `_proposals/` 의 수동 작성 필요 슬라이드 보완
* `markdown/AGENDA.md` frontmatter 확인 후 release_date·version 관리

# _pipeline/img-fullext 원본 이미지 외부 이관 (2026-07-03)
* `_pipeline/img-fullext/`(ppt2md 원본 추출 이미지, 42개·11M)를 로컬에서 삭제하고 `finfra.kr:/nowage/www/f/m2slide/GenContentProd/img-fullext/` 로 이관
* 접근 URL: `https://finfra.kr/f/m2slide/GenContentProd/img-fullext/<파일명>` (예: `s83_i1.png`)
* `_pipeline/`는 git 미추적(`.gitignore`) 스크래치 산출물 — repo push 용량 절감 목적
* 발행 슬라이드(`img/`, `slide/img/`)에 쓰이는 사본은 그대로 로컬·git 유지 — 이번 이관은 원본 풀사이즈 추출본에만 해당
* **⚠️ 단독망(에어갭) 환경 주의**: git clone만으로는 이 폴더가 복원되지 않음(애초에 git 미추적). 인터넷 차단 환경에서 원본 풀사이즈 이미지가 필요하면 clone 전에 `finfra.kr`에서 미리 로컬로 내려받아 `_pipeline/img-fullext/`에 배치할 것. 또는 `Projects/_ppt/GenContentsProd_v1.0/GenContetntsProd_v1.0.pptx` 원본에서 `python3 lib/ppt-images-extract-all.py`로 재추출 가능(원본 PPT는 git 미추적이므로 이것도 별도 반입 필요)

