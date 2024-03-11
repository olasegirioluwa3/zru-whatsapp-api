const express = require('express');
require('dotenv').config();
const { sequelize } = require('./models/index');
const socketIO = require('socket.io');
const http = require('http');
// Import error logging middleware
const errorLoggerMiddleware = require('./errorLogger');

// Use error logging middleware
const app = express();
const server = http.createServer(app);
const cors = require('cors');
const io = socketIO(server, {
  cors: {
    origin: ["https://zionrebornuniversity.com.ng","http://localhost:3001"], 
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(errorLoggerMiddleware);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("/public"));
app.use('/uploads', express.static("public/uploads"));
// app.use('/profileimgs', express.static("public/profileimgs"));


// Import and use the userRoutes function passing app and io
const userRoutes = require('./routes/userRoutes');
const utilSocialMetaRoutes = require('./routes/utilSocialMetaRoutes');
// require("./app/user/routes/index.routes.js")(app);
// require("./app/project/routes/index.routes.js")(app);

userRoutes(app, io, sequelize);
utilSocialMetaRoutes(app, io, sequelize);

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
