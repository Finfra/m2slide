---
name: Info
description: m2slide_info 프로젝트 기획 메타
date: 2026-06-30
---

# 주제

m2slide 도구 자체 소개(설명용) — Markdown → Reveal.js 슬라이드 저작 도구 m2slide의 정체성·프로젝트 구조·핵심 기능·워크플로우를 독립적으로 읽을 수 있는 설명 자료로 정리

# 청중

m2slide 잠재 사용자 — 개발자·기술 발표자·교육자. 마크다운 기본 문법 이해 수준. Reveal.js·PPT 도구 사용 경험 있으면 좋지만 필수 아님.

# 분량

챕터 5개 (읽기 기준 약 15분)

# 스타일

설명 자료 — 문어체·객관 서술. 강연 표현(여러분·오늘·실습) 배제. 배포 후 독립적으로 읽히는 참고 문서 성격.

# 학습 목표

* m2slide가 무엇인지 한 줄로 설명할 수 있음
* PPT·순수 Reveal.js 대비 m2slide가 **왜** 필요한지 이해
* 강의·발표·사내 문서·PPT 이관 등 **어디에** 쓰면 좋은지 판단할 수 있음
* 내장 컴포넌트·멀티포맷 산출·file:// 배포·PPT 양방향 변환·AI 저작 파이프라인 등 m2slide의 **강점**을 파악
* 사용법(설치·빌드 명령·마크다운 문법)은 본 자료 범위 밖 — README·저작 파이프라인 문서로 안내

# 참고자료 후보

* m2slide GitHub / README
* Reveal.js 공식 문서
* m2slide CLAUDE.md·_doc_arch 설계 문서
* 실제 Projects/ 하위 예시 프로젝트 (AgenticCoding, m2Slide 등)

# 데드라인

2026-07-31

# 빌드 옵션

* mode: chapter              # chapter mode 확정 (AGENDA.md + 챕터별 HTML)
* theme: default_lec         # 강의용 공식 테마
* theme_default_layout: contents
* cover_enabled: true        # 첫 슬라이드 cover 자동 주입
* cover_layout: _cover
* markmap_depth: 2           # TOC 마인드맵 초기 펼침 깊이

# 미디어 계획

* media_mermaid: true        # 파이프라인 흐름도·구조도
* media_excalidraw: false
* media_infographic: true    # htmlArt/cards/d3 컴포넌트 자체 렌더 예시 (도구 기능 dogfooding)
* media_demo_video: false    # 컨셉 변경(설명용)으로 촬영 데모 폐기
* design_mood: 다크 계열 기술 테마, 코드·터미널 느낌, 슬레이트 배경에 밝은 강조색
* image_style: minimal tech illustration, dark background, cyan/teal accent

# 산출물 계획

* output_html: true          # Reveal.js HTML 슬라이드 (단계 8) — 필수
* output_epub: true          # EPUB 전자책 동시 생성 — m2slide 기능 자체 시연 겸 배포용
* output_subs_txt: false     # 자막용 .txt 불필요
* output_tts_txt: false      # TTS 합성 불필요

# TTS 텍스트 규칙

output_tts_txt: false이므로 적용 안 함.

# 챕터 구성

chapter mode 기준. how-to(문법·설정 키 전수)는 배제하고 why/where/strengths 중심 + 실체 증빙용 최소 설치·데모 링크만 포함.

```
00. Cover (자동 주입)
01. m2slide란? — 정체성 한 줄 정의, 세 가지 질문, 설치 예시 2줄 + GitHub·온라인 데모 링크
02. 왜 필요한가 — PPT·순수 Reveal.js의 한계, m2slide가 메우는 빈틈
03. 어디에 쓰면 좋은가 — 강의·발표·사내 문서·PPT 이관 등 활용 시나리오
04. m2slide의 강점 — 내장 컴포넌트·멀티포맷 산출·file:// 배포·PPT 양방향 변환·AI 저작 파이프라인
05. 마무리 — 핵심 요약·다음 걸음·상세 소개(m2Slide 브로셔) 링크
```

# 특이 사항

1. **컨셉 이력**: 초기 기획은 시연 중심 쇼케이스(촬영 영상 + 스크린샷)였으나, m2slide 도구 자체 소개(설명용)로 컨셉 변경. 촬영 시나리오·video 임베드·스크린샷 placeholder는 전부 제거함.
2. **2차 컨셉 변경 (2026-07-03)**: 8챕터 how-to 구성(빠른 시작·마크다운 규칙·theme/layout·EPUB 산출·authoring-pipeline 상세)을 폐기하고, 처음 접하는 사람을 위한 5챕터 why/where/strengths 소개 자료로 재구성. 사용법은 README·저작 파이프라인 문서로 위임.
3. **Dogfooding 최소 유지**: 04챕터(강점)에 chart.js 예시 1건만 남겨 "내장 컴포넌트가 실제로 작동함"을 보여주되, 컴포넌트 전수 카탈로그는 다루지 않음.
4. **신규 작성**: 기존 `Projects/m2Slide`(브로셔용) 챕터를 복사하지 않고 별도 작성. 브로셔용(m2Slide)과 설명용(m2slide_info)의 역할 분리 유지.
5. **이미지 삽입 보류 (2026-07-03)**: `_doc_work/capture/z_old/` 회귀 캡처 4장(카드 카탈로그·피라미드 인포그래픽·353슬라이드 강의 TOC·실제 기술 강의 슬라이드)을 후보로 제시했으나 사용자가 전부 거절. 대신 "쉽고 편함"을 보여주는 설치·빌드 2줄 예시 + GitHub·온라인 데모(finfra.github.io/m2slide) 링크(01챕터)와, 마무리(05챕터)에 상세 소개(`finfra.github.io/m2slide/m2Slide/index.html`) 링크를 추가하는 방향으로 대체함. 이미지 삽입은 이후 별도 요청 시 재검토.
