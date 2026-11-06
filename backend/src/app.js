const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

function criarApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API REST (padrão MVC: routes -> controllers -> services/models)
  app.use('/api', routes);

  // Front-end estático (mobile-first — ver /frontend)
  const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
  app.use(express.static(FRONTEND_DIR));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}

module.exports = criarApp;
