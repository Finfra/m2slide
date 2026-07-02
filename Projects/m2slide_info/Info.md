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

챕터 8개 (읽기 기준 약 30분)

# 스타일

설명 자료 — 문어체·객관 서술. 강연 표현(여러분·오늘·실습) 배제. 배포 후 독립적으로 읽히는 참고 문서 성격.

# 학습 목표

* m2slide가 무엇인지, 기존 PPT·Reveal.js 직접 작성 대비 어떤 이점이 있는지 이해
* chapter mode(AGENDA.md + 챕터별 HTML) 기반 프로젝트 구조를 파악하고 직접 시작할 수 있음
* theme / layout 시스템으로 슬라이드 외관을 코드 없이 조정하는 방법을 익힘
* 내장 컴포넌트(chart.js·d3·react·p5·model3d·cards·htmlArt)를 마크다운 펜스드 블록으로 작성하는 방법을 알게 됨
* EPUB 동시 생성, dev-server 실시간 미리보기, authoring-pipeline 워크플로우를 이해

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

chapter mode 기준.

```
00. Cover (자동 주입)
01. m2slide란? — 소개·포지셔닝·기존 도구 대비 장점
02. 빠른 시작 — 설치·프로젝트 생성·첫 빌드
03. 마크다운 작성 규칙 — 슬라이드 구분자·헤더 컨벤션·AGENDA.md
04. theme / layout 시스템 — _config.yml 설정·layout override·cover
05. 내장 컴포넌트 — chart/d3/react/p5/model3d/cards/htmlArt (실제 렌더 예시)
06. EPUB & 산출물 — HTML + EPUB + PDF/PPTX 동시 생성·배포
07. authoring-pipeline — 단계 1~9 워크플로우·dev-server
08. 마무리 — 핵심 요약·링크
```

# 특이 사항

1. **컨셉 이력**: 초기 기획은 시연 중심 쇼케이스(촬영 영상 + 스크린샷)였으나, m2slide 도구 자체 소개(설명용)로 컨셉 변경. 촬영 시나리오·video 임베드·스크린샷 placeholder는 전부 제거함.
2. **Dogfooding**: 컴포넌트 챕터(05)는 외부 이미지 대신 chart·d3·react·p5·cards·htmlArt 블록을 실제로 렌더하여 기능 자체가 예시가 되도록 구성.
3. **신규 작성**: 기존 `Projects/m2Slide`(브로셔용) 챕터를 복사하지 않고 별도 작성. 브로셔용(m2Slide)과 설명용(m2slide_info)의 역할 분리 유지.
