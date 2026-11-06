const config = require('./src/config');
const criarApp = require('./src/app');
const { inicializarBanco } = require('./src/db/setup');

(async () => {
  try {
    await inicializarBanco();
    criarApp().listen(config.port, () => {
      console.log(`🧁 Cupcakes Gourmet rodando em http://localhost:${config.port}`);
      console.log(`🗄️  MySQL: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`);
    });
  } catch (err) {
    console.error('❌ Não foi possível iniciar. Verifique se o MySQL está no ar e as credenciais (.env):');
    console.error('   ', err.message);
    process.exit(1);
  }
})();
