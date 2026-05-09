---
name: debug_Tech
description: m2slide의 Kroki 다이어그램(slide 31~44) 미표시 문제 진단·수정 기록 — 외부 kroki.io 의존 제거 + 빌드 타임 SVG 캐시 + Self-hosted Docker 전환
date: 2026-05-09
---

# 증상

`Projects/MarkdownGraph/slide/index.html`(현 `MermaidExample`)의 **#/31 ~ #/44 슬라이드 14장에서 본문이 빈 상태로 표시**됨. 제목(`<h2>`)만 보이고 다이어그램 영역이 백지.

해당 슬라이드 본문은 모두 Kroki 계열 다이어그램:

* `blockdiag` / `seqdiag` / `actdiag` / `nwdiag` / `ditaa`
* `dot` (Graphviz) / `vega` / `vegalite`
* `plantuml` (Class / Component / Activity / Use Case 4종)

Mermaid 슬라이드(#/1 ~ #/30)와 일반 텍스트 슬라이드(#/45~)는 정상.

# Phase 1 — 근본 원인 (이중 결함 + 외부 인프라 장애)

## 결함 ① 빌드 타임 `zlib` 누락

[`lib/markdown.js`](lib/markdown.js)의 코드 블록 처리에서 kroki 언어 감지 시 `zlib.deflateSync`로 path-based URL을 만드는 로직이 있었으나 **`zlib`이 require되지 않음**.

```js
// 문제 코드 (수정 전)
try {
  const deflated = zlib.deflateSync(Buffer.from(source, 'utf-8'));
  // ... → ReferenceError: zlib is not defined
} catch (e) {
  // fallback: data-type 속성 + raw text
  html.push(`<div class="media-container kroki" data-type="${lang}">`);
  html.push(source);
  html.push('</div>');
}
```

→ 매 빌드마다 catch 블록으로 분기되어 fallback HTML(미렌더 컨테이너)이 생성됨.

## 결함 ② 런타임 fallback URL 비표준 형식

[`lib/html-builder.js`](lib/html-builder.js)의 `Reveal.on('ready')` 핸들러가 fallback 컨테이너를 발견하면 다음 URL로 `<img>`를 만들어 부착:

```js
const imgUrl = 'https://kroki.io/' + diagramType + '/svg?source=' + encodeURIComponent(diagramSource);
```

`?source=` 쿼리 형식은 **kroki.io 표준이 아님**. kroki.io 표준 GET 형식은 `path-based deflate(raw) + base64url`:

```
GET https://kroki.io/{type}/{format}/{base64url(deflate(source))}
```

`?source=`로 보내면 kroki.io는 504/timeout으로 응답.

## 외부 인프라 장애 (별개 요인)

위 두 결함을 고쳐도 **현재 ICN 리전에서 kroki.io의 렌더링 엔드포인트가 30초+ 응답 없음**(홈페이지만 200). 즉 코드를 정상화해도 외부 서비스 자체가 도달 불가 상태.

| 엔드포인트 | 결과 |
| :--- | :--- |
| `https://kroki.io/` (홈) | HTTP 200 ✓ |
| `GET /{type}/svg/{encoded}` (path-based, 표준) | 30s timeout ✗ |
| `GET /{type}/svg?source=...` (비표준, m2slide 기존 fallback) | 504 ✗ |
| `POST /{type}/svg` (body) | 20s timeout ✗ |

# Phase 2 — 패턴 비교

| 슬라이드 범위 | 렌더링 경로 | 결과 |
| :--- | :--- | :--- |
| #/1 ~ #/30 (Mermaid) | 클라이언트 사이드 `mermaid.js` | ✓ 정상 |
| #/31 ~ #/44 (Kroki 계열) | 외부 `kroki.io` GET 이미지 | ✗ 빈 화면 |
| #/45 ~ (텍스트·코드) | 정적 HTML | ✓ 정상 |

빈 슬라이드 위치가 정확히 kroki 의존 슬라이드와 일치 → 결함 위치 확정.

# Phase 3 — Hypothesis & 검증

> **H**: 빌드 타임 결함으로 fallback HTML이 생성되고, 런타임 fallback URL은 비표준이라 kroki.io 응답 불가. 추가로 kroki.io 자체가 ICN에서 미도달.

검증:

1. `lib/markdown.js` 상단에 `require` 부재 확인 → 결함 ① 확정
2. `curl`로 `?source=` URL → 504, 표준 path URL → 타임아웃 → 결함 ② + 외부 장애 확정
3. 같은 페이지 Mermaid는 정상 → 클라이언트 사이드 렌더는 영향 없음

# Phase 4 — 수정

## 1차 시도 (실패)

`zlib` require 추가 + path-based URL 생성 + `<img onerror>` 안내문 부착. 그러나 ICN에서 kroki.io 자체가 응답 안 해 화면은 여전히 빈 상태(또는 30초 후 onerror로 안내문). 사용자 결정으로 외부 kroki.io 의존을 완전히 제거하기로 함.

## 2차 시도 (성공) — Self-hosted Kroki + 빌드 타임 SVG 캐시

### 아키텍처

```
[빌드 타임]
  *.md ──parse──> kroki source 추출
                     │
                     ▼
              sha256(lang+source) 해시
                     │
                     ├── 캐시 hit ── slide/kroki/{lang}_{hash}.svg
                     │
                     └── 캐시 miss ── curl ${kroki_server}/{lang}/svg/{deflate+base64url}
                                              │
                                              ├── 성공: SVG 저장 + img src 로컬 경로
                                              └── 실패: img src 외부 URL + onerror 안내

[런타임]
  reveal.js → <img src="kroki/{lang}_{hash}.svg"> ── 외부 호출 0
```

### 코드 변경 (4 파일)

#### [`lib/markdown.js`](lib/markdown.js)

* `zlib`/`fs`/`path`/`crypto`/`child_process` require 추가
* `setKrokiCacheDir(absDir, relPath, server)` 모듈 setter 추가
* `krokiPathUrl(lang, source, server)` — deflate + base64url로 path-based URL 생성
* `fetchKrokiSvgCached(lang, source, opts)` — 캐시 우선, miss 시 `curl`로 동기 fetch (timeout 8s), 성공 시 캐시 저장 + 상대경로 반환, 실패 시 `null`
* kroki 코드 블록 핸들러를 위 캐시 로직 + path-based fallback URL + `onerror` 안내문으로 재작성
* `module.exports`에 `setKrokiCacheDir` 추가

#### [`lib/html-builder.js`](lib/html-builder.js)

* `setKrokiCacheDir` import
* `generateHTML()` 진입 시점에 `setKrokiCacheDir(outputDir/kroki, 'kroki', _cfg.krokiServer || 'https://kroki.io')` 호출 — 캐시 디렉토리 + 서버 endpoint 주입
* runtime fallback (Reveal.on 'ready')는 정규식 없는 단순 안내문으로 단순화 (캐시 채워진 환경에서는 dead code)
    - **주의**: 본 핸들러는 `generateHTML`이 반환하는 **template literal 내부**라 정규식 escape에 민감. 1차 시도에서 `\+`, `\/`가 출력 HTML에서 `+`, `/`로 변환되어 `/+/g` (Invalid regex) → `Reveal.initialize` 스크립트 전체가 SyntaxError → reveal.js 미초기화로 모든 슬라이드 백지화. 정규식 자체를 제거해 안전하게 처리

#### [`lib/config.js`](lib/config.js)

* `cfg.krokiServer = 'https://kroki.io'` 기본값
* `_config.yml`의 `kroki_server:` YAML 키 매핑 추가

#### [`Projects/{name}/_config.yml`](Projects/MermaidExample/_config.yml)

```yaml
kroki_server: http://localhost:8000
```

### 인프라 — Docker Compose

[`/tmp/kroki/docker-compose.yml`](/tmp/kroki/docker-compose.yml):

```yaml
services:
  core:
    image: yuzutech/kroki
    container_name: m2-kroki-core
    environment:
      - KROKI_BLOCKDIAG_HOST=blockdiag
    ports:
      - "8000:8000"
    depends_on:
      - blockdiag
  blockdiag:
    image: yuzutech/kroki-blockdiag
    container_name: m2-kroki-blockdiag
    expose:
      - "8001"
```

기동:

```bash
cd /tmp/kroki && docker compose up -d
```

`blockdiag` companion 컨테이너는 `blockdiag/seqdiag/actdiag/nwdiag/packetdiag/rackdiag` 처리. core 컨테이너는 plantuml/graphviz/ditaa/vega/vegalite 등 자체 처리.

# Phase 4 검증

## 빌드 결과

```
Found 1 markdown file(s) to process
Processing: MermaidExample.md
  → Generated: .../slide/index.html
✅ All files processed!
```

`[kroki] fetch 실패` 메시지 0건 (이전 12건).

## 산출물 검증

| 항목 | 결과 |
| :--- | :--- |
| `slide/kroki/*.svg` | 12개 (1.6KB ~ 8KB, 모두 유효 XML) |
| HTML `src="kroki/..."` 참조 | 12건 |
| HTML `src="https://kroki.io/..."` 참조 | 0건 |
| inline `<script>` 4종 syntax | 모두 OK (1차 시도에선 49KB script가 SyntaxError) |
| Chrome에서 슬라이드 #/31~#/44 렌더링 | ✓ 모든 다이어그램 표시 |

# 운영 메모

## 캐시 자산화

`slide/kroki/*.svg`는 영구 자산. Docker 종료해도 빌드는 캐시 hit으로 작동 → CI/CD에서도 한 번만 컨테이너 띄우면 됨. 캐시는 git에 commit해 다른 환경에서도 재사용 가능 (단 `.gitignore`로 `slide/` 자체가 제외돼 있을 수 있어 별도 정책 검토 필요).

## 다른 프로젝트 적용

`_config.yml`에 한 줄만 추가:

```yaml
kroki_server: http://localhost:8000
```

미지정 시 자동으로 `https://kroki.io` fallback (외부 도달 가능한 환경에서 동작).

## 컨테이너 라이프사이클

```bash
cd /tmp/kroki && docker compose up -d     # 기동
cd /tmp/kroki && docker compose ps        # 상태 확인
cd /tmp/kroki && docker compose down      # 정지
cd /tmp/kroki && docker compose down -v   # 정지 + 볼륨 삭제 (있을 시)
```

## 보강 후보 (별도 이슈 등록 가치)

* 캐시 디렉토리를 `Projects/{name}/.kroki-cache/`로 이동(slide/와 분리, deploy 산출물 클린)
* `m2slide.sh`에 `--start-kroki` 옵션 추가 — 빌드 전 자동으로 컨테이너 기동
* 캐시 hit ratio·miss 시 fetch 시간 telemetry 출력
* mermaid도 `mmdc`로 빌드 타임 SVG 캐시 (오프라인 환경 대응 + 로딩 속도 개선)

# 학습 포인트 (literal 해석)

* **template literal 내부의 backslash escape는 출력 HTML에서 한 단계 더 소실됨**
    - `lib/html-builder.js`의 `generateHTML`이 backtick string으로 HTML 전체를 조립
    - 그 안의 `<script>` 코드에서 `replace(/\+/g, '-')`라 적으면 출력에는 `replace(/+/g, '-')`로 새겨져 invalid regex
    - 해결: 정규식을 사용하지 않거나, `\\+` (이중 escape)로 작성
* **외부 인프라 의존은 코드 결함을 가린다**: kroki.io 살아있을 때는 비표준 `?source=` URL이라도 일부 작동했을 수 있어 결함 ②가 발견되지 않았을 가능성
* **catch 블록으로 자동 fallback되는 코드는 silent failure 위험**: 결함 ①의 catch는 `zlib is not defined`를 묵살하고 fallback HTML을 만들어 빌드는 성공 처리. 빌드 단계에서 kroki source가 path-based URL로 변환됐는지 검증하는 후크가 있었다면 더 일찍 발견됐을 것

# 관련 파일

* [lib/markdown.js](lib/markdown.js) — kroki 캐시 로직
* [lib/html-builder.js](lib/html-builder.js) — `setKrokiCacheDir` 호출 + runtime fallback
* [lib/config.js](lib/config.js) — `kroki_server` 매핑
* [Projects/MermaidExample/_config.yml](Projects/MermaidExample/_config.yml) — endpoint 지정
* [/tmp/kroki/docker-compose.yml](/tmp/kroki/docker-compose.yml) — 컨테이너 정의
