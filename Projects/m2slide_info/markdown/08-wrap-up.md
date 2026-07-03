---
title: 마무리
type: ppt
---

# 08. 마무리

#layout-chapter

::: part
Chapter 8.
:::

## 핵심 요약과 다음 단계

---

## 핵심 요약 — m2slide 5가지 강점

::: cards
* **마크다운 저작**
* **Chapter Mode**
* **내장 컴포넌트**
* **EPUB 동시 생성**
* **Authoring Pipeline**
:::

* 텍스트 한 벌로 발표·전자책·영상 강의까지 이어짐

---

## 핵심 정리 — 체크리스트

* m2slide의 정체성과 기존 도구 대비 이점 {.fragment}
* Chapter Mode 프로젝트 구조와 빌드 방법 {.fragment}
* theme / layout 시스템으로 외관 조정 {.fragment}
* 내장 컴포넌트 펜스드 블록 작성 {.fragment}
* EPUB · dev-server · authoring-pipeline 활용 {.fragment}

---

## 다음 단계 — 직접 시작하기

```bash
# 1) 저장소 클론 + Node 버전 확인
git clone https://github.com/Finfra/m2slide.git
node --version

# 2) 프로젝트 초기화 — MyDeck은 예시명, 실제로는 원하는 이름으로 대체
/m2 init MyDeck

# 3) AGENDA.md + 챕터 .md + _config.yml 작성 (또는 파이프라인 단계 계속 진행)

# 4) 빌드 → 브라우저에서 확인
./m2slide.sh MyDeck

# 5) 막히면 GitHub Issues에 질문·버그 등록
```

> 가장 빠른 학습은 본 자료의 마크다운 소스를 직접 열어 따라 쓰는 것

---

## 링크 모음

| 자료 | 위치 |
| :--- | :--- |
| GitHub | github.com/Finfra/m2slide |
| 사용법 | 저장소 `README.md` |
| 설계 문서 | `_doc_arch/` |
| 예시 프로젝트 | `Projects/AgenticCoding` |
| 이 자료의 소스 | `Projects/m2slide_info/markdown/` |

---

## 핵심 요약 — 한 장 정리

```wordart
<h1 class="wordart-gradient" style="font-size:2.4em;margin:0.1em 0;">m2slide</h1>
<p class="wordart-shadow" style="font-size:1em;color:#666;margin:0;">마크다운 한 벌로 발표·전자책·영상까지</p>
```

::: cards
* **저작**
  - `AGENDA.md` + 챕터 md → `./m2slide.sh <Project>` 한 줄 빌드
* **표현**
  - theme/layout + `_config.yml` + 내장 컴포넌트(chart·d3·React·p5·3D)
* **산출**
  - HTML·EPUB·PDF·PPTX 동시 생성, `file://` 단독 동작 보장
* **자동화**
  - 9단계 authoring pipeline + dev-server 실시간 검증
:::
