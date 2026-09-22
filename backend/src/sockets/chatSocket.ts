import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '../config/env';
import { verifyToken } from '../utils/token';

let ioInstance: SocketIOServer | null = null;

export function initSocketServer(server: HttpServer): SocketIOServer {
  ioInstance = new SocketIOServer(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  ioInstance.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization?.split(' ')[1] as string);

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    socket.data.userId = payload.userId;
    socket.data.email = payload.email;
    next();
  });

  ioInstance.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    console.log(`[Socket] User connected: ${userId} (${socket.id})`);

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${userId}`);
    });
  });

  return ioInstance;
}

export function getSocketServer(): SocketIOServer | null {
  return ioInstance;
}
