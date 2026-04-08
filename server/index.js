import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
// Routes
import authRoutes from './src/routes/auth.routes.js';
import dropZoneRoutes from './src/routes/dropzone.routes.js';
import tripRoutes from './src/routes/trip.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import matchRoutes from './src/routes/match.routes.js';
import deliveryRoutes from './src/routes/delivery.routes.js';
import reviewRoutes from './src/routes/review.routes.js';
import groupRoutes from './src/routes/group.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import { prisma } from './src/lib/prisma.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));
app.use(express.json());

// Main sub-routes
app.use('/api/auth', authRoutes);
app.use('/api/dropzones', dropZoneRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/payments', paymentRoutes);

app.get("/", (req, res) => {
    res.send("BringIt API running 🚀");
});

// Socket.io connection listener
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join_trip_tracking", (tripId) => {
    socket.join(`trip_${tripId}`);
    console.log(`Socket ${socket.id} joined trip_${tripId}`);
  });

  socket.on("update_location", async (data) => {
    try {
      io.to(`trip_${data.tripId}`).emit("location_updated", {
         tripId: data.tripId,
         lat: data.lat,
         lng: data.lng,
         timestamp: new Date()
      });

      await prisma.trip.update({
        where: { id: data.tripId },
        data: {
          currentLat: data.lat,
          currentLng: data.lng,
          lastLocationAt: new Date()
        }
      });
    } catch (err) {
      console.error("Location update error", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

httpServer.listen(5000, () => {
    console.log("Server & WebSockets running on port 5000");
});