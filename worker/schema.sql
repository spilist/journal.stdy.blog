-- D1은 질의 엔진이 아니라 **동기화 대상**이다 (불변식 1). 그래프는 로컬에서 계산하므로
-- 여기에 인덱스를 더 붙이지 않는다.
--
-- 'YYYY-MM-DD'는 전부 KST 캘린더 날짜다. `*_at`은 epoch ms(UTC 순간)다.
-- 날짜와 순간을 섞지 않는다.

CREATE TABLE IF NOT EXISTS energy (
  date       TEXT    NOT NULL,
  dim        TEXT    NOT NULL,
  score      INTEGER,
  reason     TEXT    NOT NULL DEFAULT '',
  scored_at  INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (date, dim)
);

CREATE TABLE IF NOT EXISTS log (
  date       TEXT NOT NULL,
  kind       TEXT NOT NULL,
  text       TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (date, kind)
);

CREATE TABLE IF NOT EXISTS pinned (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  text       TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

-- 하루 1개. 키가 곧 제약이다.
CREATE TABLE IF NOT EXISTS revision (
  day        TEXT PRIMARY KEY,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- pull은 `updated_at > since`로만 긁는다.
CREATE INDEX IF NOT EXISTS energy_updated ON energy (updated_at);
CREATE INDEX IF NOT EXISTS log_updated ON log (updated_at);
