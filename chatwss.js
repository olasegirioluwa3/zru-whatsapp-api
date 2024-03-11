const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
      origin: 'http://localhost:3001', // Replace with the origin of your client app
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('chatMessage', (message) => {
    console.log('Chat message received:', message);

    // Broadcast the message to all connected clients (including the sender)
    io.emit('chatMessage', message);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
