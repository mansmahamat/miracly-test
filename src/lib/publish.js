import { cp, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const base = 'https://videos.example.com';
const slugFor = page => `${page.customer}-${page.page.service.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
export async function publishApproved({ root, job }) {
  if (job.status !== 'approved') throw new Error('Only approved jobs may be published');
  const slug = slugFor(job.page), from = join(root, 'output', slug, '16x9'), to = join(root, 'public', slug);
  await mkdir(to, { recursive: true });
  await cp(from, to, { recursive: true });
  // Use the post-Whisper captions generated for the final 16:9 render, not
  // the provisional timing file produced with the initial TTS pass.
  await copyFile(join(root, 'output', slug, '16x9.vtt'), join(to, 'captions.vtt'));
  await rm(join(to, 'captions.approximate.vtt'), { force: true });
  await new Promise((resolve, reject) => { const child = spawn('ffmpeg', ['-y', '-ss', '22', '-i', join(to, 'video.mp4'), '-frames:v', '1', join(to, 'poster.jpg')], { stdio: 'ignore' }); child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error('Could not generate poster'))); });
  const description = job.page.summary.replace(/"/g, '&quot;');
  await writeFile(join(to, 'embed.html'), `<video poster="${base}/${slug}/poster.jpg" preload="none" playsinline controls loading="lazy"><source src="${base}/${slug}/video-with-voice.mp4" type="video/mp4"><track kind="captions" src="${base}/${slug}/captions.vtt" srclang="en" label="English"></video>\n`);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'VideoObject', name: job.page.headline, description: job.page.summary, thumbnailUrl: `${base}/${slug}/poster.jpg`, uploadDate: new Date().toISOString(), duration: 'PT25S', contentUrl: `${base}/${slug}/video-with-voice.mp4` };
  await writeFile(join(to, 'video.jsonld'), JSON.stringify(jsonLd, null, 2));
  const published = await readPublished(root);
  const urls = published.map(item => `<url><loc>${base}/${item}/embed.html</loc></url>`).join('');
  await writeFile(join(root, 'public', 'video-sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  const links = published.map(item => `<li><a href="/${item}/embed.html">${item.replaceAll('-', ' ')}</a></li>`).join('');
  await writeFile(join(root, 'public', 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Miracly Video Library</title><style>body{max-width:720px;margin:10vh auto;padding:0 24px;font:16px/1.5 system-ui,sans-serif;color:#202020}h1{letter-spacing:-.04em}a{color:#2456c6}</style></head><body><h1>Published videos</h1><p>Approved video embeds and supporting metadata.</p><ul>${links}</ul></body></html>`);
  return { slug, url: `${base}/${slug}/embed.html` };
}
async function readPublished(root) { const { readdir } = await import('node:fs/promises'); try { return (await readdir(join(root, 'public'), { withFileTypes: true })).filter(item => item.isDirectory()).map(item => item.name); } catch { return []; } }
