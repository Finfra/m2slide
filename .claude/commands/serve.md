---
name: serve
description: m2slide dev-server(port 9877) 제어 — start/stop/restart/status. "재부팅" 요청 시 restart
date: 2026-07-11
---

# /serve 커맨드

m2slide dev-server(HTTP, port 9877)를 제어하는 wrapper 커맨드. 내부적으로 `./m2slide.sh --serve <action>` 를 실행한다.

dev-server는 `/p/` 프로젝트 목록·설정 GUI(⚙️ 모달)·슬라이드 headless 검증(`/p/<P>/s|n/...`)의 단일 진입점이다. 빌드(`./m2slide.sh <project>`) 시 자동 시동되지만, 코드 수정 후 반영이 안 되거나 응답이 없을 때 수동 재시작이 필요하다.

## 사용법

```
/serve [action]
```

**인자 `[action]`** (선택, 생략 시 `restart`):

| action    | 동작                                             |
| :-------- | :----------------------------------------------- |
| `restart` | 중지 후 재시작 (기본값 — "재부팅" 의미)          |
| `start`   | 시동 (이미 떠 있으면 no-op, idempotent. **좀비면 자동 kill 후 재기동**) |
| `stop`    | 중지                                             |
| `status`  | 실제 응답 여부(healthy) 확인 — pid만 살아있고 포트가 죽은 좀비는 별도 경고(rc=2) |

**자연어 트리거**: "dev-server 재부팅/재시작해줘", "9877 재시작", "설정 서버 껐다 켜줘" → `restart`.

## 실행 절차

1. **action 결정**: `$ARGUMENTS` 가 `start|stop|restart|status` 중 하나면 그 값 채택. 비었거나 그 외 값이면 `restart` 로 처리하고 결정 근거 1줄 보고.
2. **실행**: 저장소 루트(`lib/m2slide/`)에서 아래 실행.
   ```bash
   ./m2slide.sh --serve <action>
   ```
3. **결과 보고**: 스크립트 stdout(`✅ dev-server started/stopped (pid ...)` 등)을 그대로 전달 + 접속 URL `http://localhost:9877/p/` 안내.
4. **restart 후 확인(선택)**: `restart`·`start` 인 경우 `curl -s -o /dev/null -w "%{http_code}" http://localhost:9877/p/` 로 200 확인 후 보고. 실패 시 재시도 1회, 그래도 실패면 원인 보고 후 중단.

## 주의

* dev-server는 `127.0.0.1` 로만 bind (외부 노출 없음). `--bind` 는 `m2slide.sh` 기본값 사용.
* 빌드가 자동 시동하므로 대부분 수동 호출 불필요 — 캐시·stale 프로세스 의심 시에만 `restart`.
* **좀비 pid 자동 치유 (2026-08-31)**: pid는 살아있는데 포트가 죽어 `/p/...` URL 이 connection refused 로 응답 안 될 때(`status`가 "running"이라 보고해도 실제 접속 불가한 상태), `start`/`restart` 한 번으로 자동 정리된다 — 별도 진단 스크립트 불필요.
* 서버 lifecycle SSOT: [`_doc_arch/dev-server.md`](../../_doc_arch/dev-server.md) (Issue235).

## 참조

* 빌드·검증 룰: [`.claude/rules/apply-verify-rules.md`](../rules/apply-verify-rules.md) "헤드리스 채널" 섹션
* 빌드 wrapper: [`m2slide.sh`](../../m2slide.sh) `--serve` subcommand
* 배포 검증 룰: [`.claude/rules/file-deployment-rules.md`](../rules/file-deployment-rules.md)
