import { Response, NextFunction } from 'express';
import { ChatService } from '../services/chatService';
import { AuthRequest } from '../middleware/auth';
import { MessagePageQuery } from '../validators/chatValidator';

export class ChatController {
  static async getConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const convs = await ChatService.getConversations(req.user!.userId);
      res.status(200).json({
        success: true,
        data: convs,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { limit, before } = req.query as unknown as MessagePageQuery;
      const data = await ChatService.getMessages(id, req.user!.userId, limit, before);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { content, clientMessageId, attachment } = req.body;
      const { message, created } = await ChatService.sendMessage(id, req.user!.userId, content, clientMessageId, attachment);
      res.status(created ? 201 : 200).json({
        success: true,
        data: message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createAttachmentUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const data = await ChatService.createAttachmentUpload(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
