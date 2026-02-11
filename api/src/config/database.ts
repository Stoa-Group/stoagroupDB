import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

/** Build config at call time so scripts that load dotenv after import still see env vars. */
function getConfig(): sql.config {
  const requestTimeoutMs = Number(process.env.DB_REQUEST_TIMEOUT_MS) || 300_000; // 5 min default (dashboard/snapshot read 224k+ rows)
  return {
    server: process.env.DB_SERVER || '',
    database: process.env.DB_DATABASE || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    requestTimeout: requestTimeoutMs,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

let pool: sql.ConnectionPool | null = null;

export const getConnection = async (): Promise<sql.ConnectionPool> => {
  if (!pool) {
    try {
      pool = await sql.connect(getConfig());
      console.log('Connected to Azure SQL Database');
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }
  return pool;
};

export const closeConnection = async (): Promise<void> => {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('Database connection closed');
  }
};

export default getConfig;

