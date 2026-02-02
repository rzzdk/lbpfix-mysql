import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { query, queryOne } from './db';
import type { User } from './types';
import type { RowDataPacket } from 'mysql2';

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Password hashing configuration
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

// Session cookie name
const SESSION_COOKIE_NAME = 'presensi_session';

interface UserRow extends RowDataPacket {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'employee' | 'admin';
  department: string;
  position: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

interface JWTPayload {
  userId: string;
  username: string;
  role: 'employee' | 'admin';
  iat: number;
  exp: number;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Create a JWT token
 */
export async function createToken(user: { id: string; username: string; role: string }): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
}

/**
 * Get session cookie
 */
export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Login user and create session
 */
export async function loginUser(
  username: string,
  password: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    // Find user by username
    const userRow = await queryOne<UserRow>(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );

    if (!userRow) {
      return { error: 'Username tidak ditemukan' };
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, userRow.password);
    if (!isValidPassword) {
      return { error: 'Password salah' };
    }

    // Create JWT token
    const token = await createToken({
      id: userRow.id,
      username: userRow.username,
      role: userRow.role,
    });

    // Set session cookie
    await setSessionCookie(token);

    // Store session in database (optional, for session management)
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO sessions (id, user_id, token, expires_at) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)`,
      [sessionId, userRow.id, token, expiresAt]
    );

    // Return user data (without password)
    const user: User = {
      id: userRow.id,
      username: userRow.username,
      password: '', // Don't expose password
      name: userRow.name,
      role: userRow.role,
      department: userRow.department,
      position: userRow.position,
      email: userRow.email,
      phone: userRow.phone || '',
      createdAt: userRow.created_at,
    };

    return { user, token };
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return { error: 'Terjadi kesalahan saat login' };
  }
}

/**
 * Get current authenticated user from session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = await getSessionCookie();
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const userRow = await queryOne<UserRow>(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [payload.userId]
    );

    if (!userRow) return null;

    return {
      id: userRow.id,
      username: userRow.username,
      password: '',
      name: userRow.name,
      role: userRow.role,
      department: userRow.department,
      position: userRow.position,
      email: userRow.email,
      phone: userRow.phone || '',
      createdAt: userRow.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Logout user and clear session
 */
export async function logoutUser(): Promise<void> {
  try {
    const token = await getSessionCookie();
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        // Remove session from database
        await query('DELETE FROM sessions WHERE user_id = ?', [payload.userId]);
      }
    }
  } catch (error) {
    console.error('[Auth] Logout error:', error);
  } finally {
    await clearSessionCookie();
  }
}

/**
 * Verify if user is authenticated (middleware helper)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Verify if user is admin (middleware helper)
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Create a new user with hashed password
 */
export async function createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User | { error: string }> {
  try {
    // Check if username already exists
    const existing = await queryOne<UserRow>(
      'SELECT id FROM users WHERE username = ?',
      [userData.username]
    );

    if (existing) {
      return { error: 'Username sudah digunakan' };
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Generate user ID
    const userId = `emp-${Date.now()}`;

    // Insert new user
    await query(
      `INSERT INTO users (id, username, password, name, role, department, position, email, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userData.username,
        hashedPassword,
        userData.name,
        userData.role,
        userData.department,
        userData.position,
        userData.email,
        userData.phone,
      ]
    );

    return {
      id: userId,
      ...userData,
      password: '',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Auth] Create user error:', error);
    return { error: 'Terjadi kesalahan saat membuat user' };
  }
}

export default {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  loginUser,
  logoutUser,
  getCurrentUser,
  isAuthenticated,
  isAdmin,
  createUser,
};
