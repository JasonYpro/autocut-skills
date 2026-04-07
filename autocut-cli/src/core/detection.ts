import { execSync } from 'child_process';
import type { DeleteSegment } from './types';

export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
}

export interface BlackSegment {
  start: number;
  end: number;
  duration: number;
}

export interface SceneChange {
  time: number;
  score: number;
}

export function detectSilence(
  inputPath: string,
  noiseThreshold: number = -35,
  minDuration: number = 0.3
): SilenceSegment[] {
  const cmd = `ffmpeg -i "file:${inputPath}" -af silencedetect=noise=${noiseThreshold}dB:d=${minDuration} -f null - 2>&1`;
  
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const segments: SilenceSegment[] = [];
    const lines = output.split('\n');
    
    let currentStart: number | null = null;
    
    for (const line of lines) {
      const startMatch = line.match(/silence_start:\s*([\d.]+)/);
      const endMatch = line.match(/silence_end:\s*([\d.]+)/);
      
      if (startMatch) {
        currentStart = parseFloat(startMatch[1]);
      } else if (endMatch && currentStart !== null) {
        const end = parseFloat(endMatch[1]);
        segments.push({
          start: currentStart,
          end,
          duration: end - currentStart,
        });
        currentStart = null;
      }
    }
    
    return segments;
  } catch (error) {
    console.error('静音检测失败:', error);
    return [];
  }
}

export function detectBlackFrames(
  inputPath: string,
  blackThreshold: number = 0.98,
  minDuration: number = 0.5
): BlackSegment[] {
  const cmd = `ffmpeg -i "file:${inputPath}" -vf blackdetect=d=${minDuration}:pix_th=0.00 -f null - 2>&1`;
  
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const segments: BlackSegment[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/blackdetect\s+start:([\d.]+)\s+end:([\d.]+)\s+duration:([\d.]+)/);
      if (match) {
        const start = parseFloat(match[1]);
        const end = parseFloat(match[2]);
        segments.push({
          start,
          end,
          duration: end - start,
        });
      }
    }
    
    return segments;
  } catch (error) {
    console.error('黑屏检测失败:', error);
    return [];
  }
}

export function detectSceneChanges(
  inputPath: string,
  threshold: number = 0.3
): SceneChange[] {
  const cmd = `ffmpeg -i "file:${inputPath}" -vf "select='gt(scene,${threshold})',showinfo" -f null - 2>&1`;
  
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const changes: SceneChange[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/pts_time:\s*([\d.]+)/);
      if (match) {
        changes.push({
          time: parseFloat(match[1]),
          score: threshold,
        });
      }
    }
    
    return changes;
  } catch (error) {
    console.error('场景检测失败:', error);
    return [];
  }
}

export function silenceToDeleteSegments(
  silenceSegments: SilenceSegment[],
  bufferMs: number = 50
): DeleteSegment[] {
  return silenceSegments.map(seg => ({
    start: Math.max(0, seg.start - bufferMs / 1000),
    end: seg.end + bufferMs / 1000,
  }));
}

export function blackToDeleteSegments(
  blackSegments: BlackSegment[],
  bufferMs: number = 50
): DeleteSegment[] {
  return blackSegments.map(seg => ({
    start: Math.max(0, seg.start - bufferMs / 1000),
    end: seg.end + bufferMs / 1000,
  }));
}

export function runAllDetections(
  inputPath: string,
  options: {
    silenceThreshold?: number;
    silenceMinDuration?: number;
    blackThreshold?: number;
    blackMinDuration?: number;
    sceneThreshold?: number;
  } = {}
): {
  silence: SilenceSegment[];
  black: BlackSegment[];
  scenes: SceneChange[];
} {
  console.log('🔍 运行自动检测...');
  
  const silence = detectSilence(
    inputPath,
    options.silenceThreshold ?? -35,
    options.silenceMinDuration ?? 0.3
  );
  console.log(`  检测到 ${silence.length} 个静音段`);
  
  const black = detectBlackFrames(
    inputPath,
    options.blackThreshold ?? 0.98,
    options.blackMinDuration ?? 0.5
  );
  console.log(`  检测到 ${black.length} 个黑屏段`);
  
  const scenes = detectSceneChanges(
    inputPath,
    options.sceneThreshold ?? 0.3
  );
  console.log(`  检测到 ${scenes.length} 个场景变化`);
  
  return { silence, black, scenes };
}
