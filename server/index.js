require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./db/db');

const authRouter = require('./routes/auth');
const exercisesRouter = require('./routes/exercises');
const plansRouter = require('./routes/plans');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');

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

const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');

// Initialize i18next for Express
i18next.use(i18nextMiddleware.LanguageDetector).init({
  fallbackLng: 'it',
  preload: ['it', 'en'],
  detection: {
    order: ['querystring', 'cookie', 'header'],
    caches: ['cookie']
  }
});

app.use(i18nextMiddleware.handle(i18next));

// Serve static frontend assets & locales with optimal caching
const staticOptions = {
  maxAge: '1d',
  etag: true,
  lastModified: true
};
app.use('/locales', express.static(path.join(__dirname, '../public/locales'), staticOptions));
app.use(express.static(path.join(__dirname, '../public'), staticOptions));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/plans', plansRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);

// HTML Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
app.get('/builder', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/builder.html'));
});
app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/editor.html'));
});
app.get('/library', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/library.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});
app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/player.html'));
});

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
