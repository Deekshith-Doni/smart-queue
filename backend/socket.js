let io;

export const initSocket = (serverIo) => {
  io = serverIo;
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const emitQueueUpdate = (data) => {
  if (io) {
    io.emit('queueUpdate', data);
  }
};
