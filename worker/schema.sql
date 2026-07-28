-- D1은 질의 엔진이 아니라 **동기화 대상**이다 (불변식 1). 그래프는 로컬에서 계산하므로
-- 여기에 인덱스를 더 붙이지 않는다.
--
-- 'YYYY-MM-DD'는 전부 KST 캘린더 날짜다. `*_at`은 epoch ms(UTC 순간)다.
-- 날짜와 순간을 섞지 않는다.
--
-- **`updated_at`과 `synced_at`은 다른 시계다** (`F-9`).
--   - `updated_at` = 클라이언트가 **글자를 고친** 시각. LWW 판정은 이것으로만 한다.
--   - `synced_at`  = 서버가 **그 행을 쓴** 시각. pull 커서는 이것으로만 긁는다.
-- 섞으면 오프라인에서 어제 쓰고 오늘 올린 글이 **다른 기기에 영영 안 간다** — 그
-- 기기의 커서가 이미 어제보다 앞서 있기 때문이다. 실제로 한 건 잃을 뻔했다.

CREATE TABLE IF NOT EXISTS energy (
  date       TEXT    NOT NULL,
  dim        TEXT    NOT NULL,
  score      INTEGER,
  reason     TEXT    NOT NULL DEFAULT '',
  scored_at  INTEGER,
  updated_at INTEGER NOT NULL,
  synced_at  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, dim)
);

CREATE TABLE IF NOT EXISTS log (
  date       TEXT NOT NULL,
  kind       TEXT NOT NULL,
  text       TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  synced_at  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, kind)
);

CREATE TABLE IF NOT EXISTS pinned (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  text       TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  synced_at  INTEGER NOT NULL DEFAULT 0
);

-- 하루 1개. 키가 곧 제약이다.
CREATE TABLE IF NOT EXISTS revision (
  day        TEXT PRIMARY KEY,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  synced_at  INTEGER NOT NULL DEFAULT 0
);

-- pull은 `synced_at > since`로만 긁는다.
CREATE INDEX IF NOT EXISTS energy_synced ON energy (synced_at);
CREATE INDEX IF NOT EXISTS log_synced ON log (synced_at);
