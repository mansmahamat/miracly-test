import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const run = (command, args, env = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'pipe', env: { ...process.env, ...env } }); let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(`${command} failed: ${stderr}`)));
});
const words = text => text.trim().split(/\s+/).filter(Boolean);
export function approximateVtt(text, seconds = 20) {
  const tokens = words(text); const chunkSize = 5; const chunks = [];
  const stamp = n => new Date(n * 1000).toISOString().slice(11, 23).replace('.', ',');
  for (let i = 0; i < tokens.length; i += chunkSize) { const start = seconds * i / tokens.length, end = seconds * Math.min(tokens.length, i + chunkSize) / tokens.length; chunks.push(`${stamp(start)} --> ${stamp(end)}\n${tokens.slice(i, i + chunkSize).join(' ')}`); }
  return `WEBVTT\n\n${chunks.join('\n\n')}\n`;
}
export function whisperVtt(scriptText, timings) {
  const tokens = words(scriptText); const blocks = [];
  const stamp = n => new Date(n * 1000).toISOString().slice(11, 23).replace('.', ',');
  for (let index = 0; index < tokens.length; index += 5) {
    const first = timings[index], last = timings[Math.min(tokens.length - 1, index + 4)];
    if (!first || !last) throw new Error(`Whisper timings missing at script word ${index + 1}`);
    blocks.push(`${stamp(first.start)} --> ${stamp(last.end)}\n${tokens.slice(index, index + 5).join(' ')}`);
  }
  return `WEBVTT\n\n${blocks.join('\n\n')}\n`;
}
export async function createLocalVoice({ root, slug, script }) {
  const dir = join(root, 'output', slug, 'audio'); await mkdir(dir, { recursive: true });
  const sourceWav = join(dir, 'voice.kokoro.wav'), wav = join(dir, 'voice.wav');
  // Kokoro is local/offline once its model has been downloaded; its Python lives in .venv.
  await run('npx', ['hyperframes@0.8.139', 'tts', script.voiceover, '--voice', 'af_heart', '--speed', '0.9', '-o', sourceWav], { HYPERFRAMES_PYTHON: process.env.HYPERFRAMES_PYTHON || join(root, '.venv', 'bin', 'python') });
  await run('ffmpeg', ['-y', '-i', sourceWav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '2', wav]);
  await writeFile(join(dir, 'captions.approximate.vtt'), approximateVtt(script.captions, 25));
  return { wav, captions: join(dir, 'captions.approximate.vtt'), timingSource: 'deterministic provisional timing (replace with Whisper)' };
}
export async function muxVoice({ root, slug, format }) {
  const dir = join(root, 'output', slug, format); const voice = join(root, 'output', slug, 'audio', 'voice.wav');
  const bed = join(root, 'output', slug, 'audio', 'music-bed.wav');
  // Original procedural ambient bed: no third-party asset or licence dependency.
  await run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'aevalsrc=0.018*sin(2*PI*220*t)+0.011*sin(2*PI*277.18*t)+0.008*sin(2*PI*329.63*t):s=48000:d=25', '-af', 'lowpass=f=1000,afade=t=in:st=0:d=1.5,afade=t=out:st=22:d=3', '-ac', '2', bed]);
  await run('ffmpeg', ['-y', '-i', join(dir, 'video.mp4'), '-i', voice, '-i', bed, '-filter_complex', '[1:a]apad=pad_dur=25,asplit=2[voice_mix][voice_sidechain];[2:a][voice_sidechain]sidechaincompress=threshold=0.015:ratio=8:attack=20:release=400[ducked];[voice_mix][ducked]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[mix]', '-map', '0:v:0', '-map', '[mix]', '-t', '25', '-c:v', 'copy', '-c:a', 'aac', '-movflags', '+faststart', join(dir, 'video-with-voice.mp4')]);
  return join(dir, 'video-with-voice.mp4');
}
