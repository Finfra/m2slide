---
title: Projects 목록 (공개)
description: m2slide Projects/ 하위 공개 프로젝트 목록 (publishing=o)
date: 2026-09-28
tags: []
---
# 개요

공개 저장소(GitHub)에 동기화되는 프로젝트만 나열. 전체 목록·내부 메모는 로컬 전용 `Projects.md` 참조(gitignored).

⚠️ 본 파일은 `./m2slide.sh --sync-projects` 가 `Projects.md` 에서 자동 파생 — 직접 편집 금지.

# 프로젝트

| 분류 | 프로젝트                 | 버전 | 설명                       |
| :--- | :----------------------- | :--- | :------------------------- |
| m2   | m2Slide                  | 1.0  | m2Slide 소개               |
| m2   | m2Slide_en               | 1.0  | Meet m2Slide               |
| m2   | m2slide_info             | 1.0  | m2Slide란? (설명용)        |
| m2   | m2slide_info_en          | 1.0  | What is m2slide?  (설명용) |
| m2   | m2Slide_visual_component | 1.1  | 시각 컴포넌트 데모         |
| m2   | m2Slide_MermaidExample   | 1.0  | Mermaid 다이어그램 예제    |
| app  | fPmIntro                 | 1.0  | fPM 소개                   |
| app  | fPmIntro_en              | 1.0  | fPM 소개 영문판            |
| app  | n3shIntro                | 1.1  | n3sh 세벌식 속기 확장 소개 |

# m2slide-deck 으로 이전된 프로젝트

아래 프로젝트의 원고는 [m2slide-deck](https://github.com/Finfra/m2slide-deck) 저장소로 이전됨. 이 저장소의 `Projects/` 에는 없으며, 발행본(GitHub Pages)은 그대로 [목록](https://finfra.github.io/m2slide/)에서 볼 수 있음.

| 분류 | 프로젝트                  | 버전 | 설명                              | 원고 위치                                                                                                                               |
| :--- | :------------------------ | :--- | :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| lec  | BasicKnowledgeForAI_small | 1.0  | AI과정 부록 - 기초 지식편         | [decks/education/BasicKnowledgeForAI_small](https://github.com/Finfra/m2slide-deck/tree/main/decks/education/BasicKnowledgeForAI_small) |
| lec  | LlmAndVibeCoding          | 2.1  | LLM 툴 진화·바이브 코딩 세대 구분 | [decks/education/LlmAndVibeCoding](https://github.com/Finfra/m2slide-deck/tree/main/decks/education/LlmAndVibeCoding)                   |
| lec  | GenContentProd            | 1.2  | 콘텐츠 생성 프로덕션              | [decks/education/GenContentProd](https://github.com/Finfra/m2slide-deck/tree/main/decks/education/GenContentProd)                       |
| lec  | AgenticCoding             | 1.1  | 에이전틱 코딩 강연 자료           | [decks/education/AgenticCoding](https://github.com/Finfra/m2slide-deck/tree/main/decks/education/AgenticCoding)                         |
| Info | graphify                  | 0.9  | graphify 지식 그래프 소개         | [decks/education/graphify](https://github.com/Finfra/m2slide-deck/tree/main/decks/education/graphify)                                   |
| etc  | StellarEvolution          | 1.0  | 항성의 진화 — 3D·시뮬레이터 강연  | [decks/education/StellarEvolution](https://github.com/Finfra/m2slide-deck/tree/main/decks/education/StellarEvolution)                   |

## 이모지 범례

dev-server(`./m2slide.sh --serve start`) 구동 후 [http://jm4.local:9877/p/](http://jm4.local:9877/p/) 접속 시 아래 이모지가 카드에 반영된 형태로 확인 가능함(전체 목록 기준 — 이 문서는 그중 공개분만).

* 분류: 📢 PR · ℹ️ Info · 🎓 lec · 🧩 m2 · 🧪 test · 📁 그 외
* 🏷️ 버전 · 📝 설명
* 본 문서 수록 프로젝트는 모두 🌐 공개(publishing=o) 상태
