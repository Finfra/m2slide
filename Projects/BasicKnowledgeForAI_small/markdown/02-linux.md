---
title: 부록2. 리눅스 사용 기초
type: ppt
release_date: 2026-07-02
---

# 리눅스를 알아야 하는 이유

* 사용법이 UNIX와 유사
* 웹서비스 구현시 필요
* HTML5 고급기능 테스트시 필요
* 실전에서의 웹프로그래밍 구현
* 무료

---

# 윈도우에서 접속시

::: columns
::: {.column width="50%"}
* Putty.exe와 같은 ssh지원 어플 사용 접속
* file은 fileZillaftp사용
* upload(일명 sftp)
  - alftp,SublimeText의
  - sftp기능도 사용 가능

![FileZilla 화면](./img/BasicKnowledgeForAI_small_12.png)
:::
::: {.column width="50%"}
![PuTTY 설정 + 터미널](./img/BasicKnowledgeForAI_small_11.png)
:::
:::

---

# 명령어 및 유틸리티 리스트

::: columns
::: {.column width="33%"}
* **alias**<span class="fragment" data-fragment-index="1"> — 명령어 별칭 지정</span>
* **cat**<span class="fragment" data-fragment-index="1"> — 파일 내용 출력·연결</span>
* **cd**<span class="fragment" data-fragment-index="1"> — 디렉토리 이동</span>
* **chgrp**<span class="fragment" data-fragment-index="1"> — 파일 그룹 소유자 변경</span>
* **chmod**<span class="fragment" data-fragment-index="1"> — 파일 권한 변경</span>
* **chown**<span class="fragment" data-fragment-index="1"> — 파일 소유자 변경</span>
* **clear**<span class="fragment" data-fragment-index="1"> — 터미널 화면 지우기</span>
* **cp**<span class="fragment" data-fragment-index="1"> — 파일·디렉토리 복사</span>
* **date**<span class="fragment" data-fragment-index="1"> — 날짜·시간 표시</span>
:::
::: {.column width="33%"}
* **echo**<span class="fragment" data-fragment-index="1"> — 문자열·변수 출력</span>
* **head**<span class="fragment" data-fragment-index="1"> — 파일 앞부분 출력</span>
* **ls**<span class="fragment" data-fragment-index="1"> — 디렉토리 목록 표시</span>
* **man**<span class="fragment" data-fragment-index="1"> — 명령어 매뉴얼 보기</span>
* **mkdir**<span class="fragment" data-fragment-index="1"> — 디렉토리 생성</span>
* **more**<span class="fragment" data-fragment-index="1"> — 파일 페이지 단위로 보기</span>
* **mv**<span class="fragment" data-fragment-index="1"> — 파일 이동·이름 변경</span>
* **passwd**<span class="fragment" data-fragment-index="1"> — 비밀번호 변경</span>
* **pwd**<span class="fragment" data-fragment-index="1"> — 현재 경로 출력</span>
:::
::: {.column width="34%"}
* **rm**<span class="fragment" data-fragment-index="1"> — 파일 삭제</span>
* **rmdir**<span class="fragment" data-fragment-index="1"> — 빈 디렉토리 삭제</span>
* **ssh**<span class="fragment" data-fragment-index="1"> — 원격 서버 접속</span>
* **su**<span class="fragment" data-fragment-index="1"> — 사용자 전환(관리자)</span>
* **tail**<span class="fragment" data-fragment-index="1"> — 파일 끝부분 출력</span>
* **vi**<span class="fragment" data-fragment-index="1"> — 텍스트 편집기</span>
* **wget**<span class="fragment" data-fragment-index="1"> — URL 파일 다운로드</span>
* **which**<span class="fragment" data-fragment-index="1"> — 명령어 실행 경로 찾기</span>
* **who**<span class="fragment" data-fragment-index="1"> — 로그인 사용자 표시</span>
:::
:::

---

# 절대경로 이름과 상대경로 이름

* 절대경로 이름 <span class="fragment" data-fragment-index="1"> : /로 시작</span>
  * ex) /home, /etc,
* 상대경로 이름 <span class="fragment" data-fragment-index="1"> : 현재 폴더를 기준</span>
  * "." 현재 폴더 의미(생략시 /와 함께)
    * cd ./xx   == cd xx
  * ".." 상위 폴더를 의미
* 관련 명령어
  * cd <span class="fragment" data-fragment-index="1"> : Change Directory</span>
  * pwd <span class="fragment" data-fragment-index="1"> : Parent Working Directory</span>
  * ls <span class="fragment" data-fragment-index="1"> : LiSt</span>
  * mkdir <span class="fragment" data-fragment-index="1"> : MaKe DIRectory</span>
  * cp <span class="fragment" data-fragment-index="1"> : CoPy</span>
  * mv <span class="fragment" data-fragment-index="1"> : MoVe</span>
