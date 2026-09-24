import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '../config/env';
import { SessionService } from '../services/sessionService';
import { ChatService } from '../services/chatService';
import { PresenceService } from '../services/presenceService';

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
      // Web: the session cookie. Native apps: the bearer token passed as `auth.token`.
      const handshakeAuth = socket.handshake.auth as { token?: unknown; visible?: unknown } | undefined;
      const authToken = handshakeAuth?.token;
      const token =
        SessionService.readToken(socket.handshake.headers.cookie) ??
        SessionService.bearerToken(typeof authToken === 'string' ? `Bearer ${authToken}` : undefined);
      const session = await SessionService.resolve(token);
      if (!session) {
        return next(new Error('Authentication required'));
      }
      socket.data.userId = session.userId;
      socket.data.sessionId = session.sessionId;
      // Whether the app is on screen (clients that do not say are treated as on screen).
      socket.data.visible = handshakeAuth?.visible !== false;
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  ioInstance.on('connection', (socket: Socket) => {
    const userId: string = socket.data.userId;
    socket.join(`user:${userId}`);
    // First connection of this member: they are now online.
    void (async () => {
      try {
        if ((await ioInstance!.in(`user:${userId}`).fetchSockets()).length === 1) await PresenceService.changed(userId, true);
      } catch (err) {
        console.error('[Socket] presence update failed:', err);
      }
    })();
    socket.on('disconnect', async () => {
      try {
        if ((await ioInstance!.in(`user:${userId}`).fetchSockets()).length === 0) await PresenceService.changed(userId, false);
      } catch (err) {
        console.error('[Socket] presence update failed:', err);
      }
    });
    // Lets logout disconnect exactly the sockets opened with the revoked session.
    socket.join(`session:${socket.data.sessionId}`);

    // The optional acknowledgement fires once the socket is really in the room, so the client can
    // fetch anything sent before that point without a gap (live events only flow after joining).
    socket.on('join_conversation', async (conversationId: unknown, ack?: unknown) => {
      const reply = (joined: boolean) => {
        if (typeof ack === 'function') ack({ joined });
      };
      if (typeof conversationId !== 'string' || conversationId.length > 64) return reply(false);
      try {
        const allowed = await ChatService.canAccessConversation(conversationId, userId);
        if (allowed) socket.join(`conversation:${conversationId}`);
        reply(allowed);
      } catch (err) {
        console.error('[Socket] join_conversation failed:', err);
        reply(false);
      }
    });

    // The page was hidden (app backgrounded, screen locked, tab switched) or shown again.
    socket.on('presence', (state: unknown) => {
      const visible = (state as { visible?: unknown } | null)?.visible;
      if (typeof visible === 'boolean') socket.data.visible = visible;
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
