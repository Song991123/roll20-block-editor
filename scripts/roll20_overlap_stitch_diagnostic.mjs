#!/usr/bin/env node
/**
 * Stitch scrolled Roll20 viewport/root segments by visual overlap.
 *
 * This is a diagnostic fallback for cases where the Roll20 iframe can be
 * visually scrolled but the iframe DOM/scrollTop is not readable. It does not
 * create trusted full-root evidence by itself. Use it to inspect whether the
 * captured segments are coherent enough to justify a stricter DPR-corrected
 * recapture or manual manifest.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const outPath = path.resolve(argOf('--out', 'roll20-overlap-stitch-diagnostic.png'));
const minOverlap = Number(argOf('--min-overlap', '80'));
const maxOverlapArg = Number(argOf('--max-overlap', '460'));
const step = Number(argOf('--step', '4'));
const imageArgs = args.filter((arg, index) => {
  if (arg.startsWith('--')) return false;
  const prev = args[index - 1];
  return !['--out', '--min-overlap', '--max-overlap', '--step'].includes(prev);
}).map((file) => path.resolve(file));

if (imageArgs.length < 2) {
  console.error('Usage: node scripts/roll20_overlap_stitch_diagnostic.mjs --out <out.png> <segment-000> <segment-001> [...]');
  process.exit(2);
}

function argOf(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

async function imageDataUrl(file) {
  const bytes = await readFile(file);
  return `data:${mimeTypeForBytes(bytes, file)};base64,${bytes.toString('base64')}`;
}

function mimeTypeForBytes(bytes, file = '') {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  const ext = path.extname(file).toLowerCase();
  return ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
}

async function main() {
  for (const file of imageArgs) {
    if (!existsSync(file)) throw new Error(`Missing segment image: ${file}`);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  try {
    const images = [];
    for (const file of imageArgs) {
      images.push({ file, dataUrl: await imageDataUrl(file) });
    }
    const result = await page.evaluate(async ({ images, minOverlap, maxOverlapArg, step }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('image load failed'));
          image.src = src;
        });
      }
      function imageToCanvas(image) {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        return { canvas, ctx, width: canvas.width, height: canvas.height };
      }
      function scoreOverlap(prev, next, overlap) {
        const width = Math.min(prev.width, next.width);
        const x0 = Math.floor(width * 0.08);
        const x1 = Math.floor(width * 0.96);
        const sampleWidth = Math.max(1, x1 - x0);
        const prevData = prev.ctx.getImageData(x0, prev.height - overlap, sampleWidth, overlap).data;
        const nextData = next.ctx.getImageData(x0, 0, sampleWidth, overlap).data;
        let sum = 0;
        let count = 0;
        for (let i = 0; i < prevData.length; i += 16) {
          sum += Math.abs(prevData[i] - nextData[i]);
          sum += Math.abs(prevData[i + 1] - nextData[i + 1]);
          sum += Math.abs(prevData[i + 2] - nextData[i + 2]);
          count += 3;
        }
        return sum / Math.max(1, count);
      }
      function bestOverlap(prev, next) {
        const maxOverlap = Math.min(maxOverlapArg, prev.height - 20, next.height - 20);
        let best = null;
        for (let overlap = minOverlap; overlap <= maxOverlap; overlap += step) {
          const score = scoreOverlap(prev, next, overlap);
          if (!best || score < best.score) best = { overlap, score };
        }
        return best;
      }

      const loaded = [];
      for (const item of images) {
        const image = await loadImage(item.dataUrl);
        loaded.push({ ...item, ...imageToCanvas(image) });
      }
      const placements = [{ index: 0, y: 0, overlapFromPrevious: null, score: null }];
      let currentY = 0;
      for (let i = 1; i < loaded.length; i += 1) {
        const match = bestOverlap(loaded[i - 1], loaded[i]);
        currentY += loaded[i - 1].height - match.overlap;
        placements.push({ index: i, y: currentY, overlapFromPrevious: match.overlap, score: match.score });
      }
      const outputWidth = Math.max(...loaded.map((item) => item.width));
      const outputHeight = Math.max(...placements.map((placement, i) => placement.y + loaded[i].height));
      const out = document.createElement('canvas');
      out.width = outputWidth;
      out.height = outputHeight;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, out.width, out.height);
      for (const placement of placements) {
        ctx.drawImage(loaded[placement.index].canvas, 0, placement.y);
      }
      return {
        dataUrl: out.toDataURL('image/png'),
        outputSize: { w: outputWidth, h: outputHeight },
        placements,
        segments: loaded.map((item, index) => ({ index, file: item.file, size: { w: item.width, h: item.height } })),
      };
    }, { images, minOverlap, maxOverlapArg, step });

    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, Buffer.from(result.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    const metaPath = outPath.replace(/\.png$/i, '.json');
    const transitionSummary = summarizeTransitions(result);
    const meta = {
      generatedAt: new Date().toISOString(),
      output: path.relative(process.cwd(), outPath),
      scope: 'visual-overlap diagnostic only; not trusted Roll20 full-root evidence',
      minOverlap,
      maxOverlap: maxOverlapArg,
      step,
      outputSize: result.outputSize,
      transitionSummary,
      placements: result.placements,
      segments: result.segments,
    };
    await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
    console.log(`ROLL20 OVERLAP STITCH DIAGNOSTIC OK ${path.relative(process.cwd(), outPath)}`);
    console.log(`size=${result.outputSize.w}x${result.outputSize.h}`);
    console.log(`segments=${result.segments.length}`);
    console.log(`advanceMedian=${transitionSummary.advanceMedian ?? 'n/a'} lowAdvance=${transitionSummary.lowAdvanceTransitions.length} highScore=${transitionSummary.highScoreTransitions.length}`);
    console.log(`meta=${path.relative(process.cwd(), metaPath)}`);
  } finally {
    await browser.close();
  }
}

function summarizeTransitions(result) {
  const placements = Array.isArray(result.placements) ? result.placements : [];
  const segments = Array.isArray(result.segments) ? result.segments : [];
  const transitions = [];
  for (let i = 1; i < placements.length; i += 1) {
    const previous = placements[i - 1];
    const current = placements[i];
    const advance = Number(current.y) - Number(previous.y);
    transitions.push({
      from: i - 1,
      to: i,
      advance,
      overlap: current.overlapFromPrevious,
      score: current.score,
    });
  }
  const advances = transitions.map((item) => item.advance).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const scores = transitions.map((item) => Number(item.score)).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const advanceMedian = median(advances);
  const scoreMedian = median(scores);
  const lowAdvanceLimit = advanceMedian == null ? 80 : Math.max(40, advanceMedian * 0.35);
  const highScoreLimit = scoreMedian == null ? 8 : Math.max(6, scoreMedian * 1.75);
  const segmentHeights = segments
    .map((segment) => Number(segment.size?.h ?? segment.size?.height))
    .filter((height) => Number.isFinite(height) && height > 0);
  return {
    transitionCount: transitions.length,
    advanceMin: advances[0] ?? null,
    advanceMax: advances[advances.length - 1] ?? null,
    advanceMedian,
    scoreMin: scores[0] ?? null,
    scoreMax: scores[scores.length - 1] ?? null,
    scoreMedian,
    segmentHeightMedian: median(segmentHeights.sort((a, b) => a - b)),
    lowAdvanceLimit,
    highScoreLimit,
    lowAdvanceTransitions: transitions.filter((item) => Number.isFinite(item.advance) && item.advance < lowAdvanceLimit),
    highScoreTransitions: transitions.filter((item) => Number.isFinite(item.score) && item.score > highScoreLimit),
  };
}

function median(values) {
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2
    ? Number(values[mid].toFixed(3))
    : Number(((values[mid - 1] + values[mid]) / 2).toFixed(3));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
