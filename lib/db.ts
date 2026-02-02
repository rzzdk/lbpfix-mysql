import mysql from 'mysql2/promise';

/**
 * MySQL Database Configuration
 * Konfigurasi koneksi database dengan connection pooling untuk performa optimal
 */

// Validasi environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.warn(`Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
}

// Database connection configuration
const dbConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'presensi_db',
  
  // Connection Pool Settings (Best Practice)
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  maxIdle: parseInt(process.env.DB_MAX_IDLE || '10', 10),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '60000', 10),
  queueLimit: 0,
  
  // Security Settings
  multipleStatements: false, // Mencegah SQL injection dengan multiple statements
  
  // Timezone Configuration
  timezone: '+07:00', // WIB (Indonesia)
  
  // Character Set (untuk mendukung karakter Indonesia)
  charset: 'utf8mb4',
  
  // SSL Configuration (aktifkan di production)
  ...(process.env.DB_SSL === 'true' && {
    ssl: {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    },
  }),
};

// Global connection pool (singleton pattern)
let pool: mysql.Pool | null = null;

/**
 * Get database connection pool
 * Menggunakan singleton pattern untuk efisiensi koneksi
 */
export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    
    // Handle pool errors
    pool.on('connection', (connection) => {
      console.log('[DB] New connection established:', connection.threadId);
    });
    
    pool.on('release', (connection) => {
      console.log('[DB] Connection released:', connection.threadId);
    });
  }
  return pool;
}

/**
 * Execute a parameterized query (mencegah SQL injection)
 * @param sql - SQL query dengan placeholder (?)
 * @param params - Parameter values
 */
export async function query<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const pool = getPool();
  try {
    const [results] = await pool.execute(sql, params);
    return results as T;
  } catch (error) {
    console.error('[DB] Query error:', error);
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 * @param queries - Array of {sql, params} objects
 */
export async function transaction<T = unknown>(
  queries: Array<{ sql: string; params?: unknown[] }>
): Promise<T[]> {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const results: T[] = [];
    for (const { sql, params = [] } of queries) {
      const [result] = await connection.execute(sql, params);
      results.push(result as T);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    console.error('[DB] Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get a single row from query result
 */
export async function queryOne<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const results = await query<T[]>(sql, params);
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

/**
 * Check database connection health
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('[DB] Connection check failed:', error);
    return false;
  }
}

/**
 * Close all connections in the pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection pool closed');
  }
}

// Type exports for MySQL results
export type { ResultSetHeader, RowDataPacket } from 'mysql2';

export default {
  getPool,
  query,
  queryOne,
  transaction,
  checkConnection,
  closePool,
};
