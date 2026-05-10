'use strict';

// Issue141: 회귀/통합 테스트 (Iron Rule)
// _contents head-bar 변경이 기존 시각 회귀를 일으키지 않음을 보장
// 실행: node --test lib/__tests__/integration.test.js
// 주의: 빌드 시간이 오래 걸림. CI 시 별도 분리 권장

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../..');

function build(projectName) {
  execSync(`./m2slide.sh ${projectName}`, { cwd: REPO_ROOT, stdio: 'pipe' });
}

test('integration: single mode (AGENDA.md 미존재) head-bar fallback (slide H1/H2 outline)', () => {
  // Issue141 정책: single mode에서는 slide.chapterTitle(H1)을 d1, slide.title(H2)을 d2로 fallback
  // → head-bar 표시됨 (자동 비표시 아님)
  build('m2SlideStyle1_single');
  const html = fs.readFileSync(path.join(REPO_ROOT, 'Projects/m2SlideStyle1_single/slide/index.html'), 'utf-8');
  // 슬라이드 내 H1이 있으면 head-bar 잔존 + head-left에 H1 텍스트
  assert.ok(html.includes('contents-head-bar'), 'single mode + slide 내 H1 있을 때 head-bar 표시');
  // 첫 H1 텍스트 (m2SlideStyle1_single 기준 "1. 텍스트 레이아웃")가 head-left에 주입됨
  assert.ok(
    html.match(/<div class="contents-head-left">1\. 텍스트 레이아웃<\/div>/),
    'head_left에 slide.chapterTitle (H1) fallback 미주입'
  );
});

test('integration: chapter cover/agenda 산출물에 contents-head-bar 미존재', () => {
  build('m2SlideStyle2_chapter');
  const cover = fs.readFileSync(path.join(REPO_ROOT, 'Projects/m2SlideStyle2_chapter/slide/index.html'), 'utf-8');
  const agenda = fs.readFileSync(path.join(REPO_ROOT, 'Projects/m2SlideStyle2_chapter/slide/agenda.html'), 'utf-8');
  assert.ok(!cover.includes('contents-head-bar'), 'cover (index.html)에 contents-head-bar 잔존');
  assert.ok(!agenda.includes('contents-head-bar'), 'agenda.html에 contents-head-bar 잔존');
});

test('integration: chapter 슬라이드 산출물에 outline 텍스트 정확 주입 (default head_left=d1)', () => {
  build('m2SlideStyle2_chapter');
  const html = fs.readFileSync(path.join(REPO_ROOT, 'Projects/m2SlideStyle2_chapter/slide/01-text-layout.html'), 'utf-8');
  // _config.org.yml 디폴트 head_left=d1, head_right=now → d1만 있는 메인 챕터는 head_left='1. 텍스트 레이아웃', head_right=''
  assert.ok(html.includes('contents-head-bar'), '챕터 슬라이드에 contents-head-bar 미존재');
  assert.ok(
    html.includes('<div class="contents-head-left">1. 텍스트 레이아웃</div>'),
    'head_left에 메인 챕터 텍스트(d1) 미주입'
  );
  // head_right=now + head_left=d1 + d1만 있는 메인 챕터 → outlinePath.slice(1) = [] → 빈
  // _stripEmptyWrappers가 빈 div 자동 제거 (1차 안전망 작동) → head-right div 자체 미존재
  const hrMatch = html.match(/<div class="contents-head-right">([\s\S]*?)<\/div>/);
  if (hrMatch) {
    assert.strictEqual(hrMatch[1].trim(), '', 'head_right 잔존 시 텍스트 비어야 함 (_stripEmptyWrappers 1차 미작동)');
  }
  // 빈 div가 strip됐다면 그것도 OK (의도된 동작)
});
