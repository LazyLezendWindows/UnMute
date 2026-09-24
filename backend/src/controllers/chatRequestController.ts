import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ChatRequestService } from '../services/chatRequestService';

type Handler = (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;

/** Runs a service call for the signed-in member and sends its result in the standard envelope. */
function handle(run: (req: AuthRequest) => Promise<unknown>, status = 200): Handler {
  return async (req, res, next) => {
    try {
      res.status(status).json({ success: true, data: await run(req) });
    } catch (err) {
      next(err);
    }
  };
}

export class ChatRequestController {
  static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recipientId, content, clientMessageId } = req.body;
      const result = await ChatRequestService.create(req.user!.userId, recipientId, content, clientMessageId);
      res.status(result.status === 'pending' ? 201 : 200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static listIncoming = handle((req) => ChatRequestService.listIncoming(req.user!.userId));
  static listSent = handle((req) => ChatRequestService.listSent(req.user!.userId));
  static get = handle((req) => ChatRequestService.get(req.params.id, req.user!.userId));
  static accept = handle((req) => ChatRequestService.accept(req.params.id, req.user!.userId));
  static decline = handle((req) => ChatRequestService.decline(req.params.id, req.user!.userId));
  static cancel = handle((req) => ChatRequestService.cancel(req.params.id, req.user!.userId));
}
