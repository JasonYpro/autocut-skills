import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import React from 'react';

export type Locale = 'zh' | 'en';

export interface Translations {
  review: string;
  batchExport: string;
  currentTab: string;
  mergeExecute: string;
  mergeProjectCount: string;
  playPause: string;
  selected: string;
  segments: string;
  burnSubtitle: string;
  resetDefault: string;
  executeCut: string;
  saveReview: string;
  instructions: string;
  helpClick: string;
  helpJumpPlay: string;
  helpDblClick: string;
  helpSelectToggle: string;
  helpRightClick: string;
  helpEditWord: string;
  helpEnterEsc: string;
  helpSaveCancel: string;
  helpDrag: string;
  helpBatch: string;
  helpSpace: string;
  helpArrows: string;
  helpJump: string;
  aiPreselect: string;
  confirmedDelete: string;
  cutting: string;
  processing: string;
  estimateCalc: string;
  noProjects: string;
  loadFailed: string;
  lightMode: string;
  darkMode: string;
  almostDone: string;
  selectFirst: string;
  currentProject: string;
  estimatedTime: string;
  clickToStart: string;
  confirmCutTitle: string;
  confirmMergeTitle: string;
  cutDone: string;
  mergeDone: string;
  output: string;
  subtitleOutputLabel: string;
  originalDuration: string;
  newDuration: string;
  deleted: string;
  cutFailed: string;
  mergeFailed: string;
  requestFailed: string;
  ensureServer: string;
  copiedSegments: string;
  reviewSaved: string;
  reviewSaveFailed: string;
  formatMin: string;
  formatSec: string;
  estimateRemain: string;
  dialogConfirm: string;
  dialogCancel: string;
  dialogClose: string;
  subtitleStyleTitle: string;
  subtitlePresetLabel: string;
  subtitleJsonLabel: string;
  subtitleJsonHint: string;
  subtitleJsonValid: string;
  subtitleJsonInvalid: string;
  subtitlePromptLabel: string;
  subtitlePromptHint: string;
  subtitleCopyPrompt: string;
  subtitlePromptCopied: string;
  subtitleUpcoming: string;
  videoProxyGenerating: string;
  resetDefaultConfirmMessage: string;
  exportOptions: string;
  speed: string;
  denoise: string;
  enhanceVoice: string;
  volume: string;
  reEdit: string;
  reEditHint: string;
  basicSettings: string;
  audioEffects: string;
  fadeSettings: string;
  transitionSettings: string;
  backgroundMusic: string;
  fadeIn: string;
  fadeOut: string;
  transition: string;
  transitionDuration: string;
  transitionNone: string;
  transitionFade: string;
  transitionDissolve: string;
  transitionWipeLeft: string;
  transitionWipeRight: string;
  selectMusic: string;
  changeMusic: string;
  musicVolume: string;
  runDetection: string;
  detecting: string;
  detectionResult: string;
  silenceDetected: string;
  blackDetected: string;
  sceneDetected: string;
  applyDetection: string;
  fontSize: string;
  fontColor: string;
  borderColor: string;
  outlineWidth: string;
  bottomOffset: string;
  speedExportHint: string;
  volumeExportHint: string;
  audioEffectsHint: string;
  fadeExportHint: string;
  transitionExportHint: string;
  undo: string;
  redo: string;
  denoiseHint: string;
  enhanceVoiceHint: string;
  transitionHint: string;
  sampleMusic: string;
  customMusic: string;
  selectFile: string;
  maxWidthPercent: string;
  maxWidthPercentHint: string;
}

const zh: Translations = {
  review: 'Review',
  batchExport: '批量导出',
  currentTab: '当前 Tab',
  mergeExecute: '导出',
  mergeProjectCount: '参与项目',
  playPause: '播放/暂停',
  selected: '',
  segments: '段待删除',
  burnSubtitle: '字幕',
  resetDefault: '恢复默认',
  executeCut: '执行剪辑',
  saveReview: '保存审阅',
  instructions: '操作说明',
  helpClick: '单击',
  helpJumpPlay: '跳转播放',
  helpDblClick: '双击',
  helpSelectToggle: '选中/取消',
  helpRightClick: '右键',
  helpEditWord: '编辑文本',
  helpEnterEsc: 'Enter / Esc',
  helpSaveCancel: '保存 / 取消编辑',
  helpDrag: '拖动',
  helpBatch: '批量选择',
  helpSpace: '空格',
  helpArrows: '←→',
  helpJump: '跳转',
  aiPreselect: 'AI预选',
  confirmedDelete: '已确认删除',
  cutting: '🎬 正在剪辑中...',
  processing: '处理中...',
  estimateCalc: '预估剩余: 计算中...',
  noProjects: '暂无项目，请先运行剪口播流程生成数据。',
  loadFailed: '加载失败:',
  lightMode: '浅色',
  darkMode: '深色',
  almostDone: '即将完成...',
  selectFirst: '请先选择要删除的内容',
  currentProject: '当前项目',
  estimatedTime: '预计耗时',
  clickToStart: '点击确定开始',
  confirmCutTitle: '确认执行剪辑？',
  confirmMergeTitle: '确认合并导出？',
  cutDone: '剪辑完成！',
  mergeDone: '合并导出完成！',
  output: '输出',
  subtitleOutputLabel: '字幕输出',
  originalDuration: '原时长',
  newDuration: '新时长',
  deleted: '删减',
  cutFailed: '剪辑失败',
  mergeFailed: '合并导出失败',
  requestFailed: '请求失败',
  ensureServer: '请确保使用 videocut review-server 启动服务',
  copiedSegments: '个删除片段已复制到剪贴板',
  reviewSaved: '审阅结果已保存',
  reviewSaveFailed: '审阅保存失败',
  formatMin: '分',
  formatSec: '秒',
  estimateRemain: '预估剩余',
  dialogConfirm: '确认',
  dialogCancel: '取消',
  dialogClose: '知道了',
  subtitleStyleTitle: '字幕样式',
  subtitlePresetLabel: '内置预设',
  subtitleJsonLabel: 'AI JSON 样式',
  subtitleJsonHint: '直接粘贴 AI 返回的 JSON，校验通过后会立即应用。',
  subtitleJsonValid: 'JSON 校验通过，已应用当前样式。',
  subtitleJsonInvalid: 'JSON 校验失败',
  subtitlePromptLabel: '给 AI 的提示词模板',
  subtitlePromptHint: '让 AI 只返回 schema JSON，不要自由文本。',
  subtitleCopyPrompt: '复制提示词',
  subtitlePromptCopied: '提示词已复制',
  subtitleUpcoming: '内置自然语言生成样式将在下一阶段接入。',
  videoProxyGenerating: '视频体积较大，正在生成预览版本，请稍候...',
  resetDefaultConfirmMessage: '恢复到上一次保存的编辑状态。',
  exportOptions: '导出选项',
  speed: '倍速',
  denoise: '降噪',
  enhanceVoice: '人声增强',
  volume: '音量',
  reEdit: '重新编辑',
  reEditHint: '返回继续编辑已导出的视频',
  basicSettings: '基础设置',
  audioEffects: '音频效果',
  fadeSettings: '淡入淡出',
  transitionSettings: '转场效果',
  backgroundMusic: '背景音乐',
  fadeIn: '淡入',
  fadeOut: '淡出',
  transition: '转场',
  transitionDuration: '转场时长',
  transitionNone: '无',
  transitionFade: '淡入淡出',
  transitionDissolve: '溶解',
  transitionWipeLeft: '左擦除',
  transitionWipeRight: '右擦除',
  selectMusic: '选择音乐',
  changeMusic: '更换音乐',
  musicVolume: '音乐音量',
  runDetection: '自动检测',
  detecting: '检测中...',
  detectionResult: '检测结果',
  silenceDetected: '静音段',
  blackDetected: '黑屏段',
  sceneDetected: '场景变化',
  applyDetection: '应用检测结果',
  fontSize: '字号',
  fontColor: '颜色',
  borderColor: '描边',
  outlineWidth: '描边宽度',
  bottomOffset: '位置',
  speedExportHint: '倍速效果将在导出时应用',
  volumeExportHint: '音量效果将在导出时应用',
  audioEffectsHint: '以下效果将在导出时应用，预览时不可见',
  fadeExportHint: '淡入淡出效果将在导出时应用',
  transitionExportHint: '转场效果将在导出时应用（多段删除时）',
  undo: '撤销',
  redo: '重做',
  denoiseHint: '减少背景噪音，播放时实时生效',
  enhanceVoiceHint: '增强人声清晰度，播放时实时生效',
  transitionHint: '转场效果在导出时应用（多段删除时）',
  sampleMusic: '示例音乐',
  customMusic: '自定义音乐',
  selectFile: '选择文件',
  maxWidthPercent: '字幕宽度',
  maxWidthPercentHint: '控制字幕最大宽度，超出时自动换行',
};

const en: Translations = {
  review: 'Review',
  batchExport: 'Batch Export',
  currentTab: 'Current Tab',
  mergeExecute: 'Export',
  mergeProjectCount: 'Projects',
  playPause: 'Play / Pause',
  selected: '',
  segments: 'segment(s) to delete',
  burnSubtitle: 'Subtitle',
  resetDefault: 'Reset',
  executeCut: 'Execute Cut',
  saveReview: 'Save Review',
  instructions: 'Help',
  helpClick: 'Click',
  helpJumpPlay: 'jump & play',
  helpDblClick: 'Double-click',
  helpSelectToggle: 'select / deselect',
  helpRightClick: 'Right-click',
  helpEditWord: 'edit text',
  helpEnterEsc: 'Enter / Esc',
  helpSaveCancel: 'save / cancel editing',
  helpDrag: 'Drag',
  helpBatch: 'batch select',
  helpSpace: 'Space',
  helpArrows: '←→',
  helpJump: 'seek',
  aiPreselect: 'AI pre-selected',
  confirmedDelete: 'Confirmed delete',
  cutting: '🎬 Cutting video...',
  processing: 'Processing...',
  estimateCalc: 'Estimated remaining: calculating...',
  noProjects: 'No projects found. Please run the clipping workflow first.',
  loadFailed: 'Failed to load:',
  lightMode: 'Light',
  darkMode: 'Dark',
  almostDone: 'Almost done...',
  selectFirst: 'Please select content to delete first',
  currentProject: 'Project',
  estimatedTime: 'Estimated time',
  clickToStart: 'Click OK to start',
  confirmCutTitle: 'Confirm cut?',
  confirmMergeTitle: 'Confirm merge export?',
  cutDone: 'Cut complete!',
  mergeDone: 'Merge export complete!',
  output: 'Output',
  subtitleOutputLabel: 'Subtitle output',
  originalDuration: 'Original',
  newDuration: 'New',
  deleted: 'Deleted',
  cutFailed: 'Cut failed',
  mergeFailed: 'Merge export failed',
  requestFailed: 'Request failed',
  ensureServer: 'Make sure videocut review-server is running',
  copiedSegments: 'delete segment(s) copied to clipboard',
  reviewSaved: 'Review changes saved',
  reviewSaveFailed: 'Failed to save review changes',
  formatMin: 'm',
  formatSec: 's',
  estimateRemain: 'Estimated remaining',
  dialogConfirm: 'Confirm',
  dialogCancel: 'Cancel',
  dialogClose: 'Close',
  subtitleStyleTitle: 'Subtitle Style',
  subtitlePresetLabel: 'Presets',
  subtitleJsonLabel: 'AI JSON Style',
  subtitleJsonHint: 'Paste AI-generated JSON. Valid input is applied immediately.',
  subtitleJsonValid: 'JSON is valid and has been applied.',
  subtitleJsonInvalid: 'JSON validation failed',
  subtitlePromptLabel: 'Prompt Template for AI',
  subtitlePromptHint: 'Ask the model to return schema JSON only.',
  subtitleCopyPrompt: 'Copy Prompt',
  subtitlePromptCopied: 'Prompt copied',
  subtitleUpcoming: 'Built-in natural language style generation will land in the next phase.',
  videoProxyGenerating: 'Video is large — generating a preview version, please wait...',
  resetDefaultConfirmMessage: 'Restore to the last saved edit state.',
  exportOptions: 'Export Options',
  speed: 'Speed',
  denoise: 'Denoise',
  enhanceVoice: 'Enhance Voice',
  volume: 'Volume',
  reEdit: 'Re-edit',
  reEditHint: 'Return to continue editing exported video',
  basicSettings: 'Basic Settings',
  audioEffects: 'Audio Effects',
  fadeSettings: 'Fade Settings',
  transitionSettings: 'Transition',
  backgroundMusic: 'Background Music',
  fadeIn: 'Fade In',
  fadeOut: 'Fade Out',
  transition: 'Transition',
  transitionDuration: 'Duration',
  transitionNone: 'None',
  transitionFade: 'Fade',
  transitionDissolve: 'Dissolve',
  transitionWipeLeft: 'Wipe Left',
  transitionWipeRight: 'Wipe Right',
  selectMusic: 'Select Music',
  changeMusic: 'Change Music',
  musicVolume: 'Music Volume',
  runDetection: 'Auto Detect',
  detecting: 'Detecting...',
  detectionResult: 'Detection Result',
  silenceDetected: 'Silence',
  blackDetected: 'Black Frames',
  sceneDetected: 'Scene Changes',
  applyDetection: 'Apply Detection',
  fontSize: 'Font Size',
  fontColor: 'Color',
  borderColor: 'Border',
  outlineWidth: 'Border Width',
  bottomOffset: 'Position',
  speedExportHint: 'Speed effect will be applied on export',
  volumeExportHint: 'Volume effect will be applied on export',
  audioEffectsHint: 'Effects below will be applied on export, not visible in preview',
  fadeExportHint: 'Fade effect will be applied on export',
  transitionExportHint: 'Transition effect will be applied on export (when multiple cuts)',
  undo: 'Undo',
  redo: 'Redo',
  denoiseHint: 'Reduce background noise, real-time during playback',
  enhanceVoiceHint: 'Enhance voice clarity, real-time during playback',
  transitionHint: 'Transition effect applied on export (when multiple cuts)',
  sampleMusic: 'Sample Music',
  customMusic: 'Custom Music',
  selectFile: 'Select File',
  maxWidthPercent: 'Subtitle Width',
  maxWidthPercentHint: 'Control max subtitle width, auto wrap when exceeded',
};

const locales: Record<Locale, Translations> = { zh, en };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'zh',
  setLocale: () => {},
  t: zh,
});

function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('videocut-locale');
  if (stored === 'zh' || stored === 'en') return stored;
  return null;
}

function detectLocale(): Locale {
  const stored = getStoredLocale();
  if (stored) return stored;
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || '';
    if (lang.startsWith('zh')) return 'zh';
  }
  return 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('videocut-locale', l);
  }, []);

  const value: LocaleContextValue = {
    locale,
    setLocale,
    t: locales[locale],
  };

  return React.createElement(LocaleContext.Provider, { value }, children);
}

export function useLocale() {
  return useContext(LocaleContext);
}
