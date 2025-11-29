# Slide CSS Customization Guide

이 문서는 `slide.css`를 사용하여 슬라이드 스타일을 커스터마이징하는 방법을 설명합니다.
JS 기반의 동적 스타일링이 제거되었으므로, 모든 스타일은 CSS로 직접 제어해야 합니다.

## 1. 제목 스타일링 (Title Styling)

### 1.1. 일반 슬라이드 제목 (Regular Slide Title)

일반 슬라이드의 제목(`h1`) 크기를 조정하려면 `.reveal h1` 선택자를 사용합니다.

```css
.reveal h1 {
  font-size: 2.5em; /* 기본값 */
  /* font-size: 4.5em;  <- 원하는 크기로 변경 */
}
```

### 1.2. 개요 페이지 제목 (Outline/Title Slide)

개요 페이지(`.title-slide`)의 제목 크기를 별도로 지정하려면 다음 선택자를 사용합니다.

```css
.reveal section.title-slide h1 {
  font-size: 3.5em !important; /* 기본값 */
  /* font-size: 5.0em !important; <- 더 크게 변경 */
}
```

### 1.3. 첫 페이지 (TOC) 제목

첫 페이지(목차)의 제목은 `#toc-container h1` 선택자로 제어합니다.
**주의**: `#toc-container`는 Reveal.js 외부의 요소이므로, `em` 단위가 브라우저 기본 폰트 크기(16px)를 기준으로 계산될 수 있습니다. 슬라이드와 동일한 비율을 유지하려면 `#toc-container`의 폰트 크기를 32px로 설정하거나, `px` 단위를 사용하는 것이 좋습니다.

```css
/* TOC 컨테이너 기본 폰트 크기 설정 (슬라이드와 맞춤) */
#toc-container {
  font-size: 32px;
}

#toc-container h1 {
  font-size: 2.5em; /* 슬라이드 제목과 동일한 비율 */
  /* font-size: 80px; <- 또는 px 단위로 직접 지정 */
}
```

## 2. 상단 패딩 (Top Padding)

모든 슬라이드 제목에 상단 여백을 추가하려면 `padding-top`을 사용합니다.

```css
/* 모든 슬라이드 제목에 패딩 적용 */
.reveal h1,
.reveal h2,
.reveal h3 {
  padding-top: 0.5em !important; /* 원하는 패딩 값 */
  margin-top: 0 !important;
}

/* 개요 페이지 제목에만 별도 패딩 적용 */
.reveal section.title-slide h1 {
  padding-top: 1.0em !important;
}

/* 첫 페이지(TOC) 제목 패딩 */
#toc-container h1 {
  padding-top: 1.0em;
}
```

## 3. 폰트 크기 비율 예시

이전 설정(`outline_title_size_scale: 2.0`)과 유사한 효과를 내려면:

*   **일반 슬라이드**: `2.5em`
*   **개요 페이지**: `5.0em` (2.5em * 2.0)

```css
.reveal h1 {
  font-size: 2.5em;
}

.reveal section.title-slide h1 {
  font-size: 5.0em !important;
}
```
