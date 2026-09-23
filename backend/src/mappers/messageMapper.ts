export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  status: string;
  created_at: string;
}

/** API shape for every message (REST history, send responses and realtime events alike). */
export function toMessage(row: MessageRow) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  };
}
