/* ============================================================
   JIZURA — audio: decode, energy envelope, onset, BPM & beat grid
   ============================================================ */
(() => {
'use strict';

/* Compact, level-normalised descriptors; a quiet recording must not appear calm solely due to gain. */
J.audioFeatures = (energy, onset, bpm, duration, rate = 50, spectral = null) => {
  const clamp = x => Math.max(0, Math.min(1, x));
  const values = Array.from(energy || []).filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = p => values.length ? values[Math.min(values.length - 1, Math.floor(p * (values.length - 1)))] : 0;
  const p20 = percentile(.2), p50 = percentile(.5), p80 = percentile(.8);
  const attacks = Array.from(onset || []).filter(x => Number.isFinite(x) && x > .24).length;
  const blocks = [];
  const size = Math.max(1, Math.ceil((energy || []).length / 8));
  for (let i = 0; i < (energy || []).length; i += size) {
    let sum = 0; for (let j = i; j < Math.min(i + size, energy.length); j++) sum += energy[j];
    blocks.push(sum / Math.min(size, energy.length - i));
  }
  const low = blocks.length ? Math.min(...blocks) : 0, high = blocks.length ? Math.max(...blocks) : 0;
  const sectionChange = blocks.length > 1 ? blocks.slice(1).reduce((s, v, i) => s + Math.abs(v - blocks[i]), 0) / (blocks.length - 1) : 0;
  const density = clamp(attacks / Math.max(1, duration) / 3);
  const dynamics = clamp((p80 - p20) * 1.5);
  const development = clamp(sectionChange * 2 + (high - low) * .4);
  return { bpm: Number.isFinite(bpm) ? bpm : 0, intensity: clamp(p80), density,
    dynamics: clamp((p80 - p20) * 1.5), development: clamp(sectionChange * 2 + (high - low) * .4),
    median: clamp(p50), sections: blocks.map(v => +clamp(v).toFixed(3)),
    tempo: clamp((bpm - 65) / 115), energy: clamp(p50 * .65 + p80 * .35),
    onsetDensity: density, beatStrength: spectral?.beatStrength ?? 0,
    brightness: spectral?.brightness ?? .4, spectralFlux: spectral?.spectralFlux ?? 0,
    bass: spectral?.bass ?? .35, high: spectral?.high ?? .3,
    percussive: spectral?.percussive ?? density * .5,
    smoothness: spectral?.smoothness ?? clamp(1 - density * .7 - dynamics * .3),
    sectionContrast: spectral?.sectionContrast ?? development,
    timeline: spectral?.timeline ?? [] };
};

/* 1024-point radix-2 spectrum, sampled every 100 ms; no per-frame rendering work. */
function* spectralFrames(mono, sampleRate, energy, onset, duration, beatStrength = 0) {
  const N = 1024, step = Math.max(1, Math.floor(sampleRate / 10));
  const re = new Float64Array(N), im = new Float64Array(N), prev = new Float64Array(N / 2);
  const window = Float64Array.from({length:N},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(N-1)));
  // Reuse exactly the same butterfly coefficients for every frame. Compute them
  // with the original recurrence (rather than sin/cos per bin) to retain its
  // floating-point results, including accumulated rounding.
  const butterflies = [];
  for (let len = 2; len <= N; len *= 2) {
    const angle = -2 * Math.PI / len, wr = Math.cos(angle), wi = Math.sin(angle);
    const real = new Float64Array(len / 2), imaginary = new Float64Array(len / 2);
    let cr = 1, ci = 0;
    for (let j = 0; j < len / 2; j++) {
      real[j] = cr; imaginary[j] = ci;
      const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
    }
    butterflies.push({len, real, imaginary});
  }
  const swapIndices = [];
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) swapIndices.push(i, j);
  }
  const swaps = Uint16Array.from(swapIndices);
  const frequencyWeight = new Float64Array(N / 2), bassBand = new Uint8Array(N / 2), highBand = new Uint8Array(N / 2);
  for (let k = 1; k < N / 2; k++) {
    const hz = k * sampleRate / N;
    frequencyWeight[k] = Math.min(1, hz / 6000);
    bassBand[k] = hz < 250; highBand[k] = hz > 2500;
  }
  const frames = [], frameRate = 10;
  for (let pos = 0; pos + N < mono.length; pos += step) {
    for (let i = 0; i < N; i++) re[i] = mono[pos + i] * window[i];
    im.fill(0);
    for (let pair = 0; pair < swaps.length; pair += 2) { const i = swaps[pair], j = swaps[pair + 1], tmp = re[i]; re[i] = re[j]; re[j] = tmp; }
    for (const {len, real, imaginary} of butterflies) {
      for (let k = 0; k < N; k += len) {
        for (let j = 0; j < len / 2; j++) {
          const cr = real[j], ci = imaginary[j];
          const a = k + j, b = a + len / 2, tr = cr * re[b] - ci * im[b], ti = cr * im[b] + ci * re[b];
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        }
      }
    }
    let total = 0, weighted = 0, bass = 0, high = 0, flux = 0;
    for (let k = 1; k < N / 2; k++) {
      const v = Math.hypot(re[k], im[k]);
      total += v; weighted += v * frequencyWeight[k];
      if (bassBand[k]) bass += v; if (highBand[k]) high += v;
      flux += Math.max(0, v - prev[k]); prev[k] = v;
    }
    const t = pos / sampleRate, index = Math.min(energy.length - 1, Math.floor(t * 50));
    let attack=0;for(let j=index;j<Math.min(onset.length,index+5);j++)attack=Math.max(attack,onset[j]);
    frames.push({ time: t, energy: energy[index] || 0, onset: attack,
      brightness: total ? weighted / total : 0, bass: total ? bass / total : 0,
      high: total ? high / total : 0, spectralFlux: total ? Math.min(1, flux / total) : 0 });
    if (frames.length % 16 === 0) yield {current:frames.length,total:Math.max(0,Math.ceil((mono.length-N)/step))};
  }
  const timeline = [];
  let frameIndex = 0;
  for (let t = 0; t < duration; t += 3) {
    const start = frameIndex;
    while (frameIndex < frames.length && frames[frameIndex].time < t + 3) frameIndex++;
    const subset = frames.slice(start, frameIndex);
    const mean = k => subset.length ? subset.reduce((s, f) => s + f[k], 0) / subset.length : 0;
    timeline.push({ time: +t.toFixed(2), energy: mean('energy'), density: Math.min(1, subset.filter(f => f.onset > .24).length / Math.max(1, subset.length) * 5),
      brightness: mean('brightness'), bass: mean('bass'), high: mean('high'), spectralFlux: mean('spectralFlux') });
  }
  const mean = k => frames.length ? frames.reduce((s, f) => s + f[k], 0) / frames.length : 0;
  const levels = timeline.map(x => x.energy), min = Math.min(...levels, 0), max = Math.max(...levels, 0);
  const spectralFlux = Math.min(1, mean('spectralFlux') * 2.5);
  return { timeline, detailedTimeline:frames, statistics:Object.fromEntries(['energy','onset','brightness','bass','high','spectralFlux'].map(k=>{const a=frames.map(f=>f[k]||0).sort((a,b)=>a-b),n=a.length;return [k,{mean:mean(k),p90:a[Math.floor((n-1)*.9)]||0,peak:a[n-1]||0,dynamicRange:(a[Math.floor((n-1)*.9)]||0)-(a[Math.floor((n-1)*.1)]||0),confidence:n>20?.85:.35}]})), brightness: Math.min(1, mean('brightness') * 2.2), bass: Math.min(1, mean('bass') * 2), high: Math.min(1, mean('high') * 2),
    spectralFlux, beatStrength, percussive: Math.min(1, spectralFlux * .45 + beatStrength * .35 + mean('onset') * .6),
    smoothness: Math.max(0, 1 - spectralFlux * .6 - mean('onset') * .8), sectionContrast: Math.min(1, (max - min) * 1.2) };
};

// Both paths execute the same generator and arithmetic in the same order.
J.spectralTimeline = (...args) => {const iterator=spectralFrames(...args);let item;do{item=iterator.next();}while(!item.done);return item.value;};
J.spectralTimelineAsync = async (args, tick) => {const iterator=spectralFrames(...args);let item;while(!(item=iterator.next()).done)await tick(item.value.current,item.value.total);return item.value;};

J.analyzeAudio = async (file, {onStage, onProgress, signal} = {}) => {
  let stageId,lastYield=Date.now();
  const tick=async(current,total,detail='')=>{if(signal?.aborted)throw new Error('音源解析を中止しました');onProgress?.({stage:stageId,current,total,detail});if(onProgress&&Date.now()-lastYield>=12){await new Promise(resolve=>setTimeout(resolve,0));lastYield=Date.now();}};
  const stage = async (message,id) => {
    stageId=id;onProgress?.({stage:id,current:null,total:null,detail:message});
    if (signal?.aborted) throw new Error('音源解析を中止しました');
    onStage?.(message);
    if (onStage || onProgress) await new Promise(resolve => setTimeout(resolve, 0));
  };
  await stage('音源ファイルを読み込み中','read');
  const buf = await file.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  await stage('音源をデコード中','decode');
  const ac = new AC();
  let audioBuffer;
  try { audioBuffer = await ac.decodeAudioData(buf); } finally { try { await ac.close(); } catch (e) {} }
  await stage('波形・エネルギーを解析中','wave');
  const sr = audioBuffer.sampleRate, len = audioBuffer.length, ch = audioBuffer.numberOfChannels;
  const mono = new Float32Array(len);
  // Keep channel/sample arithmetic order unchanged; check UI yield points once
  // per chunk instead of millions of progress branches in the sample loop.
  const chunk = 262144;
  for (let c = 0; c < ch; c++) {
    const d = audioBuffer.getChannelData(c);
    for (let start = 0; start < len; start += chunk) {
      const end = Math.min(len, start + chunk);
      for (let i = start; i < end; i++) mono[i] += d[i] / ch;
      if (onProgress && end % chunk === 0) await tick(null, null, '音声チャンネルを合成しています');
    }
  }
  let peakAmplitude=0,clipCount=0;
  for (let start = 0; start < len; start += chunk) {
    const end = Math.min(len, start + chunk);
    for (let i = start; i < end; i++) {const a=Math.abs(mono[i]);if(a>peakAmplitude)peakAmplitude=a;if(a>=.998)clipCount++;}
    if (onProgress && end % chunk === 0) await tick(null, null, '音源の最大振幅を確認しています');
  }
  const rate = 50, hop = Math.round(sr / rate), n = Math.floor(len / hop);
  const energy = new Float32Array(n), flux = new Float32Array(n);
  let prevHP = 0, prevX = 0;
  for (let f = 0; f < n; f++) {
    let e = 0, eh = 0;
    for (let i = f * hop, end = Math.min(len, (f + 1) * hop); i < end; i++) {
      const x = mono[i]; e += x * x;
      const hp = 0.92 * (prevHP + x - prevX); prevHP = hp; prevX = x; eh += hp * hp;
    }
    energy[f] = Math.sqrt(e / hop);
    flux[f] = Math.sqrt(eh / hop);
    if(onProgress&&f%256===255)await tick(f+1,n,'波形・音楽の強弱を解析しています');
  }
  // onset strength: positive change of log high-passed energy vs local mean
  const onset = new Float32Array(n), logFlux = new Float64Array(n);
  for (let f = 0; f < n; f++) logFlux[f] = Math.log(1e-4 + flux[f]);
  for (let f = 1; f < n; f++) {
    const cur = logFlux[f];
    let m = 0, k = 0; for (let j = Math.max(0, f - 4); j < f; j++) { m += logFlux[j]; k++; }
    onset[f] = Math.max(0, cur - m / Math.max(1, k));
  }
  // Search the useful supporter-song range without preferring a particular tempo.
  // Autocorrelation naturally exposes half/double-time peaks; keep the detected
  // value and expose its metrical family so the editor can explain ambiguity.
  const minLag = Math.round(rate * 60 / J.BPM_RANGE.max), maxLag = Math.round(rate * 60 / J.BPM_RANGE.min);
  await stage('BPM・拍の位置を解析中','beat');
  let best = 0, bestLag = Math.round(rate * 0.5);
  const scores = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0; for (let f = lag; f < n; f++) s += onset[f] * onset[f - lag];
    scores[lag] = s;
    if(onProgress&&lag%8===0)await tick(lag-minLag+1,maxLag-minLag+1,'BPMの候補を比較しています');
    if (s > best) { best = s; bestLag = lag; }
  }
  let lagF = bestLag;
  if (scores[bestLag - 1] != null && scores[bestLag + 1] != null) {
    const a = scores[bestLag - 1], b = scores[bestLag], c = scores[bestLag + 1];
    const d = (a - 2 * b + c); if (d !== 0) lagF = bestLag + 0.5 * (a - c) / d;
  }
  const period = lagF / rate;
  // phase
  let bestPh = 0, bestPS = -1;
  for (let ph = 0; ph < lagF; ph += 0.5) {
    let s = 0; for (let t = ph; t < n; t += lagF) s += onset[Math.round(t)] || 0;
    if (s > bestPS) { bestPS = s; bestPh = ph; }
  }
  const beats = [];
  for (let t = bestPh / rate; t < audioBuffer.duration; t += period) beats.push(+t.toFixed(4));
  // normalised energy (0..1, 95th percentile)
  const sorted = Array.from(energy).sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const energyN = new Float32Array(n);
  for (let f = 0; f < n; f++) energyN[f] = Math.min(1, energy[f] / p95);
  // waveform peaks for the timeline
  const bins = 1600, peaks = new Float32Array(bins), per = Math.max(1, Math.floor(len / bins));
  for (let b = 0; b < bins; b++) { let m = 0; for (let i = b * per, e = Math.min(len, (b + 1) * per); i < e; i += 4) { const v = Math.abs(mono[i]); if (v > m) m = v; } peaks[b] = m; }
  const bpm = best > 1e-5 ? Math.round(60 / period * 10) / 10 : 0;
  const independentScores = scores.slice(minLag, maxLag + 1).filter((v, i) => Number.isFinite(v) && Math.abs(Math.log2((minLag + i) / bestLag)) > .12).sort((a,b)=>b-a);
  const secondPeak = independentScores[0] || 0;
  const tempoConfidence = best > 1e-5 ? Math.max(0, Math.min(1, (best - secondPeak) / best)) : 0;
  const bpmCandidates = J.bpmFamily ? J.bpmFamily(bpm) : (bpm ? [bpm] : []);
  await stage('周波数・曲の展開を解析中','spectrum');
  const beatStrength = best > 1e-5 ? Math.min(1, bestPS / (onset.reduce((s, v) => s + v, 0) / Math.max(1, lagF) + 1e-6)) : 0;
  const spectrum = onProgress ? await J.spectralTimelineAsync([mono,sr,energyN,onset,audioBuffer.duration,beatStrength],(current,total)=>tick(current,total,'周波数の特徴を解析しています')) : J.spectralTimeline(mono,sr,energyN,onset,audioBuffer.duration,beatStrength);
  await stage('音楽の特徴量をまとめています','features');
  const features=J.audioFeatures(energyN, onset, bpm, audioBuffer.duration, rate, spectrum);
  features.tempoConfidence=tempoConfidence;
  features.detailedTimeline=spectrum.detailedTimeline;features.statistics=spectrum.statistics;
  await tick(1,1,'音楽の特徴量を取得しました');
  return {
    name: file.name, duration: audioBuffer.duration, sampleRate: sr, buffer: audioBuffer,
    peakAmplitude,clipFraction:clipCount/Math.max(1,len),
    bpm, bpmCandidates, tempoConfidence, beats: bpm ? beats : [], energy: energyN, onset, energyRate: rate, peaks,
    features,
  };
};

J.bpmFamily = bpm => {
  const value=Number(bpm); if (!(value>0) || !Number.isFinite(value)) return [];
  return [...new Set([value/2,value,value*2].filter(v=>v>=J.BPM_RANGE.min&&v<=J.BPM_RANGE.max).map(v=>Math.round(v*10)/10))].sort((a,b)=>a-b);
};

/* rebuild a beat grid from a user BPM + first-beat offset */
J.beatGrid = (bpm, offset, duration) => {
  const out = []; if (!(bpm > 0)) return out;
  const p = 60 / bpm;
  for (let t = offset; t < duration + 0.01; t += p) if (t >= 0) out.push(+t.toFixed(4));
  return out;
};
})();
