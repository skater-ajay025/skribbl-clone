import { io } from 'socket.io-client';

const url = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);
export const socket = io(url, { autoConnect: true, transports: ['websocket', 'polling'] });
