---
name: Info
description: <PROJECT_NAME> 프로젝트 기획 메타
date: <YYYY-MM-DD>
# 덱 목적 — 정책 적용 강도 스코프 (Issue295). 기계 판독 canonical 위치.
# lecture(가장 엄격·기본) | info | promo | handout | archive. 미기재 시 lecture 간주.
# 단일: `purpose: lecture` / 복합: {primary: <1개>, secondary: [<N개>]} (primary 가 강도 결정)
purpose:
  primary: lecture
  secondary: []
---

# 주제

<1줄 요약>

# 청중

<대상 청중 + 전제 지식 수준>

# 분량

<NN 분>

# 스타일

<강의 | 내레이션 | 대화 | 튜토리얼 | 기타>

# 학습 목표

* <목표 1>
* <목표 2>
* <목표 3>

# 참고자료 후보

* <키워드 1>
* <키워드 2>

# 데드라인

<YYYY-MM-DD>

# 빌드 옵션

* mode: auto                # single | chapter | auto (auto: duration ≥30분 + goals ≥5개 → chapter)
* theme: default            # theme/{name}/ 디렉토리
* theme_default_layout: contents
* cover_enabled: true      # 첫 슬라이드 cover 자동 주입
* cover_layout: _cover      # cover_enabled=true일 때 적용
* markmap_depth: 2          # TOC 마인드맵 초기 펼침 깊이

# 미디어 계획

* media_mermaid: true       # mermaid 다이어그램
* media_excalidraw: false   # excalidraw 다이어그램
* media_infographic: false  # HTML infographic
* media_demo_video: false   # 시연 영상 삽입 (수동 녹화)
* design_mood:              # 슬라이드 전반의 그래픽 디자인 톤 (ex: 라이트 테마, 밝은 분위기, 파스텔 컬러)
* image_style:              # AI 이미지 톤·스타일 가이드 (선택)

# 산출물 계획

* output_html: true         # Reveal.js HTML 슬라이드 (단계 8)
* output_epub: false        # EPUB 전자책 동시 생성 (단계 8)
* output_subs_txt: false    # 자막용 .txt (단계 9, md2subs)
* output_tts_txt: false     # TTS 합성용 .tts.txt (단계 9, txt2tts — output_subs_txt 전제)

# TTS 텍스트 규칙

`.tts.txt` 콘텐츠 정책. 상세 설계는 [`_doc_arch/info.md`](../_doc_arch/info.md) "TTS 텍스트 규칙" 절 참조.

* narration_policy:
    - image: <ex: 이미지 위에 한 줄 도입부>
    - table: <ex: 표 직전에 핵심 결론 1문장>
    - code: <ex: 코드 의도만 자연어로>
    - diagram: <ex: 흐름 3~5문장으로 풀어쓰기>
    - url: <ex: "자세한 내용은 자막 참고">
* extra_narration:
    - <챕터.슬라이드 또는 제목> → <추가 내레이션>
* exclude:
    - <ex: 코드 블록>
    - <ex: 발표자 노트>
