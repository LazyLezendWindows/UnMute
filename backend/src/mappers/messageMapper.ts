import { cloudinaryAssetId } from '../utils/avatar';

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  status: string;
  created_at: string;
  attachment_url?: string | null;
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
    // Only photos stored in this app's Cloudinary account are ever served.
    attachmentUrl: cloudinaryAssetId(row.attachment_url) ? row.attachment_url! : null,
  };
}
