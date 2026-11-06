/**
 * setup.js — prepara o banco: cria o database, aplica o schema.sql e
 * insere os dados de demonstração (somente se o banco estiver vazio).
 *
 *   npm run db:setup           -> cria/popula se necessário
 *   npm run db:reset           -> APAGA e recria tudo do zero
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config');
const { query, fechar } = require('./pool');

async function criarDatabase({ reset }) {
  const conn = await mysql.createConnection({
    host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password, ssl: config.db.ssl,
  });
  const nome = config.db.database;
  try {
    if (reset) await conn.query(`DROP DATABASE IF EXISTS \`${nome}\``);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${nome}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } catch (err) {
    // Em bancos gerenciados o usuário pode não ter permissão de CREATE DATABASE;
    // nesse caso o database já existe (ex.: "defaultdb") e seguimos em frente.
    console.warn(`⚠️  Não foi possível criar o database "${nome}" (${err.code}); assumindo que ele já existe.`);
  }
  await conn.end();
}

async function aplicarSchema() {
  const existe = await query(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = 'tb_usuario'",
    [config.db.database]
  );
  if (existe[0].n > 0) return false;

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const comandos = sql
    .split('\n')
    .filter((linha) => !linha.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c && !/^(CREATE DATABASE|USE)\b/i.test(c));
  for (const comando of comandos) await query(comando);
  return true;
}

async function inicializarBanco({ reset = false } = {}) {
  await criarDatabase({ reset });
  const criouTabelas = await aplicarSchema();
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM tb_categoria');
  if (n === 0) {
    await require('../data/seed')();
    console.log('🌱 Dados de demonstração inseridos.');
  }
  return criouTabelas;
}

module.exports = { inicializarBanco };

if (require.main === module) {
  inicializarBanco({ reset: process.argv.includes('--reset') })
    .then(() => console.log('✅ Banco pronto:', config.db.database))
    .catch((e) => { console.error('❌ Falha ao preparar o banco:', e.message); process.exitCode = 1; })
    .finally(fechar);
}
