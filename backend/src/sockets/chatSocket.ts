import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '../config/env';
import { SessionService } from '../services/sessionService';
import { ChatService } from '../services/chatService';

let ioInstance: SocketIOServer | null = null;

export function initSocketServer(server: HttpServer): SocketIOServer {
  ioInstance = new SocketIOServer(server, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authenticate the handshake with the same HttpOnly session cookie as the REST API.
  ioInstance.use(async (socket: Socket, next) => {
    try {
      const origin = socket.handshake.headers.origin;
      if (origin && !config.corsOrigins.includes(origin)) {
        return next(new Error('Origin not allowed'));
      }
      const session = await SessionService.resolve(SessionService.readToken(socket.handshake.headers.cookie));
      if (!session) {
        return next(new Error('Authentication required'));
      }
      socket.data.userId = session.userId;
      socket.data.sessionId = session.sessionId;
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  ioInstance.on('connection', (socket: Socket) => {
    const userId: string = socket.data.userId;
    socket.join(`user:${userId}`);
    // Lets logout disconnect exactly the sockets opened with the revoked session.
    socket.join(`session:${socket.data.sessionId}`);

    socket.on('join_conversation', async (conversationId: unknown) => {
      if (typeof conversationId !== 'string' || conversationId.length > 64) return;
      try {
        if (await ChatService.canAccessConversation(conversationId, userId)) {
          socket.join(`conversation:${conversationId}`);
        }
      } catch (err) {
        console.error('[Socket] join_conversation failed:', err);
      }
    });

    socket.on('leave_conversation', (conversationId: unknown) => {
      if (typeof conversationId === 'string') socket.leave(`conversation:${conversationId}`);
    });
  });

  return ioInstance;
}

export function getSocketServer(): SocketIOServer | null {
  return ioInstance;
}
