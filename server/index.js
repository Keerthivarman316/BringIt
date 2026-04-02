import express from "express";
import cors from "cors";
import authRoutes from './src/routes/auth.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Main sub-routes
app.use('/api/auth', authRoutes);

app.get("/", (req, res) => {
    res.send("BringIt API running 🚀");
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});