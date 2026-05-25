---
name: file-deployment-rules
description: m2slide 빌드 산출물 파일 단위 배포 보장 — file:// 단독 동작 + 임의 단일 .html 파일 + img/ 만으로 동작해야 함. server-only 의존 금지.
date: 2026-05-25
---

# 핵심 원칙

m2slide 빌드 산출물(`Projects/<Name>/slide/*.html`)은 **임의 단일 `.html` 파일 + 동일 디렉토리 `img/` 만으로** 정상 동작해야 함. 사용자가 슬라이드 파일을 단일 단위로 배포받아 다른 머신·다른 디렉토리에서 `file://` 로 열어 동작해야 함.

배포 채널이 SSOT, 개발용 HTTP server(Issue235)는 보조. 영속 설계 SSOT: [`_doc_arch/dev-server.md`](../../_doc_arch/dev-server.md).

# 적용 트리거

다음 동작 시 본 룰 검증 의무 발동:

* 빌드 산출물 생성 코드(`lib/generate-slides.js`, `lib/html-builder.js`, `lib/markdown.js`, `theme/**/layouts/*.html` 등) 변경
* 신규 컴포넌트(외부 라이브러리 의존) 추가 — react·d3·KaTeX·model3d·p5·chart·map 등 카탈로그 확장
* 슬라이드 자체에 외부 자산 참조 추가 (이미지·CSS·JS·iframe)
* 사용자가 "배포 가능한 단일 파일", "오프라인 동작", "단일 파일 배포" 등 요구

# 허용 패턴

| 종류                     | 형식                                            | 예시                                            |
| :----------------------- | :---------------------------------------------- | :---------------------------------------------- |
| 상대 경로                | `./X` 또는 `X` (slash 없이 시작)               | `./img/foo.png`, `./08.4.html`, `img/bg.svg`    |
| CDN HTTPS URL            | `https://cdn.jsdelivr.net/...` 등 공개 CDN     | `https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/` |
| `data:` URI              | `data:image/png;base64,...`                     | 인라인 이미지·GLB (Issue207)                    |
| Fragment·query (자체)    | `#/N`, `?fwd=1`, `?back=1`                      | reveal.js hash, m2slide 트랜지션 cue            |

# 금지 패턴

다음 패턴은 빌드 산출물에 절대 포함 금지:

| 종류                        | 금지 예                                          | 사유                                            |
| :-------------------------- | :----------------------------------------------- | :---------------------------------------------- |
| localhost 하드코딩          | `http://localhost:9877/...`                      | 사용자 머신·port 가용성 보장 불가                |
| IP 직접 참조                | `http://127.0.0.1:8000/...`, `http://0.0.0.0/...` | 동일                                            |
| 절대 경로                   | `file:///Users/.../foo.png`, `/home/.../bar.css` | 빌더 머신 경로가 사용자 머신에 없음              |
| Windows 드라이브            | `C:\\path\\to\\X`                                 | 동일                                            |
| server-side include         | `<!--#include virtual="..." -->`                 | HTTP server SSI 의존                            |
| Dynamic API endpoint        | `fetch("/api/data")`, `XMLHttpRequest("/foo")`   | 서버 라우팅 의존                                |
| WebSocket                   | `new WebSocket("ws://...")`                      | server-only protocol                            |
| Server-Sent Events          | `new EventSource("/sse")`                        | 동일                                            |
| POST endpoint               | `<form method="post" action="/submit">`          | 서버 endpoint 의존                              |
| `<script type="module">` 상대 import + 빌드 산출 외부 | `import x from "/lib/foo.js"` (slash 시작) | 서버 라우트 의존                                |

# 신규 컴포넌트 도입 시 검증

m2slide에 외부 라이브러리 의존 컴포넌트(react·d3·model3d·p5 등)를 추가할 때:

1. **CDN HTTPS만 사용** — `https://cdn.jsdelivr.net`, `https://unpkg.com` 등 공개 CDN
2. 빌드 시 CDN URL이 산출 HTML에 인라인되어야 함 (server-side proxy 금지)
3. `data:` URI 인라인 옵션이 있으면 우선 사용 (Issue207 model3d GLB 인라인 패턴)
4. 추가 후 본 룰 §lint 통과 확인

# 자동 lint

```bash
./m2slide.sh --lint-deployment              # 전체 프로젝트
./m2slide.sh --lint-deployment <project>    # 단일 프로젝트
```

검사 대상 패턴 (regex):

```
localhost|127\.0\.0\.1|0\.0\.0\.0|/Users/|/home/[a-z]|file:///Users/|file:///home/
```

발견 시:

* exit code 1
* 위반 파일:라인:내용 stderr 보고
* 위반 0건 → exit 0 + `✅ No deployment violations`

추가 검사(향후):

* `<form method="post">` grep
* `new WebSocket(`, `new EventSource(`, `fetch("/`, `XMLHttpRequest` grep
* `<!--#include` grep

# 적용 시점

* PR 머지 전 (수동 lint 실행)
* `m2slide.sh` 빌드 후 자동 (향후 옵트인) — 현재는 수동
* 컴포넌트 카탈로그 확장 PR 의무

# 위반 시 대응

* 빌드 산출물에 금지 패턴 발견 즉시 즉시 수정 + 사용자 보고
* 동일 회귀 발견 시 `~/.claude/learning_log.md` 한 줄 기록 (`* YYYY-MM-DD: m2slide file-deployment 위반 — <패턴>`)
* `_doc_arch/dev-server.md`의 "미해결 항목"에 화이트리스트·예외 케이스 보강

# 예외

* `_doc_work/` 하위 (임시 작업물) — 빌드 산출물 아님
* `.claude/` (SCAR 문서)
* `theme/**/layouts/*.html` (템플릿 원본 — 빌드 시 절대 경로 치환됨)
    - 단 템플릿 자체에 `localhost`·절대 경로 하드코딩 금지 (사용자가 raw 템플릿을 file://로 열 가능성)
* 개발 보조 페이지(`_doc_work/z_htm/`) — 빌드 산출물 아님

# 참조

* 영속 설계 SSOT: [`_doc_arch/dev-server.md`](../../_doc_arch/dev-server.md)
* 빌드·검증 룰: [`apply-verify-rules.md`](apply-verify-rules.md)
* lint 구현: [`../../m2slide.sh`](../../m2slide.sh) `--lint-deployment` subcommand
