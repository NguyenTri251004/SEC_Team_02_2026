import express, { Request, Response } from 'express';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  user: 'myuser',
  host: 'localhost',
  database: 'mydatabase',
  password: 'mypassword',
  port: 5432,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('✓ Connected to PostgreSQL database');
    release();
  }
});

// Middleware
app.use(express.json());
// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'hello world' });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API: Get data from PostgreSQL database
app.get('/api/data', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data from database'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
