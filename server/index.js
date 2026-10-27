require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const initializeDatabase = require('./database/init');
const seedDatabase = require('./database/seed');

// Initialize schema & auto-seed if empty
initializeDatabase();
try {
  seedDatabase();
} catch (e) {
  console.log('Seed check:', e.message);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logger for dev
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check endpoint for cloud platforms (Render, Railway, Fly.io, etc.)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'MYSUBS — Sistema de Gestión de Nómina',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Mount API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/periods', require('./routes/periods'));
app.use('/api/payrolls', require('./routes/payrolls'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/parameters', require('./routes/parameters'));
app.use('/api/remunerations', require('./routes/remunerations'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/regimes', require('./routes/regimes'));
app.use('/api/audit', require('./routes/audit'));

// Serve frontend client in production
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
  app.use(express.static(clientDistPath));

  app.get(/.*/, (req, res) => {
    if (!req.originalUrl.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Endpoint no encontrado' });
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'MYSUBS Nómina API está ejecutándose. El cliente frontend debe compilarse con "npm run build" o ejecutarse con "npm run dev".',
      health: '/api/health'
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Error interno del servidor', details: err.message });
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(` MYSUBS — Sistema de Gestión de Nómina`);
    console.log(` Servidor activo en: http://localhost:${PORT}`);
    console.log(` Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`===============================================`);
  });

  module.exports = server;
}

if (process.env.NODE_ENV === 'test') {
  module.exports = app;
}
