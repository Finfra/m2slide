---
name: Info
description: m2Slide_visual_component_v1.0 프로젝트 기획 메타
date: 2026-06-28
---

# 주제

m2slide 시각적 구성요소 전체(27종 htmlArt 포함) 쇼케이스 겸 회귀 테스트 데크 — 각 요소의 저작 문법·렌더 백엔드·구현 품질 최고치를 live demo로 확인

# 청중

m2slide 개발자 및 콘텐츠 저작자. 전제 지식: m2slide 기본 사용 경험, 마크다운 슬라이드 저작 이해. 외부 발표용 아님 — 내부 회귀 테스트·품질 확인 목적.

# 분량

자기 주도 탐색형 (강의 시간 없음) — 슬라이드 수 기준으로 챕터별 독립 탐색. 분량 측정 불요.

# 스타일

튜토리얼

# 학습 목표

* m2slide에서 사용 가능한 시각적 구성요소 전체(텍스트·구조·라이브러리·비라이브러리·htmlArt 27종)를 한 데크에서 확인
* 각 구성요소의 저작 문법(마크다운 입력)과 렌더 결과를 나란히 검증
* 렌더 백엔드(라이브러리 이름·버전·CDN 조건 주입 방식)를 슬라이드에서 직접 확인
* 구현 품질(레이아웃 깨짐·오버플로우·색상 일관성)의 현 최고치 기준선 확립
* htmlArt 27종 전부를 동일 형식으로 비교·회귀 테스트
* 신규 구성요소 추가 시 본 데크를 기준 삼아 regression 판정

# 참고자료 후보

* _doc_arch/component-slide-visual.md — 시각적 구성요소 통합 인덱스 (내부 SSOT)
* data/htmlart/types.yml — htmlArt 27종 타입 정의 (내부 SSOT)
* data/component-libraries.yml — 라이브러리 메타·CDN·detect 신호 (내부 SSOT)
* .claude/rules/md-m2slide-rules.md — 저작 문법 규칙 (내부 SSOT)
* _doc_arch/htmlArt_list.md — htmlArt 타입별 구현 현황
* _doc_arch/animation.md — 애니메이션·전환 효과 SSOT

# 데드라인

미정

# 빌드 옵션

* mode: chapter              # 요소 범주가 많아 챕터 분리. 자동 판정 override
* theme: default_lec         # 강의용 공식 테마 (구성요소 렌더 검증에 적합)
* theme_default_layout: contents
* cover_enabled: false       # 내부 테스트 데크 — 커버 불필요
* markmap_depth: 2           # TOC 마인드맵 초기 펼침 깊이

# 미디어 계획

* media_mermaid: true        # mermaid 다이어그램 (챕터 ② 포함)
* media_excalidraw: false
* media_infographic: true    # d3 인포그래픽 (챕터 ③ 포함)
* media_demo_video: false
* design_mood: 다크 테마 기반, 구성요소 렌더 결과가 선명히 보이는 고대비 배경
* image_style:               # AI 이미지 미사용 (live demo 슬라이드가 메인)

# 산출물 계획

* output_html: true          # Reveal.js HTML 슬라이드 (단계 8) — 본 데크의 유일 목표
* output_epub: false         # 회귀 테스트 목적 — EPUB 불필요
* output_subs_txt: false     # TTS/영상 렌더링 불필요 (시각 컴포넌트 테스트 데크)
* output_tts_txt: false      # 동일 이유 — 단계 9 생략

# TTS 텍스트 규칙

output_tts_txt: false — 본 섹션 비활성 (TTS/영상 렌더링 불필요).

# 챕터 구성 (agenda-designer 참고용)

본 데크는 아래 6챕터로 구성 권장. 각 챕터 내 슬라이드 구조:
- **설명 슬라이드**: 구성요소 정의, 저작 문법, 렌더 백엔드, 라이브러리 버전
- **구현 슬라이드**: 실제 동작하는 live demo 예제 (1개 이상)

챕터 목록:
1. 텍스트·구조 요소 — 표, 코드블록, 카드(`::: cards`), 레이아웃·멀티컬럼(`::: columns`/`::: rows`/`::right::`/슬롯), markmap TOC
2. 라이브러리 다이어그램·수식·심벌 — mermaid, plantuml/dot(Kroki), KaTeX(`$$`·`\(`), Font Awesome(`:fa-name:`)
3. 차트·지도·인포그래픽 — Chart.js(` ```chart`), Leaflet(` ```map`), d3(` ```d3`)
4. React·WordArt·3D·Simulation — React artifact(` ```react`), WordArt(` ```wordart`), model3d(` ```model3d`), p5.js(` ```p5`)
5. htmlArt 27종 전부 — process/cycle/hierarchy/pyramid/timeline/venn/matrix/target/funnel/gear/radial/chevron/step/arrow/numbered/hexagon/bracket/block/tab/pie/balance/compare/explain/workflow/bend_process/annotate/callout
6. 이미지·애니메이션·이모지 — 이미지(![alt]()), 전환(`#transition-*`), 단계 등장(`{.fragment}`·`<!-- .element: -->`), 자동 재생(`#auto-animate`/`#autoslide-*`), 이모지
