---
name: README
description: lib/component-hooks/ — 시각화 라이브러리별 클라이언트 초기화 스니펫 모듈 디렉토리
date: 2026-05-20
---

# 개요

`lib/component-hooks/`는 시각화 라이브러리(KaTeX·chart.js·Leaflet·d3 등)의 **클라이언트 초기화 스니펫**을 담는 디렉토리다. generic fenced 디스패처([`../html-builder.js`](../html-builder.js))가 `status: applied` 라이브러리의 `init_hook`을 조회하여 출력 HTML에 인라인 `<script>`로 삽입한다.

설계 SSOT: [`../../_doc_arch/component-libraries.md`](../../_doc_arch/component-libraries.md).

# 훅 파일 규약

* 파일명: `<initHookId>.js` — `initHookId`는 `data/component-libraries.yml`의 `init_hook` 필드 값
* 형식: `module.exports = { script: '<클라이언트 JS 문자열>' }`
* `script`는 출력 HTML의 `<script>` 본문으로 인라인됨 — reveal.js `ready` 이후 실행 가정

# 진입점

* [`index.js`](index.js) — `resolveHook(initHookId)` → 훅 `script` 문자열 또는 `''`(미존재)

# 현황

* Phase 0: 코어 5종 전부 `status: planned` → 훅 파일 없음. `resolveHook`은 `''` 반환
* Phase 1: `katex_autorender.js`·`chart_dispatch.js` 추가 예정
* Phase 2: `map_dispatch.js`·`d3_dispatch.js` 추가 예정
