import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
// Routes
import authRoutes from './src/routes/auth.routes.js';
import dropZoneRoutes from './src/routes/dropzone.routes.js';
import tripRoutes from './src/routes/trip.routes.js';
import orderRoutes from './src/routes/order.routes.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Main sub-routes
app.use('/api/auth', authRoutes);
app.use('/api/dropzones', dropZoneRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/orders', orderRoutes);

app.get("/", (req, res) => {
    res.send("BringIt API running 🚀");
});

// Socket.io connection listener
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

httpServer.listen(5000, () => {
    console.log("Server & WebSockets running on port 5000");
});