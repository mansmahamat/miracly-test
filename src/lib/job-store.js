import { Pool } from 'pg';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function jobStore(root) {
  if (process.env.DATABASE_URL) return postgresStore(process.env.DATABASE_URL);
  return fileStore(join(root, 'jobs'));
}

function postgresStore(connectionString) {
  const pool = new Pool({ connectionString, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false } });
  let ready;
  const init = () => ready ||= pool.query(`CREATE TABLE IF NOT EXISTS video_jobs (
    id text PRIMARY KEY, status text NOT NULL, created_at timestamptz NOT NULL,
    page jsonb NOT NULL, result jsonb, decided_at timestamptz
  )`);
  const map = row => ({ id: row.id, status: row.status, createdAt: row.created_at, page: row.page, result: row.result, decidedAt: row.decided_at });
  return {
    async create(job) { await init(); await pool.query('INSERT INTO video_jobs (id,status,created_at,page) VALUES ($1,$2,$3,$4)', [job.id, job.status, job.createdAt, job.page]); return job; },
    async get(id) { await init(); const { rows } = await pool.query('SELECT * FROM video_jobs WHERE id=$1', [id]); return rows[0] && map(rows[0]); },
    async list() { await init(); const { rows } = await pool.query('SELECT * FROM video_jobs ORDER BY created_at DESC'); return rows.map(map); },
    async claim() { await init(); const { rows } = await pool.query(`WITH candidate AS (SELECT id FROM video_jobs WHERE status='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE video_jobs SET status='rendering' WHERE id IN (SELECT id FROM candidate) RETURNING *`); return rows[0] && map(rows[0]); },
    async save(job) { await init(); await pool.query('UPDATE video_jobs SET status=$2,result=$3,decided_at=$4 WHERE id=$1', [job.id, job.status, job.result || null, job.decidedAt || null]); return job; }
  };
}

function fileStore(dir) {
  const path = id => join(dir, `${id}.json`);
  return {
    async create(job) { await mkdir(dir, { recursive: true }); await writeFile(path(job.id), JSON.stringify(job, null, 2)); return job; },
    async get(id) { try { return JSON.parse(await readFile(path(id), 'utf8')); } catch { return null; } },
    async list() { await mkdir(dir, { recursive: true }); return Promise.all((await readdir(dir)).filter(x => x.endsWith('.json')).map(async x => JSON.parse(await readFile(join(dir, x), 'utf8')))); },
    async claim() { const jobs = await this.list(); const job = jobs.find(x => x.status === 'queued'); if (!job) return null; job.status = 'rendering'; return this.save(job); },
    async save(job) { await mkdir(dir, { recursive: true }); await writeFile(path(job.id), JSON.stringify(job, null, 2)); return job; }
  };
}
