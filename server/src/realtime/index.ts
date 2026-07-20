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

const getRoomClientCount = (roomName: string): number => {
  if (!io) return 0;
  const room = io.sockets.adapter.rooms.get(roomName);
  return room ? room.size : 0;
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
    } else if (['accountant', 'admin1', 'admin2', 'admin3', 'authenticator'].includes(user.role)) {
      const roleRoom = `role:${user.role}`;
      socket.join(roleRoom);
      log('connect', { socketId: socket.id, userId: user.id, role: user.role, rooms: [roleRoom] });
      log('room-join', { socketId: socket.id, room: roleRoom });
    }

    // Client Acknowledgement Listener for transaction sync integrity
    socket.on('sync:ack', async (data: { transactionId: string }) => {
      const { transactionId } = data;
      try {
        const { SyncJournal } = require('../models/syncJournal');
        const journal = await SyncJournal.findOne({ transactionId });
        if (journal) {
          if (!journal.acknowledgedClients.includes(socket.id)) {
            journal.acknowledgedClients.push(socket.id);
            if (journal.acknowledgedClients.length >= journal.expectedClientsCount) {
              journal.status = 'synced';
            }
            await journal.save();
            // Broadcast update to authenticators
            io?.to('role:authenticator').emit('sync:journal-updated', journal);
          }
        }
      } catch (err) {
        console.error('Failed to register sync:ack:', err);
      }
    });

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

export const emitToRoom = async (room: string, event: string, payload: RealtimePayload) => {
  if (!io) return;

  // Intercept recursively to avoid infinite loop when updating authenticator about itself
  if (room === 'role:authenticator') {
    io.to(room).emit(event, payload);
    return;
  }

  // Assign transactionId if none exists
  let transactionId = payload.transactionId as string;
  if (!transactionId) {
    transactionId = `TX_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    payload.transactionId = transactionId;
  }

  const expectedClientsCount = getRoomClientCount(room);

  try {
    const { SyncJournal } = require('../models/syncJournal');
    const journal = new SyncJournal({
      transactionId,
      sourceNode: 'server',
      targetNode: room,
      action: event,
      payload,
      status: expectedClientsCount === 0 ? 'synced' : 'pending',
      acknowledgedClients: [],
      expectedClientsCount
    });
    await journal.save();

    io.to('role:authenticator').emit('sync:journal-updated', journal);
  } catch (err) {
    console.error('Failed to create SyncJournal record:', err);
  }

  io.to(room).emit(event, payload);
};

export const emitToRole = (role: 'student' | 'accountant' | 'admin1' | 'admin2' | 'admin3', event: string, payload: RealtimePayload) => {
  emitToRoom(`role:${role}`, event, payload);
};

export const emitToStudent = (studentId: string, event: string, payload: RealtimePayload) => {
  emitToRoom(`student:${studentId}`, event, payload);
};

export const emitToAllConnectedStudentRooms = (event: string, payloadFactory: (studentRoom: string) => RealtimePayload) => {
  if (!io) return;
  for (const studentRoom of studentRoomCounts.keys()) {
    emitToRoom(studentRoom, event, payloadFactory(studentRoom));
  }
};
