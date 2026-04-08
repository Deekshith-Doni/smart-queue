import { io } from 'socket.io-client';

// In development, the backend might run on port 5000 or 5001.
// If serving from the same server (production), we use window.location.origin.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000' // Main server port
    : window.location.origin
);

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
});

socket.on('connect', () => {
  console.log('Connected to real-time queue engine');
});

socket.on('disconnect', () => {
  console.log('Disconnected from real-time queue engine');
});
