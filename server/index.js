require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { authMiddleware } = require('./middleware/auth');
const db = require('./db/db');

const authRouter = require('./routes/auth');
const exercisesRouter = require('./routes/exercises');
const plansRouter = require('./routes/plans');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for production environments (Render, Nginx, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Body parser middleware with 50MB limit for database backups
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser & Persistent JWT Authentication middleware
app.use(cookieParser());
app.use(authMiddleware);

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

// Static files options
const staticOptions = {
  maxAge: '1d',
  etag: true,
  lastModified: true
};

// Serve shared static assets (locales, categories data, launcher icons/manifest)
app.use('/locales', express.static(path.join(__dirname, '../public/locales'), staticOptions));
app.use('/data', express.static(path.join(__dirname, '../public/data'), staticOptions));
app.use('/assets', express.static(path.join(__dirname, '../public/assets'), staticOptions));

// Serve compiled Vue 3 frontend (client/dist)
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath, staticOptions));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/plans', plansRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);

// Fallback route for Vue 3 SPA HTML5 History Navigation
app.get('*', (req, res, next) => {
  // Never intercept API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint API non trovato' });
  }

  const vueIndexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(vueIndexPath)) {
    return res.sendFile(vueIndexPath);
  }

  res.status(404).send('Frontend build not found. Run npm run build.');
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
