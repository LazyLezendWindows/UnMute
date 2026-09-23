-- Converge indexes between databases created before and after the baseline migration.

-- Message history is always read per conversation in time order.
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, created_at);
DROP INDEX IF EXISTS fk_msg_conv ON messages;

-- Redundant: each is a leftmost prefix of the table's unique key (which also serves the foreign key).
DROP INDEX IF EXISTS idx_likes_liker ON likes;
DROP INDEX IF EXISTS idx_passes_passer ON passes;
DROP INDEX IF EXISTS idx_matches_users ON matches;
DROP INDEX IF EXISTS idx_blocks_blocker ON blocks;
