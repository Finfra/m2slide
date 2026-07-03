---
title: run
description: m2slide 프로젝트를 빌드하고 브라우저에서 열기
date: 2026-05-01
---

# run 스킬

m2slide 프로젝트를 빌드하고 생성된 슬라이드를 Google Chrome에서 자동 실행합니다.

## 사용법

```bash
/run [프로젝트명]
```

**예시**:
- `/run m2Slide_single_mode` - m2Slide_single_mode 프로젝트 빌드
- `/run MarkdownGraph` - MarkdownGraph 프로젝트 빌드
- `/run layoutTest` - layoutTest 프로젝트 빌드

## 동작

1. **기존 아티팩트 정리**: `Projects/{프로젝트명}/slide` 폴더 삭제
2. **슬라이드 생성**: `./m2slide.sh {프로젝트명}` 실행
3. **브라우저 실행**:
   - `index.html` 있으면 `index.html` 열기 (챕터 모드)
   - 없으면 생성된 첫 번째 HTML 파일 열기 (단일 페이지 모드)
4. **Google Chrome 시작**: 생성된 파일을 Chrome에서 자동 실행

## 설정

- **브라우저**: Google Chrome 고정 (필요시 변경 가능)
- **명령 위치**: m2slide 루트 디렉토리에서 실행
- **파일 경로**: `Projects/{프로젝트명}/slide/` 기준

## 주의

- 프로젝트명이 없으면 기본값 `m2Slide_single_mode` 사용
- 기존 `slide` 폴더는 자동 삭제되므로 주의
- Chrome이 설치되어 있어야 함

