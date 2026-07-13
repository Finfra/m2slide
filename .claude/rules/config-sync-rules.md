---
name: config-sync-rules
description: _config.yml 설정 키 추가·제거·변경 시 _config.org.yml·설정 GUI·파서·설계문서 동기화 강제 규칙
date: 2026-07-10
---

# 목적

m2slide의 프로젝트 설정 키(`Projects/<P>/_config.yml`에서 쓰이는 렌더·빌드 옵션)는 여러 곳에 흩어져 있다. 한 곳만 고치면 다른 곳과 어긋나 "문서에 없는 키", "GUI에서 못 바꾸는 키", "파서가 무시하는 키"가 생긴다. 본 룰은 설정 키를 **추가·제거·이름변경·타입변경**할 때 관련 4곳을 **같은 작업 내에서 동기화**하도록 강제한다.

배경: 2026-07-10 전수 조사 결과 `asset_mode`(13개 프로젝트)·`deploy_formats`(8)·`card_columns`·`kroki_server`·`palette`·`cover_layout`·`agenda_*`·`toc_card_mode`가 프로젝트에서 쓰이는데 `_config.org.yml`에 문서화 안 됐고 일부는 설정 GUI에도 없었음. `mode_hint`는 소비처 없는 orphan이었음.

# 적용 트리거

다음 중 하나라도 하면 본 룰 발동:

* `lib/config.js`의 `applyConfig`에 새 `raw.match(/^<key>:/)` 파싱 추가·삭제·변경
* `_config.org.yml`에 키 추가·삭제·기본값 변경
* `lib/dev-server/server.py`의 `_CONFIG_SCHEMA`에 필드 추가·삭제·타입변경
* `Projects/<P>/_config.yml`에서 신규 키를 처음 사용
* 설정 키의 유효값·기본값·이름을 바꾸는 모든 작업

# 동기화 대상 (4곳 — 같은 작업 내 처리)

| # | 대상 | 역할 | 반영 내용 |
| :- | :--- | :--- | :--- |
| 1 | `lib/config.js` `applyConfig` | 파서 (SSOT of 파싱·유효값·기본값) | `raw.match` 파싱 + 유효값 검증 + `cfg.*` 기본값 |
| 2 | `_config.org.yml` | 문서화 (기본값 + 주석 설명) | 키 + 기본값 + 1줄 주석 (선택 키는 `#` 주석 처리로 문서화) |
| 3 | `lib/dev-server/server.py` `_CONFIG_SCHEMA` | 설정 GUI 필드 | `{key·tab·type·label(ko)·en·default·검증}` 1항목 |
| 4 | `_doc_arch/config-gui.md` | 설계 SSOT | 옵션 표 + 필요 시 탭/타입 설명 |

## GUI 제외 예외 (탭 배치가 부적절한 키)

일부 키는 GUI에 넣지 않는 것이 맞다. 이 경우 **제외 사유를 config-gui.md에 명시**하고 나머지 3곳(파서·org·설계문서)만 동기화:

* `current_project` — 루트 전용(프로젝트별 아님)
* `slide_css` — theme override 저수준 키
* `style.theContents.font_family`·`font_size` — 폰트 문자열(현재 GUI 미노출, 필요 시 후속)
* `background` — 저수준 CSS

# 절차 (필수 순서)

1. **파서 확인**: 키가 `lib/config.js`에서 파싱되는가? 아니면 배포·기타 스크립트(`.claude/commands/deploy-docs.md` 등) 소비인가? 소비처가 **전혀 없으면 orphan** → 추가 금지, 정리 대상 표기.
2. **타입 결정**: bool·int·float·enum·combo·text·color·multi 중 선택. 유효값은 `lib/config.js`의 검증과 일치시킬 것.
3. **4곳 동시 반영** (제외 키는 3곳 + 제외 사유).
4. **검증**:
    ```bash
    ./m2slide.sh --serve restart
    curl -s http://localhost:9877/p/<P>/config | python3 -c 'import json,sys;d=json.load(sys.stdin);print([f["key"] for f in d["schema"]])'
    ```
    신규 키가 스키마에 나타나는지 + POST 저장·재빌드 rc0 확인.
5. **테스트**: 값 타입에 맞는 검증(범위·enum·multi) round-trip을 `lib/dev-server/test_server.py`에 추가 권장.

# UI 컨트롤 타입 참조 (`_CONFIG_SCHEMA`)

| type | 컨트롤 | 값 형식 | 예 |
| :--- | :--- | :--- | :--- |
| bool | checkbox | true/false | cover_enabled |
| int | number(min/max) | 정수 | markmap_depth |
| float | number(step) | 실수 | font_size_max_ratio |
| enum | select | 고정 목록 1개 | nav_indicator |
| combo | 입력+▾목록 | 목록+자유입력 | theme·palette |
| text | input | 자유(pattern) | agenda_title |
| color | input | auto\|light\|dark\|css | nav_color |
| multi | 체크박스 여러개 | `[a, b]` 리스트 | deploy_formats |

중첩 키(`animation.*`·`style.theContents.*`)는 dotted-path로 표기, `_apply_nested`가 2-space 들여쓰기로 기록.

# 위반 시 대응

* 한 곳만 고치고 나머지를 누락한 사실 발견 시 즉시 나머지 동기화 + 사용자 보고.
* 동일 회귀 반복 시 `~/.claude/learning_log.md`에 한 줄 기록 (`* YYYY-MM-DD: m2slide config 키 동기화 누락 — <key>`).

# 참조

* 설계 SSOT: [`../../_doc_arch/config-gui.md`](../../_doc_arch/config-gui.md)
* 파서: [`../../lib/config.js`](../../lib/config.js) `applyConfig`
* 설정 GUI: [`../../lib/dev-server/server.py`](../../lib/dev-server/server.py) `_CONFIG_SCHEMA`
* 옵션 기본값 문서: [`../../_config.org.yml`](../../_config.org.yml)
* 메타 필드(운영): [`../../_doc_arch/meta-yml.md`](../../_doc_arch/meta-yml.md)
