import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { assAlignmentFromPreset, assColorFromHex, escapeAssText, normalizeSubtitleStylePreset } from './subtitle-style.js';
import type { Utterance, DeleteSegment, Subtitle, SubtitleStylePreset } from './types.js';
import { getPreferredEncoder } from './video.js';

interface SubtitleFont {
  family: string;
  file?: string;
  fontsDir?: string;
}

interface VideoInfo {
  width: number;
  height: number;
}

const REFERENCE_HEIGHT = 720;
const ASS_PLAY_RESOLUTION_X = 384;
const ASS_PLAY_RESOLUTION_Y = 288;

function isWsl(): boolean {
  if (process.platform !== 'linux') return false;
  return fs.existsSync('/mnt/c/Windows/Fonts');
}

function escapeFilterValue(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
}

function probeVideoInfo(videoPath: string): VideoInfo {
  try {
    const raw = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "file:${videoPath}"`,
      { stdio: 'pipe' }
    ).toString();
    const data = JSON.parse(raw);
    const stream = Array.isArray(data?.streams) ? data.streams[0] : null;
    return {
      width: Number(stream?.width || 1920),
      height: Number(stream?.height || 1080),
    };
  } catch {
    return { width: 1920, height: 1080 };
  }
}

function cssToAssFontSize(cssFontSize: number, videoHeight: number): number {
  const scaleFactor = videoHeight / REFERENCE_HEIGHT;
  const assFontSize = cssFontSize * scaleFactor;
  console.log(`[字幕样式] CSS字号 ${cssFontSize}px -> ASS字号 ${assFontSize.toFixed(1)} (视频高度 ${videoHeight}px, 缩放因子 ${scaleFactor.toFixed(2)})`);
  return Math.round(assFontSize * 10) / 10;
}

function cssToAssOutlineWidth(cssOutlineWidth: number, videoHeight: number): number {
  const scaleFactor = videoHeight / REFERENCE_HEIGHT;
  const assOutlineWidth = cssOutlineWidth * scaleFactor;
  return Math.round(assOutlineWidth * 10) / 10;
}

function cssToAssBottomOffset(cssOffset: number, videoHeight: number): number {
  const scaleFactor = videoHeight / REFERENCE_HEIGHT;
  const assOffset = cssOffset * scaleFactor;
  return Math.round(assOffset);
}

function wrapTextByWidth(text: string, maxWidthPercent: number, fontSize: number, videoWidth: number): string {
  if (maxWidthPercent >= 100 || !text) return text;
  
  const maxPixelWidth = videoWidth * (maxWidthPercent / 100);
  const estimatedCharWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.floor(maxPixelWidth / estimatedCharWidth);
  
  if (text.length <= maxCharsPerLine) return text;
  
  const lines: string[] = [];
  let currentLine = '';
  
  for (const char of text) {
    if (currentLine.length >= maxCharsPerLine && char !== ' ') {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine += char;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  console.log(`[字幕换行] 原文本长度 ${text.length}, 最大宽度 ${maxWidthPercent}%, 每行最多 ${maxCharsPerLine} 字符, 拆分为 ${lines.length} 行`);
  
  return lines.join('\\N');
}

function resolveSubtitleFont(): SubtitleFont {
  const envFontFile = process.env.VIDEOCUT_SUBTITLE_FONT_FILE;
  if (envFontFile && fs.existsSync(envFontFile)) {
    return {
      family: process.env.VIDEOCUT_SUBTITLE_FONT_NAME || path.basename(envFontFile, path.extname(envFontFile)),
      file: envFontFile,
      fontsDir: path.dirname(envFontFile),
    };
  }

  let candidates: SubtitleFont[];
  if (process.platform === 'darwin') {
    candidates = [
      { family: 'PingFang SC' },
      { family: 'Hiragino Sans GB' },
      { family: 'STHeiti' },
      { family: 'Arial Unicode MS' },
    ];
  } else if (isWsl()) {
    candidates = [
      { family: 'Noto Sans SC', file: '/mnt/c/Windows/Fonts/NotoSansSC-VF.ttf', fontsDir: '/mnt/c/Windows/Fonts' },
      { family: 'Microsoft YaHei', file: '/mnt/c/Windows/Fonts/msyh.ttc', fontsDir: '/mnt/c/Windows/Fonts' },
      { family: 'Microsoft YaHei', file: '/mnt/c/Windows/Fonts/msyhbd.ttc', fontsDir: '/mnt/c/Windows/Fonts' },
      { family: 'SimHei', file: '/mnt/c/Windows/Fonts/simhei.ttf', fontsDir: '/mnt/c/Windows/Fonts' },
      { family: 'SimSun', file: '/mnt/c/Windows/Fonts/simsun.ttc', fontsDir: '/mnt/c/Windows/Fonts' },
      { family: 'PingFang SC' },
    ];
  } else {
    candidates = [
      { family: 'Noto Sans SC' },
      { family: 'Source Han Sans SC' },
      { family: 'WenQuanYi Zen Hei' },
      { family: 'PingFang SC' },
    ];
  }

  for (const candidate of candidates) {
    if (!candidate.file || fs.existsSync(candidate.file)) {
      return candidate;
    }
  }

  return { family: 'sans-serif' };
}

export function formatSrtTime(seconds: number): string {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.round((safe % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function generateSrt(subtitles: Subtitle[]): string {
  return subtitles
    .map((s, i) => `${i + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n`)
    .join('\n');
}

function remapIntervalToKeepSegments(
  start: number,
  end: number,
  keepSegments: DeleteSegment[],
  speed: number = 1
): DeleteSegment[] {
  const out: DeleteSegment[] = [];
  let cumulativeOriginalTime = 0;
  
  for (const seg of keepSegments) {
    const overlapStart = Math.max(start, seg.start);
    const overlapEnd = Math.min(end, seg.end);
    if (overlapEnd > overlapStart) {
      const outputStart = cumulativeOriginalTime + (overlapStart - seg.start);
      const outputEnd = cumulativeOriginalTime + (overlapEnd - seg.start);
      out.push({
        start: outputStart / speed,
        end: outputEnd / speed,
      });
    }
    cumulativeOriginalTime += seg.end - seg.start;
  }
  
  return out;
}

export function buildSubtitlesFromEditedOpted(
  editedOpted: Utterance[],
  audioOffset: number,
  keepSegments: DeleteSegment[],
  speed: number = 1,
  subtitleStyle?: SubtitleStylePreset,
  videoWidth: number = 1920
): Subtitle[] {
  console.log(`\n========== 字幕时间转换开始 ==========`);
  console.log(`音频偏移: ${audioOffset.toFixed(3)}s`);
  console.log(`倍速系数: ${speed}x`);
  console.log(`保留片段 (${keepSegments.length}个):`);
  keepSegments.forEach((seg, i) => {
    console.log(`  片段${i + 1}: 原始视频 ${seg.start.toFixed(3)}s - ${seg.end.toFixed(3)}s (时长 ${(seg.end - seg.start).toFixed(3)}s)`);
  });
  
  const maxWidthPercent = subtitleStyle?.maxWidthPercent || 86;
  const fontSize = subtitleStyle?.fontSize || 22;
  
  const sourceSubs: Subtitle[] = [];
  
  for (const node of editedOpted) {
    if (Array.isArray(node.words) && node.words.length > 0) {
      const keptWords: Subtitle[] = [];
      for (const w of node.words) {
        if ((w.opt || node.opt || 'keep') === 'del') continue;
        const text = (w.text || '').trim();
        if (!text) continue;
        keptWords.push({
          text,
          start: (typeof w.start_time === 'number' ? w.start_time : node.start_time || 0) / 1000 - audioOffset,
          end: (typeof w.end_time === 'number' ? w.end_time : node.end_time || 0) / 1000 - audioOffset,
        });
      }
      if (keptWords.length > 0) {
        sourceSubs.push({
          text: keptWords.map((w) => w.text).join(''),
          start: keptWords[0].start,
          end: keptWords[keptWords.length - 1].end,
        });
      }
      continue;
    }

    if ((node.opt || 'keep') === 'del') continue;
    const text = (node.text || '').trim();
    if (!text) continue;
    sourceSubs.push({
      text,
      start: (node.start_time || 0) / 1000 - audioOffset,
      end: (node.end_time || 0) / 1000 - audioOffset,
    });
  }

  console.log(`\n提取到 ${sourceSubs.length} 条原始字幕，开始转换...\n`);
  console.log(`[字幕宽度] maxWidthPercent: ${maxWidthPercent}%, 视频宽度: ${videoWidth}px, 字号: ${fontSize}px`);
  
  const remapped: Subtitle[] = [];
  for (const sub of sourceSubs) {
    const mappedSegments = remapIntervalToKeepSegments(sub.start, sub.end, keepSegments, speed);
    for (const seg of mappedSegments) {
      if (seg.end - seg.start < 0.05) continue;
      
      const wrappedText = wrapTextByWidth(sub.text, maxWidthPercent, fontSize, videoWidth);
      
      remapped.push({ text: wrappedText, start: seg.start, end: seg.end });
      
      console.log(`字幕: "${sub.text.substring(0, 20)}${sub.text.length > 20 ? '...' : ''}"`);
      console.log(`  原始时间: ${sub.start.toFixed(3)}s - ${sub.end.toFixed(3)}s`);
      console.log(`  输出时间: ${seg.start.toFixed(3)}s - ${seg.end.toFixed(3)}s`);
      console.log(`  转换公式: [原始时间 - 前面被删时长] / ${speed} = 输出时间`);
      if (wrappedText !== sub.text) {
        console.log(`  换行后: "${wrappedText.replace(/\\N/g, ' | ')}"`);
      }
      console.log(``);
    }
  }
  
  console.log(`========== 字幕时间转换完成，共 ${remapped.length} 条 ==========\n`);
  
  return remapped;
}

export function burnSubtitles(
  videoPath: string,
  srtPath: string,
  outputPath: string,
  subtitleStyle?: SubtitleStylePreset
): void {
  const encoder = getPreferredEncoder();
  const font = resolveSubtitleFont();
  const videoInfo = probeVideoInfo(videoPath);
  const escapedSrtPath = escapeFilterValue(srtPath);
  const escapedFontsDir = font.fontsDir ? escapeFilterValue(font.fontsDir) : null;
  const stylePreset = normalizeSubtitleStylePreset(subtitleStyle);
  const fontFamily = stylePreset.fontFamilyHint || font.family;
  const bold = stylePreset.fontWeight >= 600 ? -1 : 0;
  
  const assFontSize = cssToAssFontSize(stylePreset.fontSize, videoInfo.height);
  const assOutlineWidth = cssToAssOutlineWidth(stylePreset.outlineWidth, videoInfo.height);
  const assBottomOffset = cssToAssBottomOffset(stylePreset.bottomOffset, videoInfo.height);
  const assShadow = Math.round(stylePreset.shadow * (videoInfo.height / REFERENCE_HEIGHT) * 10) / 10;
  
  console.log(`[字幕样式] 视频分辨率: ${videoInfo.width}x${videoInfo.height}`);
  console.log(`[字幕样式] CSS -> ASS 映射完成`);
  
  const style = [
    `FontSize=${assFontSize}`,
    `FontName=${escapeAssText(fontFamily)}`,
    `Bold=${bold}`,
    `Spacing=${Math.round(stylePreset.letterSpacing * 10) / 10}`,
    `PrimaryColour=${assColorFromHex(stylePreset.textColor)}`,
    `OutlineColour=${assColorFromHex(stylePreset.outlineColor)}`,
    `Outline=${assOutlineWidth}`,
    `Shadow=${assShadow}`,
    'BorderStyle=1',
    `Alignment=${assAlignmentFromPreset(stylePreset.alignment)}`,
    `MarginV=${assBottomOffset}`,
  ].join(',');
  const filterParts = [`subtitles='${escapedSrtPath}'`, 'charenc=UTF-8'];
  if (escapedFontsDir) {
    filterParts.push(`fontsdir='${escapedFontsDir}'`);
  }
  filterParts.push(`force_style='${style}'`);
  const filter = filterParts.join(':');
  console.log(`📝 烧录字幕使用编码器: ${encoder.label}`);
  console.log(`🔤 烧录字幕使用字体: ${fontFamily}${font.file ? ` (${font.file})` : ''}`);
  const cmd = `ffmpeg -y -i "file:${videoPath}" -vf "${filter}" -c:v ${encoder.name} ${encoder.args} -c:a copy "file:${outputPath}"`;
  execSync(cmd, { stdio: 'pipe', maxBuffer: 1024 * 1024 * 16 });
}
