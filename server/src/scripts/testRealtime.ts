import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { io as createClient, Socket } from 'socket.io-client';

dotenv.config();

const baseApiUrl = process.env.API_BASE_URL || 'http://127.0.0.1:5000/api';
const socketUrl = baseApiUrl.replace(/\/api\/?$/, '');
const jwtSecret = process.env.JWT_SECRET || 'some_super_secret_key_change_me';

type LoginResponse = {
  token: string;
  user: {
    id: string;
    username: string;
    role: 'student' | 'accountant' | 'admin1' | 'admin2';
    profileId?: string;
    profileModel?: string;
  };
};

const login = async (identifier: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${baseApiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || `Login failed for ${identifier}`);
  }

  return payload;
};

const loginWithFallback = async (identifier: string) => {
  const attempts = ['111111'];
  let lastError: unknown = null;

  for (const password of attempts) {
    try {
      return await login(identifier, password);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Login failed for ${identifier}`);
};

const connectSocket = (token: string, label: string) => {
  const socket = createClient(socketUrl, {
    transports: ['websocket'],
    reconnection: false,
    auth: { token }
  });

  const ready = new Promise<void>((resolve, reject) => {
    socket.once('connect', () => {
      console.log(`[socket] connected: ${label} (${socket.id})`);
      resolve();
    });
    socket.once('connect_error', error => {
      reject(new Error(`[socket] ${label} rejected: ${error.message}`));
    });
  });

  return { socket, ready };
};

const waitForEvent = (socket: Socket, eventName: string, timeoutMs = 5000) => {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    const handler = (payload: any) => {
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve(payload);
    };

    socket.on(eventName, handler);
  });
};

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const main = async () => {
  console.log('[test] Starting realtime verification');

  const studentLogin = await loginWithFallback('student');
  const accountantLogin = await loginWithFallback('accountant');
  const admin2Login = await loginWithFallback('admin2');

  assert(Boolean(studentLogin.user.profileId), 'Student account is missing a profileId');

  const fakeStudentToken = jwt.sign(
    {
      id: 'fake-student-user',
      username: 'fake.student',
      role: 'student',
      profileId: '507f1f77bcf86cd799439011',
      profileModel: 'Student'
    },
    jwtSecret,
    { expiresIn: '8h' }
  );

  const { socket: studentSocket, ready: studentReady } = connectSocket(studentLogin.token, 'student');
  const { socket: accountantSocket, ready: accountantReady } = connectSocket(accountantLogin.token, 'accountant');
  const { socket: admin2Socket, ready: admin2Ready } = connectSocket(admin2Login.token, 'admin2');
  const { socket: fakeStudentSocket, ready: fakeStudentReady } = connectSocket(fakeStudentToken, 'fake-student');

  const receivedStudent: any[] = [];
  const receivedAccountant: any[] = [];
  const receivedAdmin2: any[] = [];
  const receivedFakeStudent: any[] = [];

  studentSocket.on('fee:updated', payload => receivedStudent.push(payload));
  accountantSocket.on('fee:updated', payload => receivedAccountant.push(payload));
  admin2Socket.on('fee:updated', payload => receivedAdmin2.push(payload));
  fakeStudentSocket.on('fee:updated', payload => receivedFakeStudent.push(payload));

  try {
    await Promise.all([studentReady, accountantReady, admin2Ready, fakeStudentReady]);

    const unauthenticatedRejected = await new Promise<boolean>(resolve => {
      const probe = createClient(socketUrl, {
        transports: ['websocket'],
        reconnection: false
      });

      probe.once('connect', () => {
        probe.close();
        resolve(false);
      });

      probe.once('connect_error', () => {
        resolve(true);
      });
    });
    console.log(`[test] unauthenticated socket rejected: ${unauthenticatedRejected ? 'yes' : 'no'}`);
    assert(unauthenticatedRejected, 'Unauthenticated socket was not rejected');

    const paymentAmount = 1;
    const studentEventPromise = waitForEvent(studentSocket, 'fee:updated');
    const accountantEventPromise = waitForEvent(accountantSocket, 'fee:updated');
    const admin2EventPromise = waitForEvent(admin2Socket, 'fee:updated');

    const paymentResponse = await fetch(`${baseApiUrl}/accountant/students/${studentLogin.user.profileId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accountantLogin.token}`
      },
      body: JSON.stringify({
        amount: paymentAmount,
        installment: 'Realtime test',
        mode: 'UPI',
        category: 'Tuition Fee',
        date: '07 Jul 2026'
      })
    });

    const paymentPayload = await paymentResponse.json();
    assert(paymentResponse.ok, `Payment request failed: ${paymentPayload?.message || paymentResponse.statusText}`);

    const [studentEvent, accountantEvent, admin2Event] = await Promise.all([
      studentEventPromise,
      accountantEventPromise,
      admin2EventPromise
    ]);

    await new Promise(resolve => setTimeout(resolve, 500));

    assert(receivedStudent.length > 0, 'Student socket did not receive fee:updated');
    assert(receivedAccountant.length > 0, 'Accountant socket did not receive fee:updated');
    assert(receivedAdmin2.length > 0, 'Admin2 socket did not receive fee:updated');
    assert(receivedFakeStudent.length === 0, 'Fake student received an event for another student');

    console.log('[test] fee:updated payloads');
    console.log(JSON.stringify({ studentEvent, accountantEvent, admin2Event }, null, 2));
    console.log('[test] room isolation confirmed: unrelated student socket received no fee event');

    console.log('[test] student room should be student:' + String(studentLogin.user.profileId));
    console.log('[test] accountant room should be role:accountant');
    console.log('[test] admin2 room should be role:admin2');

    console.log('[test] realtime verification passed');
  } finally {
    studentSocket.close();
    accountantSocket.close();
    admin2Socket.close();
    fakeStudentSocket.close();
  }
};

main().catch(error => {
  console.error('[test] realtime verification failed');
  console.error(error);
  process.exitCode = 1;
});
