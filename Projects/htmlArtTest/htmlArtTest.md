---
title: htmlArt 예제
subtitle: 들여쓰기 아웃라인 → 구조 도해 (타입별 예제)
type: ppt
version: 0.1.0
date: 2026-05-21
release_date: 2026-05-21
created_at: 2026-05-21
created_by: nowage
tags: []
---

# htmlArt 예제

* htmlArt는 들여쓰기 아웃라인을 타입 선택만으로 구조 도해로 변환하는 구성요소다.
* 문법: `::: htmlart <type>` fenced div + 표준 들여쓰기 리스트.
* v1 타입 4종: `process` · `cycle` · `hierarchy` · `pyramid`.
* 핵심: 같은 아웃라인을 두고 타입 이름만 바꾸면 다른 도해가 된다.

> 각 타입 슬라이드의 `::: htmlart` 블록은 빌드 시 구조 도해로 렌더된다
> (markdown.js preprocessPandocDiv + theme `slide.css`).

---

## process — 프로세스 체인

* 최상위 항목 = 순차 단계, 작성 순서 = 진행 순서.
* 하위 들여쓰기 = 단계 내부 보조 설명.

::: htmlart process
* 기획
  - 주제·청중 정의
* 설계
  - 목차·장표 구성
* 구현
  - 슬라이드 작성
* 배포
  - 빌드·공유
:::

---

## cycle — 주기 순환

* 최상위 항목 = 순환 노드. 마지막 노드가 첫 노드로 되돌아간다.
* 반복·라이프사이클 표현에 사용.

::: htmlart cycle
* 학습
  - 새 개념 습득
* 적용
  - 실제 작업에 사용
* 피드백
  - 결과 점검
* 개선
  - 다음 주기 반영
:::

---

## hierarchy — 계층 트리

* 들여쓰기 깊이 = 트리 깊이. 최상위 1개 = 루트.
* 조직도·분류 구조 표현에 사용.

::: htmlart hierarchy
* m2slide 구성요소
  - Core
    - 레이아웃
    - 카드
    - htmlArt
  - Visual
    - 심벌
    - 차트
:::

---

## pyramid — 피라미드

* 최상위 항목 = 층(band). 1번째 항목이 꼭대기.
* 비례·우선순위 층 표현에 사용.

::: htmlart pyramid
* 비전
  - 장기 방향
* 전략
  - 중기 계획
* 실행
  - 일상 작업
:::

---

## 동일 아웃라인, 타입 교체

* 아래 두 슬롯은 내용이 같고 타입 이름만 다르다.
* 작성자의 결정은 `htmlart <type>` 하나뿐이다.

::: columns
::: {.column width="50%"}
process:

::: htmlart process
* 입력
* 처리
* 출력
:::
:::
::: {.column width="50%"}
pyramid:

::: htmlart pyramid
* 입력
* 처리
* 출력
:::
:::
:::
