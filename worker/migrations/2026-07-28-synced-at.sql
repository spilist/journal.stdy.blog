-- `F-9` — pull 커서를 클라이언트 편집 시각(`updated_at`)에서 서버 기록 시각
-- (`synced_at`)으로 옮긴다. 한 번만 돌린다.
--
--   npx wrangler d1 execute journal-db --remote --file=worker/migrations/2026-07-28-synced-at.sql
--
-- 마지막 UPDATE는 **모든 행의 `synced_at`을 지금으로 올린다.** 그래야 커서가 이미
-- 앞서 있던 기기들이 다음 pull에서 전부를 한 번 다시 받는다 — 이 버그로 못 받고
-- 지나간 행(오프라인에서 어제 쓰고 오늘 올린 것)이 그때 도착한다.
-- 다시 받아도 로컬은 안 깨진다: 더티면 건너뛰고, 같으면 `stale`로 떨어진다 (`D3`).

ALTER TABLE energy   ADD COLUMN synced_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE log      ADD COLUMN synced_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pinned   ADD COLUMN synced_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE revision ADD COLUMN synced_at INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS energy_synced ON energy (synced_at);
CREATE INDEX IF NOT EXISTS log_synced ON log (synced_at);

UPDATE energy   SET synced_at = unixepoch('subsec') * 1000;
UPDATE log      SET synced_at = unixepoch('subsec') * 1000;
UPDATE pinned   SET synced_at = unixepoch('subsec') * 1000;
UPDATE revision SET synced_at = unixepoch('subsec') * 1000;
