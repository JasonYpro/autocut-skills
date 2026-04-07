import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import type { DeleteSegment, CutResult, ExportOptions } from './types.js';

const BUFFER_MS = 50;
const CROSSFADE_MS = 30;

interface Encoder {
  name: string;
  args: string;
  label: string;
}

function canUseEncoder(enc: Encoder): boolean {
  const testCmd = enc.name === 'h264_vaapi'
    ? `ffmpeg -y -f lavfi -i testsrc=size=128x128:rate=1 -t 1 -vf "format=nv12,hwupload" -vaapi_device /dev/dri/renderD128 -c:v ${enc.name} ${enc.args} -f null -`
    : `ffmpeg -y -f lavfi -i testsrc=size=128x128:rate=1 -t 1 -c:v ${enc.name} ${enc.args} -f null -`;

  try {
    execSync(testCmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function detectEncoder(): Encoder {
  const platform = process.platform;
  const encoders: Encoder[] = [];

  if (platform === 'darwin') {
    encoders.push({ name: 'h264_videotoolbox', args: '-q:v 60', label: 'VideoToolbox (macOS)' });
  } else if (platform === 'win32') {
    encoders.push({ name: 'h264_nvenc', args: '-gpu 0 -preset p4 -cq 20', label: 'NVENC (NVIDIA)' });
    encoders.push({ name: 'h264_qsv', args: '-global_quality 20', label: 'QSV (Intel)' });
    encoders.push({ name: 'h264_amf', args: '-quality balanced', label: 'AMF (AMD)' });
  } else {
    encoders.push({ name: 'h264_nvenc', args: '-gpu 0 -preset p4 -cq 20', label: 'NVENC (NVIDIA)' });
    encoders.push({ name: 'h264_vaapi', args: '-qp 20', label: 'VAAPI (Linux)' });
  }

  encoders.push({ name: 'libx264', args: '-preset fast -crf 18', label: 'x264 (软件)' });

  let encoderList = '';
  try {
    encoderList = execSync('ffmpeg -hide_banner -encoders', { stdio: 'pipe' }).toString();
  } catch {
    encoderList = '';
  }

  for (const enc of encoders) {
    try {
      if (!encoderList.includes(enc.name)) continue;
      if (!canUseEncoder(enc)) {
        console.log(`⚠️ 编码器存在但不可用，跳过: ${enc.label}`);
        continue;
      }
      console.log(`🎯 检测到编码器: ${enc.label}`);
      return enc;
    } catch {
      // continue
    }
  }

  return { name: 'libx264', args: '-preset fast -crf 18', label: 'x264 (软件)' };
}

let cachedEncoder: Encoder | null = null;

function getEncoder(): Encoder {
  if (!cachedEncoder) cachedEncoder = detectEncoder();
  return cachedEncoder;
}

export function getPreferredEncoder(): { name: string; args: string; label: string } {
  return getEncoder();
}

function getAudioOffset(projectPath: string | undefined): number {
  if (!projectPath) return 0;
  const audioPath = path.join(projectPath, '1_transcribe', 'audio.mp3');
  if (!fs.existsSync(audioPath)) return 0;

  try {
    const offsetCmd = `ffprobe -v error -show_entries format=start_time -of csv=p=0 "${audioPath}"`;
    const audioOffset = parseFloat(execSync(offsetCmd).toString().trim()) || 0;
    if (audioOffset > 0) {
      console.log(`🔧 检测到音频偏移: ${audioOffset.toFixed(3)}s，自动补偿`);
    }
    return audioOffset;
  } catch {
    return 0;
  }
}

function getVideoDuration(inputPath: string): number {
  const probeCmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "file:${inputPath}"`;
  return parseFloat(execSync(probeCmd).toString().trim());
}

function getVideoDimensions(inputPath: string): { width: number; height: number } {
  try {
    const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "file:${inputPath}"`;
    const result = execSync(probeCmd).toString().trim();
    const [width, height] = result.split(',').map((s) => parseInt(s.trim(), 10));
    return { width: width || 1920, height: height || 1080 };
  } catch {
    return { width: 1920, height: 1080 };
  }
}

function mergeDeleteSegments(segments: DeleteSegment[]): DeleteSegment[] {
  const merged: DeleteSegment[] = [];
  for (const seg of segments) {
    if (!Number.isFinite(seg.start) || !Number.isFinite(seg.end) || seg.end <= seg.start) continue;
    if (merged.length === 0 || seg.start > merged[merged.length - 1].end) {
      merged.push({ ...seg });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, seg.end);
    }
  }
  return merged;
}

interface CutPlan {
  duration: number;
  audioOffset: number;
  bufferSec: number;
  crossfadeSec: number;
  mergedDelete: DeleteSegment[];
  keepSegments: DeleteSegment[];
}

interface MergeProjectInput {
  projectId: string;
  inputPath: string;
  deleteList: DeleteSegment[];
  projectPath?: string;
}

interface MergeCutResult {
  outputPath: string;
  originalDuration: number;
  newDuration: number;
  projectCount: number;
  segmentCount: number;
}

export function computeCutPlan(
  inputPath: string,
  deleteList: DeleteSegment[],
  projectPath?: string
): CutPlan {
  const duration = getVideoDuration(inputPath);
  const audioOffset = getAudioOffset(projectPath);
  const bufferSec = BUFFER_MS / 1000;

  const expandedDelete = (Array.isArray(deleteList) ? deleteList : [])
    .map((seg) => ({
      start: Math.max(0, Number(seg.start || 0) - bufferSec),
      end: Math.min(duration, Number(seg.end || 0) + bufferSec),
    }))
    .sort((a, b) => a.start - b.start);

  const mergedDelete = mergeDeleteSegments(expandedDelete);
  const keepSegments: DeleteSegment[] = [];
  let cursor = 0;
  for (const del of mergedDelete) {
    if (del.start > cursor) keepSegments.push({ start: cursor, end: del.start });
    cursor = del.end;
  }
  if (cursor < duration) keepSegments.push({ start: cursor, end: duration });

  return {
    duration,
    audioOffset,
    bufferSec,
    crossfadeSec: CROSSFADE_MS / 1000,
    mergedDelete,
    keepSegments,
  };
}

function buildAudioFilterChain(options: ExportOptions = {}, totalDuration?: number): string {
  const filters: string[] = [];
  
  if (options.denoise) {
    filters.push('afftdn=nf=-35:nr=25:tn=1:tr=1');
  }
  
  if (options.enhanceVoice) {
    filters.push('highpass=f=100');
    filters.push('lowpass=f=8000');
    filters.push('acompressor=threshold=0.15:ratio=4:attack=3:release=100:makeup=2');
    filters.push('loudnorm=I=-14:TP=-1:LRA=9');
    filters.push('equalizer=f=2000:t=q:w=1:g=3');
    filters.push('equalizer=f=4000:t=q:w=1:g=2');
  }
  
  if (typeof options.volume === 'number' && options.volume !== 1) {
    const dB = 20 * Math.log10(Math.max(0.1, options.volume));
    filters.push(`volume=${dB.toFixed(1)}dB`);
  }
  
  if (typeof options.fadeIn === 'number' && options.fadeIn > 0) {
    filters.push(`afade=t=in:st=0:d=${options.fadeIn.toFixed(2)}`);
  }
  
  if (typeof options.fadeOut === 'number' && options.fadeOut > 0 && totalDuration) {
    const startTime = Math.max(0, totalDuration - options.fadeOut);
    filters.push(`afade=t=out:st=${startTime.toFixed(2)}:d=${options.fadeOut.toFixed(2)}`);
  }
  
  return filters.join(',');
}

function buildSpeedFilter(speed: number): { videoFilter: string; audioFilter: string } {
  if (speed === 1) {
    return { videoFilter: '', audioFilter: '' };
  }
  
  const videoFilter = `setpts=${(1/speed).toFixed(4)}*PTS`;
  
  const audioFilters: string[] = [];
  let remainingSpeed = speed;
  
  while (remainingSpeed > 2) {
    audioFilters.push('atempo=2.0');
    remainingSpeed /= 2;
  }
  while (remainingSpeed < 0.5) {
    audioFilters.push('atempo=0.5');
    remainingSpeed /= 0.5;
  }
  if (remainingSpeed !== 1) {
    audioFilters.push(`atempo=${remainingSpeed.toFixed(4)}`);
  }
  
  return { videoFilter, audioFilter: audioFilters.join(',') };
}

function getTransitionFilter(transition: string, duration: number, offset: number): string {
  switch (transition) {
    case 'fade':
      return `fade=t=in:st=${offset.toFixed(3)}:d=${duration.toFixed(3)},fade=t=out:st=${(offset + duration).toFixed(3)}:d=${duration.toFixed(3)}`;
    case 'dissolve':
      return `fade=t=in:st=${offset.toFixed(3)}:d=${duration.toFixed(3)}:c=black`;
    case 'wipeleft':
      return `wipeleft=t=in:st=${offset.toFixed(3)}:d=${duration.toFixed(3)}`;
    case 'wiperight':
      return `wiperight=t=in:st=${offset.toFixed(3)}:d=${duration.toFixed(3)}`;
    default:
      return '';
  }
}

function buildFilterComplex(
  keepSegments: DeleteSegment[],
  crossfadeSec: number,
  options: ExportOptions = {},
  totalDuration?: number
): string {
  const filters: string[] = [];
  let vconcat = '';
  const speed = options.speed || 1;
  const speedFilter = buildSpeedFilter(speed);
  const audioEffects = buildAudioFilterChain(options, totalDuration);
  const transition = options.transition || 'none';
  const transitionDuration = options.transitionDuration || 0.5;

  for (let i = 0; i < keepSegments.length; i += 1) {
    const seg = keepSegments[i];
    let videoChain = `[0:v]trim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},setpts=PTS-STARTPTS`;
    let audioChain = `[0:a]atrim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},asetpts=PTS-STARTPTS`;
    
    if (speedFilter.videoFilter) {
      videoChain += `,${speedFilter.videoFilter}`;
    }
    if (speedFilter.audioFilter) {
      audioChain += `,${speedFilter.audioFilter}`;
    }
    
    if (transition !== 'none' && i > 0) {
      videoChain += `,fade=t=in:d=${transitionDuration.toFixed(3)}`;
    }
    if (transition !== 'none' && i < keepSegments.length - 1) {
      videoChain += `,fade=t=out:d=${transitionDuration.toFixed(3)}`;
    }
    
    filters.push(`${videoChain}[v${i}]`);
    filters.push(`${audioChain}[a${i}]`);
    vconcat += `[v${i}]`;
  }

  filters.push(`${vconcat}concat=n=${keepSegments.length}:v=1:a=0[outv_raw]`);
  
  let videoPostFilter = '';
  if (typeof options.fadeIn === 'number' && options.fadeIn > 0) {
    videoPostFilter += `fade=t=in:st=0:d=${options.fadeIn.toFixed(2)}`;
  }
  if (typeof options.fadeOut === 'number' && options.fadeOut > 0 && totalDuration) {
    const fadeOutStart = Math.max(0, totalDuration - options.fadeOut);
    videoPostFilter += (videoPostFilter ? ',' : '') + `fade=t=out:st=${fadeOutStart.toFixed(2)}:d=${options.fadeOut.toFixed(2)}`;
  }
  
  if (videoPostFilter) {
    filters.push(`[outv_raw]${videoPostFilter}[outv]`);
  } else {
    filters.push('[outv_raw]null[outv]');
  }

  if (keepSegments.length === 1) {
    if (audioEffects) {
      filters.push(`[a0]${audioEffects}[outa_main]`);
    } else {
      filters.push('[a0]anull[outa_main]');
    }
  } else {
    let currentLabel = 'a0';
    for (let i = 1; i < keepSegments.length; i += 1) {
      const nextLabel = `a${i}`;
      const outLabel = i === keepSegments.length - 1 ? 'outa_raw' : `amid${i}`;
      filters.push(`[${currentLabel}][${nextLabel}]acrossfade=d=${crossfadeSec.toFixed(3)}:c1=tri:c2=tri[${outLabel}]`);
      currentLabel = outLabel;
    }
    
    if (audioEffects) {
      filters.push(`[outa_raw]${audioEffects}[outa_main]`);
    } else {
      filters.push('[outa_raw]anull[outa_main]');
    }
  }

  if (options.backgroundMusic) {
    const bgVolume = options.backgroundMusicVolume || 0.3;
    filters.push(`[1:a]volume=${bgVolume.toFixed(2)}[bgm]`);
    filters.push(`[outa_main][bgm]amix=inputs=2:duration=first:dropout_transition=2[outv_audio]`);
  } else {
    filters.push('[outa_main]anull[outv_audio]');
  }

  return filters.join(';');
}

function concatRenderedFiles(partFiles: string[], outputPath: string, tmpDir: string): void {
  if (partFiles.length === 0) {
    throw new Error('没有可合并的片段');
  }

  if (partFiles.length === 1) {
    fs.copyFileSync(partFiles[0], outputPath);
    console.log(`✅ 输出: ${outputPath}`);
    return;
  }

  const listFile = path.join(tmpDir, 'list.txt');
  const listContent = partFiles.map((f) => `file '${path.resolve(f)}'`).join('\n');
  fs.writeFileSync(listFile, listContent);

  const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`;
  console.log('合并片段...');
  execSync(concatCmd, { stdio: 'pipe' });
  console.log(`✅ 输出: ${outputPath}`);
}

function executeFFmpegCutFallback(
  inputPath: string,
  keepSegments: DeleteSegment[],
  outputPath: string,
  options: ExportOptions = {}
): void {
  const tmpDir = `tmp_cut_${Date.now()}`;
  fs.mkdirSync(tmpDir, { recursive: true });
  const speed = options.speed || 1;
  const speedFilter = buildSpeedFilter(speed);
  const audioEffects = buildAudioFilterChain(options);

  try {
    const partFiles: string[] = [];
    keepSegments.forEach((seg, i) => {
      const partFile = path.join(tmpDir, `part${i.toString().padStart(4, '0')}.mp4`);
      const segDuration = seg.end - seg.start;
      const encoder = getEncoder();
      
      let videoFilter = '';
      let audioFilter = '';
      
      if (speedFilter.videoFilter) {
        videoFilter = ` -vf "${speedFilter.videoFilter}"`;
      }
      if (speedFilter.audioFilter) {
        audioFilter = ` -af "${speedFilter.audioFilter}${audioEffects ? ',' + audioEffects : ''}"`;
      } else if (audioEffects) {
        audioFilter = ` -af "${audioEffects}"`;
      }
      
      const cmd = `ffmpeg -y -ss ${seg.start.toFixed(3)} -i "file:${inputPath}" -t ${segDuration.toFixed(3)} -c:v ${encoder.name} ${encoder.args}${videoFilter} -c:a aac -b:a 128k${audioFilter} -avoid_negative_ts make_zero "${partFile}"`;
      console.log(`切割片段 ${i + 1}/${keepSegments.length}: ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s`);
      execSync(cmd, { stdio: 'pipe' });
      partFiles.push(partFile);
    });

    concatRenderedFiles(partFiles, outputPath, tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function renderKeepSegments(
  inputPath: string,
  keepSegments: DeleteSegment[],
  outputPath: string,
  crossfadeSec: number = CROSSFADE_MS / 1000,
  options: ExportOptions = {}
): void {
  if (!Array.isArray(keepSegments) || keepSegments.length === 0) {
    throw new Error('keepSegments 不能为空');
  }

  const speed = options.speed || 1;
  let totalDuration = 0;
  keepSegments.forEach(seg => {
    totalDuration += (seg.end - seg.start) / speed;
  });

  const filterComplex = buildFilterComplex(keepSegments, crossfadeSec, options, totalDuration);
  const encoder = getEncoder();
  
  const speedInfo = options.speed && options.speed !== 1 ? `，倍速=${options.speed}x` : '';
  const audioInfo = options.denoise ? '，降噪' : '';
  const voiceInfo = options.enhanceVoice ? '，人声增强' : '';
  const fadeInfo = options.fadeIn || options.fadeOut ? `，淡入淡出` : '';
  const transitionInfo = options.transition && options.transition !== 'none' ? `，转场=${options.transition}` : '';
  const bgmInfo = options.backgroundMusic ? '，背景音乐' : '';
  
  console.log(`✂️ 执行 FFmpeg 精确剪辑（${encoder.label}${speedInfo}${audioInfo}${voiceInfo}${fadeInfo}${transitionInfo}${bgmInfo}）...`);

  let cmd: string;
  if (options.backgroundMusic) {
    cmd = `ffmpeg -y -i "file:${inputPath}" -i "${options.backgroundMusic}" -filter_complex "${filterComplex}" -map "[outv]" -map "[outv_audio]" -c:v ${encoder.name} ${encoder.args} -c:a aac -b:a 192k -shortest "file:${outputPath}"`;
  } else {
    cmd = `ffmpeg -y -i "file:${inputPath}" -filter_complex "${filterComplex}" -map "[outv]" -map "[outv_audio]" -c:v ${encoder.name} ${encoder.args} -c:a aac -b:a 192k "file:${outputPath}"`;
  }

  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ 输出: ${outputPath}`);
  } catch {
    console.error('FFmpeg 执行失败，尝试分段方案...');
    executeFFmpegCutFallback(inputPath, keepSegments, outputPath, options);
  }
}

export function cutVideo(
  inputPath: string,
  deleteList: DeleteSegment[],
  outputPath: string,
  projectPath?: string,
  options: ExportOptions = {}
): CutResult {
  if (!Array.isArray(deleteList) || deleteList.length === 0) {
    throw new Error('deleteList 不能为空');
  }

  const plan = computeCutPlan(inputPath, deleteList, projectPath);
  if (plan.keepSegments.length === 0) {
    throw new Error('删除范围覆盖整个视频，无法输出空视频');
  }

  console.log(`⚙️ 优化参数: 扩展范围=${BUFFER_MS}ms, 音频crossfade=${CROSSFADE_MS}ms`);
  console.log(`保留 ${plan.keepSegments.length} 个片段，删除 ${plan.mergedDelete.length} 个片段`);
  renderKeepSegments(inputPath, plan.keepSegments, outputPath, plan.crossfadeSec, options);

  const newDuration = getVideoDuration(outputPath);
  console.log(`📹 新时长: ${newDuration.toFixed(2)}s`);

  const dimensions = getVideoDimensions(inputPath);

  return {
    outputPath,
    keepSegments: plan.keepSegments,
    mergedDelete: plan.mergedDelete,
    audioOffset: plan.audioOffset,
    originalDuration: plan.duration,
    newDuration,
    videoWidth: dimensions.width,
    videoHeight: dimensions.height,
  };
}

export function mergeProjectVideos(
  projects: MergeProjectInput[], 
  outputPath: string,
  options: ExportOptions = {}
): MergeCutResult {
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('projects 不能为空');
  }

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  const tmpDir = path.join(outputDir, `.tmp_merge_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  let totalOriginalDuration = 0;
  const renderedFiles: string[] = [];

  try {
    projects.forEach((project, index) => {
      const plan = computeCutPlan(project.inputPath, project.deleteList, project.projectPath);
      totalOriginalDuration += plan.duration;
      if (plan.keepSegments.length === 0) {
        console.log(`⏭️ 跳过空项目: ${project.projectId}`);
        return;
      }

      const renderedPath = path.join(tmpDir, `project_${index.toString().padStart(2, '0')}.mp4`);
      console.log(`\n📦 渲染项目 ${index + 1}/${projects.length}: ${project.projectId}`);
      console.log(`保留 ${plan.keepSegments.length} 个片段，删除 ${plan.mergedDelete.length} 个片段`);
      renderKeepSegments(project.inputPath, plan.keepSegments, renderedPath, plan.crossfadeSec, options);
      renderedFiles.push(renderedPath);
    });

    concatRenderedFiles(renderedFiles, outputPath, tmpDir);
    const newDuration = getVideoDuration(outputPath);
    return {
      outputPath,
      originalDuration: totalOriginalDuration,
      newDuration,
      projectCount: projects.length,
      segmentCount: renderedFiles.length,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
