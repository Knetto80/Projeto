/**
 * pool.js — única porta de acesso ao MySQL.
 * Os Models usam apenas `query()` e `transaction()`; nenhum outro arquivo
 * conhece detalhes do driver.
 */
const mysql = require('mysql2/promise');
const config = require('../config');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...config.db,
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true, // DECIMAL volta como number (e não string)
      charset: 'utf8mb4',
      ssl: config.db.ssl,
      typeCast(field, next) {
        // BOOLEAN do MySQL é TINYINT(1): converte para true/false
        if (field.type === 'TINY' && field.length === 1) return field.string() === '1';
        return next();
      },
    });
  }
  return pool;
}

/** Executa um SQL parametrizado (prepared-style, protege contra SQL Injection). */
async function query(sql, params = [], conn = null) {
  const [rows] = await (conn || getPool()).query(sql, params);
  return rows;
}

/** Executa `fn(conn)` dentro de uma transação (COMMIT se ok, ROLLBACK se erro). */
async function transaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function fechar() {
  if (pool) await pool.end();
  pool = null;
}

module.exports = { query, transaction, fechar };
