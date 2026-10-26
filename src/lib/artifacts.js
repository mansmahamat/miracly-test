import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const client = process.env.S3_ENDPOINT ? new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION || 'ams', forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } }) : null;
const bucket = process.env.S3_BUCKET;
export const cloudArtifacts = Boolean(client && bucket);

async function files(dir) { const entries = await readdir(dir, { withFileTypes: true }); return (await Promise.all(entries.map(async entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]))).flat(); }
export async function uploadRender(root, slug) { if (!cloudArtifacts) return; const dir = join(root, 'output', slug); for (const file of await files(dir)) await client.send(new PutObjectCommand({ Bucket: bucket, Key: `output/${slug}/${relative(dir, file)}`, Body: await readFile(file) })); }
export async function readArtifact(key) { const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: `output/${key}` })); return Buffer.from(await response.Body.transformToByteArray()); }
