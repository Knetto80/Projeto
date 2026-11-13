const fs = require('fs');
const path = require('path');

// Carrega backend/.env (se existir) sem precisar de nenhuma biblioteca.
// Variáveis já definidas no ambiente têm prioridade sobre o arquivo.
const arquivoEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(arquivoEnv)) {
  for (const linha of fs.readFileSync(arquivoEnv, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !linha.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

// Configuração central — tudo pode ser sobrescrito por variáveis de ambiente
// (veja .env.example). Os valores padrão servem para o docker-compose.yml.
module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'cupcakes-gourmet-dev-secret',
  emailSimulado: process.env.EMAIL_SIMULADO !== 'false',
  adminSenhaInicial: process.env.ADMIN_PASSWORD || 'admin1234',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'cupcakes',
    password: process.env.DB_PASSWORD || 'cupcakes123',
    database: process.env.DB_NAME || 'cupcakes_gourmet',
    // Bancos gerenciados na nuvem (ex.: Aiven) exigem conexão criptografada.
    // DB_SSL=true liga o SSL; DB_SSL_REJECT_UNAUTHORIZED=false aceita o certificado
    // sem validar a CA (suficiente para demonstração; em produção informe DB_SSL_CA).
    ssl: process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}),
        }
      : undefined,
  },
};

// O segredo padrão está público no repositório: quem o conhecer consegue forjar um token de
// administrador. Em produção o servidor se recusa a iniciar com ele.
const SEGREDOS_FRACOS = ['cupcakes-gourmet-dev-secret', 'troque-esta-chave-em-producao'];
if (SEGREDOS_FRACOS.includes(module.exports.jwtSecret)) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET inseguro: defina uma chave longa e aleatória na variável de ambiente JWT_SECRET.');
  }
  if (process.env.NODE_ENV !== 'test') console.warn('⚠️  Usando JWT_SECRET de desenvolvimento. Defina JWT_SECRET antes de publicar o sistema.');
}
