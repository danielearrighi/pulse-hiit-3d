require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./db/db');

const authRouter = require('./routes/auth');
const exercisesRouter = require('./routes/exercises');
const plansRouter = require('./routes/plans');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cardio_hiit_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  })
);

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/plans', plansRouter);

// Fallback route for SPA / HTML navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize Database & Start Server
async function startServer() {
  try {
    await db.initDB();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🔥 Cardio HIIT Planner running on http://localhost:${PORT}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
