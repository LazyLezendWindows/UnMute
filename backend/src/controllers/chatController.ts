import { Response, NextFunction } from 'express';
import { ChatService } from '../services/chatService';
import { AuthRequest } from '../middleware/auth';
import { Pagination } from '../validators/common';

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
      const { limit, offset } = req.query as unknown as Pagination;
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
