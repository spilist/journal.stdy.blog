import { test } from 'node:test'
import assert from 'node:assert/strict'

import { addDays, dayLabel, fromH1, isCalendarDate, kstDate, kstTime, kstTimestamp, toH1 } from './date.js'

test('KST 새벽 3시는 그날 날짜다 (AC-5)', () => {
  // 2026-03-01 18:00 UTC = 2026-03-02 03:00 KST.
  assert.equal(kstDate(Date.UTC(2026, 2, 1, 18, 0)), '2026-03-02')
  assert.equal(kstTime(Date.UTC(2026, 2, 1, 18, 0)), '03:00')
  assert.equal(kstTimestamp(Date.UTC(2026, 2, 1, 18, 0)), '2026-03-02 03:00:00 KST')
})

test('KST 09시 직전은 아직 전날이 아니다 — UTC로 계산하면 여기서 틀린다', () => {
  // 2026-03-02 00:00 UTC = 2026-03-02 09:00 KST. UTC 날짜도 03-02라 통과하지만,
  // 아래 케이스가 진짜 함정이다: UTC 23:00 은 이미 KST 다음날 08:00 이다.
  assert.equal(kstDate(Date.UTC(2026, 2, 1, 23, 0)), '2026-03-02')
  assert.equal(kstDate(Date.UTC(2026, 2, 1, 14, 59)), '2026-03-01')
  assert.equal(kstDate(Date.UTC(2026, 2, 1, 15, 0)), '2026-03-02')
})

test('addDays는 월·연 경계를 넘는다', () => {
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
  assert.equal(addDays('2024-02-28', 1), '2024-02-29')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-01-01', -1), '2025-12-31')
})

test('H1 두 자리 연도 왕복', () => {
  assert.equal(toH1('2026-07-26'), '26-07-26')
  assert.equal(fromH1('26-07-26'), '2026-07-26')
  assert.equal(fromH1(' 26-07-26 '), '2026-07-26')
})

test('날짜가 아닌 H1은 null — 고정 블록을 가르는 기준이다 (D10)', () => {
  assert.equal(fromH1('2026 하반기 목표'), null)
  assert.equal(fromH1('올해 잊지 않을 것'), null)
  assert.equal(fromH1('2026-07-26'), null) // 네 자리 연도는 정본 형식이 아니다
  assert.equal(fromH1('26-02-29'), null, '존재하지 않는 윤년 날짜는 날짜 블록이 아니다')
  assert.equal(fromH1('26-13-01'), null, '존재하지 않는 달은 날짜 블록이 아니다')
})

test('dayLabel', () => {
  assert.equal(dayLabel('2026-03-02', '2026-03-02'), '오늘')
  assert.equal(dayLabel('2026-03-01', '2026-03-02'), '어제')
  assert.equal(dayLabel('2026-03-03', '2026-03-02'), '내일')
  assert.equal(dayLabel('2026-02-14', '2026-03-02'), '2월 14일')
})

test('URL·날짜 입력은 실제 캘린더 날짜만 받는다', () => {
  assert.equal(isCalendarDate('2026-02-28'), true)
  assert.equal(isCalendarDate('2024-02-29'), true)
  assert.equal(isCalendarDate('2026-02-29'), false)
  assert.equal(isCalendarDate('2026-13-01'), false)
  assert.equal(isCalendarDate('0226-08-03'), false)
})
