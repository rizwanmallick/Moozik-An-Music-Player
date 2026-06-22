require('dotenv').config();
const express = require("express");
const cookieParser = require("cookie-parser"); // Import cookie-parser
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

// Middleware setup
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Use cookie-parser middleware

// Routes
const indexRoute = require('./routes/home');
const chatRoute = require('./routes/chat')(io)
const authRouter = require('./routes/auth')
const aboutRouter = require('./routes/about')
const contactRouter = require('./routes/contact')


app.use('/', indexRoute);
app.use('/chat', chatRoute);
app.use('/auth', authRouter);
app.use('/about', aboutRouter);
app.use('/contact', contactRouter);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
