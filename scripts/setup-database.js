/**
 * Script untuk setup database dengan default users yang ter-hash
 * Jalankan: node scripts/setup-database.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SALT_ROUNDS = 12;

// Default users dengan password yang akan di-hash
const DEFAULT_USERS = [
  {
    id: 'admin-001',
    username: 'admin',
    password: 'admin123',
    name: 'Administrator HR',
    role: 'admin',
    department: 'Human Resources',
    position: 'HR Manager',
    email: 'admin@lestaribumi.co.id',
    phone: '081234567890',
  },
  {
    id: 'emp-001',
    username: 'budi',
    password: 'budi123',
    name: 'Budi Santoso',
    role: 'employee',
    department: 'Operations',
    position: 'Field Supervisor',
    email: 'budi@lestaribumi.co.id',
    phone: '081234567891',
  },
  {
    id: 'emp-002',
    username: 'siti',
    password: 'siti123',
    name: 'Siti Rahayu',
    role: 'employee',
    department: 'Operations',
    position: 'Field Staff',
    email: 'siti@lestaribumi.co.id',
    phone: '081234567892',
  },
  {
    id: 'emp-003',
    username: 'agus',
    password: 'agus123',
    name: 'Agus Wijaya',
    role: 'employee',
    department: 'Engineering',
    position: 'Technician',
    email: 'agus@lestaribumi.co.id',
    phone: '081234567893',
  },
];

async function setupDatabase() {
  console.log('===========================================');
  console.log('Database Setup Script');
  console.log('PT Lestari Bumi Persada - Sistem Presensi');
  console.log('===========================================\n');

  // Database configuration
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  const dbName = process.env.DB_NAME || 'presensi_db';

  let connection;

  try {
    // Connect to MySQL server
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully!\n');

    // Create database if not exists
    console.log(`Creating database "${dbName}" if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('Database ready!\n');

    // Use the database
    await connection.query(`USE ${dbName}`);

    // Read and execute schema file
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Remove the CREATE DATABASE and USE statements from schema (we already did that)
    schema = schema.replace(/CREATE DATABASE IF NOT EXISTS.*?;/gi, '');
    schema = schema.replace(/USE presensi_db;/gi, '');
    
    // Remove the default user inserts (we'll do them with hashed passwords)
    schema = schema.replace(/-- Default Admin User[\s\S]*?ON DUPLICATE KEY UPDATE id = id;/gi, '');
    schema = schema.replace(/-- Default Employees[\s\S]*?ON DUPLICATE KEY UPDATE id = id;/gi, '');
    
    console.log('Executing schema...');
    await connection.query(schema);
    console.log('Schema executed successfully!\n');

    // Insert users with hashed passwords
    console.log('Creating users with hashed passwords...');
    
    for (const user of DEFAULT_USERS) {
      console.log(`  - Creating user: ${user.username}...`);
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      
      await connection.query(
        `INSERT INTO users (id, username, password, name, role, department, position, email, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password = VALUES(password)`,
        [user.id, user.username, hashedPassword, user.name, user.role, user.department, user.position, user.email, user.phone]
      );
      console.log(`    Password hash: ${hashedPassword.substring(0, 20)}...`);
    }

    console.log('\nAll users created successfully!\n');

    // Display summary
    console.log('===========================================');
    console.log('Setup Complete!');
    console.log('===========================================');
    console.log('\nDefault Login Credentials:');
    console.log('-------------------------------------------');
    DEFAULT_USERS.forEach(user => {
      console.log(`  ${user.role.padEnd(10)} | ${user.username.padEnd(10)} | ${user.password}`);
    });
    console.log('-------------------------------------------');
    console.log('\nIMPORTANT: Change these passwords in production!\n');

  } catch (error) {
    console.error('\nError during setup:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the setup
setupDatabase();
