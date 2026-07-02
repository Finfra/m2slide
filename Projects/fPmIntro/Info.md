---
name: Info
description: fPmIntro 프로젝트 기획 메타 — fPM(prj7, 원본 prj1) 소개 PPT
date: 2026-06-30
---

# 주제

fPM(finfra Project Manager, prj7 / 원본 prj1 = `~/_git/___pm`) — Claude Code 기반 다중 프로젝트 관리·자동화 프레임워크를 Claude 사용자에게 소개하는 고품질 프레젠테이션.

# 청중

Claude Code 사용자. 전제: Claude Code의 기본 사용(프롬프트·도구 호출)에는 익숙하나, SCAR(Skill/Command/Agent/Rule)·hub·다중 프로젝트 오케스트레이션 같은 fPM 고유 체계는 처음 접하는 수준. 자동화·생산성 향상에 관심.

# 분량

30 분

# 스타일

튜토리얼 (시연 중심 — 실제 동작을 영상·스크린샷으로 보여주는 데모형 소개)

# 학습 목표

* fPM이 무엇이고 일반 Claude Code 사용과 어떻게 다른지 이해한다
* hub 모드(HTML 렌더·실시간 대시보드·Q&A 폼·SSE 모니터링)의 동작과 가치를 체감한다
* VSCode ↔ 대시보드 연동(Simple Browser 패널·세션 포커스·프로젝트 열기)의 워크플로우를 본다
* 다중 프로젝트 관리(레지스트리·번호→경로 SSOT·크로스 prj 의존성/pm-do 위임)를 이해한다
* 자신의 환경에 fPM을 도입할 첫 단계를 안다

# 참고자료 후보

* fPM hub 모드 아키텍처 (hub-mode-arch / hub_htm)
* fPM 대시보드 agent (Mode C / board)
* VSCode finfra.fpm-simple-browser 확장 연동
* 다중 프로젝트 레지스트리 + 번호→경로 SSOT
* pm-do 크로스 프로젝트 위임 + depends 의존성
* SCAR 3-tier 레이어링 (-g/-m/-w)
* nPTiR 개발 사이클 (needs→Plan→Task→issue→Report)

# 데드라인

TBD

# 빌드 옵션

* mode: chapter             # 30분 + 목표 5개 → chapter 모드 확정
* theme: default
* theme_default_layout: contents
* cover_enabled: true
* cover_layout: _cover
* markmap_depth: 2

# 미디어 계획

* media_mermaid: true       # 아키텍처·흐름 다이어그램 (hub 요청→렌더, pm-do 위임 흐름 등)
* media_excalidraw: false
* media_infographic: false
* media_demo_video: true    # 시연 영상 — 사용자가 직접 촬영(시나리오는 본 파이프라인이 제공)
* media_screenshot: true    # 스크린샷 다수 — hub 렌더·대시보드·VSCode 패널 실제 화면
* design_mood: 라이트 테마, 깔끔하고 간결한 레이아웃, 기능·구조 위주 (장식 최소)
* image_style: 실제 스크린샷 우선, 보조 다이어그램은 단색 계열 미니멀

# 산출물 계획

* output_html: true
* output_epub: false
* output_subs_txt: false
* output_tts_txt: false

# 미디어 특이사항 (fPmIntro 고유)

본 데크는 일반 슬라이드 대비 **시연 영상**과 **스크린샷**이 자주 등장하는 미디어 중심 구성.

* **영상**: 사용자가 직접 촬영. 본 파이프라인(단계 5 media-creater)이 각 영상마다 **촬영 시나리오**(장면·조작 순서·강조 포인트·예상 길이)를 작성해 제공 → 사용자가 그에 맞춰 녹화 후 `img/`(또는 `video/`)에 배치.
* **스크린샷**: hub 렌더 결과·실시간 대시보드·VSCode Simple Browser 패널·세션 포커스·프로젝트 열기 등 실제 화면. 캡처 목록도 단계 5에서 명세.
* 슬라이드 본문(단계 4)은 영상/스크린샷 placeholder 위치를 먼저 잡고, 단계 5에서 실제 미디어·시나리오로 채움.

# TTS 텍스트 규칙

* narration_policy:
    - image: 스크린샷 위 한 줄 도입부
    - table: 표 직전 핵심 결론 1문장
    - code: 코드 의도만 자연어로
    - diagram: 흐름 3~5문장으로 풀어쓰기
    - url: "자세한 내용은 자막 참고"
* extra_narration:
* exclude:
    - 발표자 노트
