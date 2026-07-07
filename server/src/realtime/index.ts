import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { DecodedUser, verifyJwtToken } from '../middleware/authenticate';

type RealtimeUser = DecodedUser;

type RealtimePayload = Record<string, unknown>;

let io: SocketIOServer | null = null;
const studentRoomCounts = new Map<string, number>();

const isDevLoggingEnabled = () => process.env.NODE_ENV !== 'production';

const log = (...args: unknown[]) => {
  if (isDevLoggingEnabled()) {
    console.log('[Realtime]', ...args);
  }
};

const getTokenFromSocket = (socket: Socket) => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.startsWith('Bearer ') ? authToken.split(' ')[1] : authToken.trim();
  }

  const headerToken = socket.handshake.headers.authorization;
  if (typeof headerToken === 'string' && headerToken.startsWith('Bearer ')) {
    return headerToken.split(' ')[1];
  }

  return null;
};

const trackStudentRoom = (roomName: string) => {
  const nextCount = (studentRoomCounts.get(roomName) || 0) + 1;
  studentRoomCounts.set(roomName, nextCount);
};

const untrackStudentRoom = (roomName: string) => {
  const nextCount = (studentRoomCounts.get(roomName) || 0) - 1;
  if (nextCount <= 0) {
    studentRoomCounts.delete(roomName);
  } else {
    studentRoomCounts.set(roomName, nextCount);
  }
};

const ensureServer = () => {
  if (!io) {
    throw new Error('Realtime server has not been initialized.');
  }
  return io;
};

export const initializeRealtime = (httpServer: HttpServer) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173'];

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = getTokenFromSocket(socket);
      if (!token) {
        return next(new Error('Unauthorized: JWT token missing.'));
      }

      const user = verifyJwtToken(token) as RealtimeUser;
      socket.data.user = user;
      return next();
    } catch (error) {
      return next(new Error('Unauthorized: JWT token invalid or expired.'));
    }
  });

  io.on('connection', socket => {
    const user = socket.data.user as RealtimeUser | undefined;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    if (user.role === 'student') {
      if (!user.profileId) {
        log('disconnect', { socketId: socket.id, reason: 'missing student profileId' });
        socket.disconnect(true);
        return;
      }

      const studentRoom = `student:${String(user.profileId)}`;
      socket.join(studentRoom);
      trackStudentRoom(studentRoom);
      log('connect', { socketId: socket.id, userId: user.id, role: user.role, rooms: [studentRoom] });
      log('room-join', { socketId: socket.id, room: studentRoom });
    } else if (user.role === 'accountant' || user.role === 'admin1' || user.role === 'admin2') {
      const roleRoom = `role:${user.role}`;
      socket.join(roleRoom);
      log('connect', { socketId: socket.id, userId: user.id, role: user.role, rooms: [roleRoom] });
      log('room-join', { socketId: socket.id, room: roleRoom });
      // Non-student roles only need their role room for dashboard refreshes.
    }

    socket.on('disconnect', reason => {
      if (user.role === 'student' && user.profileId) {
        untrackStudentRoom(`student:${String(user.profileId)}`);
      }
      log('disconnect', { socketId: socket.id, reason, userId: user.id, role: user.role });
    });
  });

  return io;
};

export const getRealtimeServer = () => ensureServer();

export const emitToRoom = (room: string, event: string, payload: RealtimePayload) => {
  if (!io) return;
  io.to(room).emit(event, payload);
};

export const emitToRole = (role: 'student' | 'accountant' | 'admin1' | 'admin2', event: string, payload: RealtimePayload) => {
  emitToRoom(`role:${role}`, event, payload);
};

export const emitToStudent = (studentId: string, event: string, payload: RealtimePayload) => {
  emitToRoom(`student:${studentId}`, event, payload);
};

export const emitToAllConnectedStudentRooms = (event: string, payloadFactory: (studentRoom: string) => RealtimePayload) => {
  if (!io) return;
  for (const studentRoom of studentRoomCounts.keys()) {
    io.to(studentRoom).emit(event, payloadFactory(studentRoom));
  }
};
