---
title: Projects 목록
description: m2slide Projects/ 하위 프로젝트 리스트 및 간단 설명
date: 2026-07-02
tags: []
---
# 개요

`Projects/` 하위 각 프로젝트는 독립 폴더 구조(`markdown/`, `slide/`, `_config.yml`, `VERSION`)로 관리됨. 빌드는 `./m2slide.sh <ProjectName>`.

마크다운 작성 규칙은 [MARKDOWN-GUIDE.md](./Projects/MARKDOWN-GUIDE.md) 참조.

# 활성 프로젝트

| 프로젝트                  | 버전 | 설명                              | Manual Check | publishing | 작업                                  |
| :------------------------ | :--- | :-------------------------------- | :----------- | :--------- | :------------------------------------ |
| AgenticCoding             | 1.1  | 에이전틱 코딩 강연 자료           | 개발필요     |            | 많이 부족 설계 새로 하고 있음 강의용. |
| aTest                     | 1    | 테스트용 프로젝트                 | n/a          | x          |                                       |
| BasicKnowledgeForAI_small | 0.9  | AI 기초 지식 (축약본)             | O            |            |                                       |
| fPmIntro                  | 0.9  | fPM 소개                          | O            |            |                                       |
| GenContentProd            | 1.1  | 콘텐츠 생성 프로덕션              |              |            |                                       |
| graphify                  | 0.9  | graphify 지식 그래프 소개         |              |            |                                       |
| LlmAndVibeCoding          | 2    | LLM 툴 진화·바이브 코딩 세대 구분 | O            |            |                                       |
| LlmFlow                   | 1.0  | LLM 처리 흐름                     |              |            |                                       |
| m2Slide                   | 0.9  | m2slide 도구 자체 소개            |              |            |                                       |
| m2Slide_visual_component  | 1.0  | 시각 컴포넌트 데모                |              |            |                                       |
| m2slideShowcase           | 0.9  | 기능 쇼케이스                     |              |            |                                       |
| m2SlideStyle1_single      | 0.9  | 단일 페이지 모드 대표 (테스트)    |              |            |                                       |
| m2SlideStyle2_chapter     | 0.9  | 다중 챕터 모드 대표 (테스트)      |              |            |                                       |
| MermaidExample            | 0.9  | Mermaid 다이어그램 예제           |              |            |                                       |

# 메타 · 특수 폴더

| 폴더                | 용도                               |
| :------------------ | :--------------------------------- |
| `_ppt`              | ppt2m2slide 역변환 템플릿          |
| `z_just_test`       | 임시 테스트                        |
| `z_done/`           | 완료·아카이브 (버전 접미사 복원됨) |
| `MARKDOWN-GUIDE.md` | 슬라이드 마크다운 작성 가이드      |

# 참고

* 버전 SSOT: `Projects/<Name>/VERSION` 파일 (폴더명은 무버전)
* z_done 이동 시 `<Name>_v<VERSION>` 형태로 버전 복원 (`.claude/rules/project-version-rules.md`)
* 빌드: `./m2slide.sh <ProjectName>` / 실행: `/run <ProjectName>`
