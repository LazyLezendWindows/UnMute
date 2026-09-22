import { Response, NextFunction } from 'express';
import { ChatService } from '../services/chatService';
import { AuthRequest } from '../middleware/auth';

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
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const data = await ChatService.getMessages(id, req.user!.userId, limit, offset);
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
      const { content } = req.body;
      const message = await ChatService.sendMessage(id, req.user!.userId, content);
      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (err) {
      next(err);
    }
  }
}
