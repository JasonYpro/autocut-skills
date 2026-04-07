import { useEffect, useRef, useCallback, useState } from 'react';

interface AudioEffectsOptions {
  volume: number;
  denoise: boolean;
  enhanceVoice: boolean;
  fadeIn: number;
  fadeOut: number;
  currentTime: number;
  duration: number;
  backgroundMusic?: string;
  backgroundMusicVolume?: number;
}

const SAMPLE_MUSIC = [
  { id: 'sappheiros-embrace', name: 'Sappheiros - Embrace', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3' },
  { id: 'scott-buckley-growth', name: 'Scott Buckley - Growth', url: 'https://cdn.pixabay.com/download/audio/2021/04/14/audio_c5d3e33c9e.mp3' },
  { id: 'lakey-inspired-chill-day', name: 'LAKEY INSPIRED - Chill Day', url: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3' },
];

export function getSampleMusic() {
  return SAMPLE_MUSIC;
}

export function useAudioEffects(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: AudioEffectsOptions
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const denoiseFilterRef = useRef<BiquadFilterNode | null>(null);
  const voiceEnhanceFilterRef = useRef<BiquadFilterNode | null>(null);
  const highShelfRef = useRef<BiquadFilterNode | null>(null);
  const lowShelfRef = useRef<BiquadFilterNode | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmGainNodeRef = useRef<GainNode | null>(null);
  const bgmSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const optionsRef = useRef(options);
  const initializedVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgmEventListenersRef = useRef<{ element: HTMLVideoElement; listeners: { event: string; handler: () => void }[] } | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const applyEffects = useCallback(() => {
    if (!gainNodeRef.current || !audioContextRef.current) {
      console.log('[音效] applyEffects 跳过: AudioContext 未初始化');
      return;
    }

    const { volume, denoise, enhanceVoice, fadeIn, fadeOut, currentTime, duration } = optionsRef.current;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    let targetVolume = volume;

    if (fadeIn > 0 && currentTime < fadeIn) {
      targetVolume = volume * Math.max(0.01, currentTime / fadeIn);
    }

    if (fadeOut > 0 && duration > 0 && currentTime > duration - fadeOut) {
      const fadeProgress = Math.max(0, (duration - currentTime) / fadeOut);
      targetVolume = volume * fadeProgress;
    }

    targetVolume = Math.max(0, Math.min(2, targetVolume));
    
    console.log(`[音效] 应用音量: ${(targetVolume * 100).toFixed(0)}% (原始: ${(volume * 100).toFixed(0)}%)`);
    
    try {
      gainNodeRef.current.gain.setTargetAtTime(targetVolume, now, 0.02);

      if (denoiseFilterRef.current) {
        const targetFreq = denoise ? 150 : 20;
        denoiseFilterRef.current.frequency.setTargetAtTime(targetFreq, now, 0.05);
      }

      if (highShelfRef.current) {
        const targetGain = denoise ? -3 : 0;
        highShelfRef.current.gain.setTargetAtTime(targetGain, now, 0.05);
      }

      if (lowShelfRef.current) {
        const targetGain = denoise ? -2 : 0;
        lowShelfRef.current.gain.setTargetAtTime(targetGain, now, 0.05);
      }

      if (voiceEnhanceFilterRef.current) {
        const targetGain = enhanceVoice ? 8 : 0;
        voiceEnhanceFilterRef.current.gain.setTargetAtTime(targetGain, now, 0.05);
        
        if (enhanceVoice) {
          voiceEnhanceFilterRef.current.frequency.setTargetAtTime(1500, now, 0.05);
          voiceEnhanceFilterRef.current.Q.setTargetAtTime(1.2, now, 0.05);
        }
      }

      if (bgmGainNodeRef.current) {
        const bgmVol = optionsRef.current.backgroundMusicVolume || 0.3;
        bgmGainNodeRef.current.gain.setTargetAtTime(bgmVol, now, 0.05);
        console.log(`[音效] BGM 音量: ${(bgmVol * 100).toFixed(0)}%`);
      }
    } catch (e) {
      console.warn('[音效] 应用音效失败:', e);
    }
  }, []);

  const cleanupBgmEventListeners = useCallback(() => {
    if (bgmEventListenersRef.current) {
      const { element, listeners } = bgmEventListenersRef.current;
      listeners.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
      bgmEventListenersRef.current = null;
    }
  }, []);

  const initBgm = useCallback(() => {
    const bgmUrl = optionsRef.current.backgroundMusic;
    if (!bgmUrl) {
      console.log('[BGM] 无背景音乐URL，跳过初始化');
      return;
    }
    if (!audioContextRef.current) {
      console.log('[BGM] AudioContext 未初始化，跳过初始化');
      return;
    }

    console.log('[BGM] 开始初始化:', bgmUrl);
    cleanupBgmEventListeners();

    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current.src = '';
      bgmAudioRef.current = null;
    }
    if (bgmSourceRef.current) {
      try {
        bgmSourceRef.current.disconnect();
      } catch {}
      bgmSourceRef.current = null;
    }
    if (bgmGainNodeRef.current) {
      try {
        bgmGainNodeRef.current.disconnect();
      } catch {}
      bgmGainNodeRef.current = null;
    }

    try {
      const audio = new Audio();
      audio.src = bgmUrl;
      audio.loop = true;
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      
      audio.addEventListener('error', (e) => {
        console.warn('[BGM] 音频加载错误:', e);
      });
      
      audio.addEventListener('canplaythrough', () => {
        console.log('[BGM] 音频已加载，可以播放');
      });
      
      const source = audioContextRef.current.createMediaElementSource(audio);
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = optionsRef.current.backgroundMusicVolume || 0.3;
      
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      bgmAudioRef.current = audio;
      bgmSourceRef.current = source;
      bgmGainNodeRef.current = gainNode;
      
      const video = videoRef.current;
      if (video) {
        const playHandler = () => { 
          console.log('[BGM] 视频播放，同步BGM');
          if (bgmAudioRef.current && audioContextRef.current) {
            if (audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume().then(() => {
                bgmAudioRef.current!.currentTime = video.currentTime;
                bgmAudioRef.current!.play().catch((e) => console.warn('[BGM] 播放失败:', e));
              });
            } else {
              bgmAudioRef.current.currentTime = video.currentTime;
              bgmAudioRef.current.play().catch((e) => console.warn('[BGM] 播放失败:', e));
            }
          }
        };
        const pauseHandler = () => { 
          console.log('[BGM] 视频暂停，暂停BGM');
          if (bgmAudioRef.current) {
            bgmAudioRef.current.pause(); 
          }
        };
        const endedHandler = () => { 
          console.log('[BGM] 视频结束，重置BGM');
          if (bgmAudioRef.current) {
            bgmAudioRef.current.pause(); 
            bgmAudioRef.current.currentTime = 0; 
          }
        };
        const seekingHandler = () => { 
          if (bgmAudioRef.current) {
            console.log('[BGM] 视频跳转，同步BGM时间:', video.currentTime.toFixed(2));
            bgmAudioRef.current.currentTime = video.currentTime; 
          }
        };
        
        video.addEventListener('play', playHandler);
        video.addEventListener('pause', pauseHandler);
        video.addEventListener('ended', endedHandler);
        video.addEventListener('seeking', seekingHandler);
        
        bgmEventListenersRef.current = {
          element: video,
          listeners: [
            { event: 'play', handler: playHandler },
            { event: 'pause', handler: pauseHandler },
            { event: 'ended', handler: endedHandler },
            { event: 'seeking', handler: seekingHandler },
          ]
        };
        
        if (!video.paused) {
          audio.currentTime = video.currentTime;
          audio.play().catch((e) => console.warn('[BGM] 初始播放失败:', e));
        }
      }
      
      console.log('[BGM] 初始化成功');
    } catch (e) {
      console.warn('[BGM] 初始化失败:', e);
    }
  }, [videoRef, cleanupBgmEventListeners]);

  const ensureAudioContext = useCallback(async () => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        console.log('[音效] AudioContext 处于 suspended 状态，尝试恢复');
        await audioContextRef.current.resume();
        console.log('[音效] AudioContext 已恢复');
      }
      return true;
    }
    
    const video = videoRef.current;
    if (!video) {
      console.log('[音效] 无视频元素，无法初始化 AudioContext');
      return false;
    }
    
    console.log('[音效] 开始初始化 AudioContext');
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('[音效] AudioContext 创建成功，状态:', audioContext.state);
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('[音效] AudioContext 已恢复，状态:', audioContext.state);
      }
      
      const source = audioContext.createMediaElementSource(video);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = optionsRef.current.volume;
      
      const denoiseFilter = audioContext.createBiquadFilter();
      denoiseFilter.type = 'highpass';
      denoiseFilter.frequency.value = 20;
      denoiseFilter.Q.value = 0.7;

      const highShelf = audioContext.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 3000;
      highShelf.gain.value = 0;

      const lowShelf = audioContext.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 200;
      lowShelf.gain.value = 0;

      const voiceEnhanceFilter = audioContext.createBiquadFilter();
      voiceEnhanceFilter.type = 'peaking';
      voiceEnhanceFilter.frequency.value = 2000;
      voiceEnhanceFilter.Q.value = 1.5;
      voiceEnhanceFilter.gain.value = 0;

      source.connect(denoiseFilter);
      denoiseFilter.connect(highShelf);
      highShelf.connect(lowShelf);
      lowShelf.connect(voiceEnhanceFilter);
      voiceEnhanceFilter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      gainNodeRef.current = gainNode;
      denoiseFilterRef.current = denoiseFilter;
      voiceEnhanceFilterRef.current = voiceEnhanceFilter;
      highShelfRef.current = highShelf;
      lowShelfRef.current = lowShelf;
      
      initializedVideoRef.current = video;
      video.crossOrigin = 'anonymous';
      
      setIsInitialized(true);
      console.log('[音效] AudioContext 初始化完成，音量节点已连接');
      
      initBgm();
      
      return true;
    } catch (e) {
      console.warn('[音效] AudioContext 初始化失败:', e);
      return false;
    }
  }, [videoRef, initBgm]);

  const initAudioContext = useCallback((): boolean => {
    ensureAudioContext();
    return audioContextRef.current !== null;
  }, [ensureAudioContext]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = async () => {
      console.log('[音效] 视频播放事件触发');
      await ensureAudioContext();
      applyEffects();
    };

    const handleTimeUpdate = () => {
      applyEffects();
    };

    const handleVolumeChange = () => {
      if (video.volume !== 1 && initializedVideoRef.current === video) {
        video.volume = 1;
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('volumechange', handleVolumeChange);
    
    if (video.readyState >= 2) {
      video.volume = 1;
    } else {
      video.addEventListener('loadedmetadata', () => { video.volume = 1; }, { once: true });
    }
    
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [videoRef, ensureAudioContext, applyEffects]);

  useEffect(() => {
    const initAndApply = async () => {
      if (isInitialized) {
        applyEffects();
      } else {
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          console.log('[音效] 音量选项变化，尝试初始化 AudioContext');
          await ensureAudioContext();
          applyEffects();
        }
      }
    };
    initAndApply();
  }, [options.volume, options.denoise, options.enhanceVoice, options.backgroundMusicVolume, isInitialized, ensureAudioContext, applyEffects]);

  useEffect(() => {
    if (!isInitialized) return;
    
    if (options.backgroundMusic) {
      initBgm();
    } else {
      console.log('[BGM] 音乐被清除，立即停止播放');
      cleanupBgmEventListeners();
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.src = '';
        bgmAudioRef.current = null;
      }
      if (bgmSourceRef.current) {
        try {
          bgmSourceRef.current.disconnect();
        } catch {}
        bgmSourceRef.current = null;
      }
      if (bgmGainNodeRef.current) {
        try {
          bgmGainNodeRef.current.disconnect();
        } catch {}
        bgmGainNodeRef.current = null;
      }
    }
  }, [options.backgroundMusic, isInitialized, initBgm, cleanupBgmEventListeners]);

  useEffect(() => {
    return () => {
      console.log('[音效] 组件卸载，清理资源');
      cleanupBgmEventListeners();
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.src = '';
        bgmAudioRef.current = null;
      }
      if (bgmSourceRef.current) {
        try {
          bgmSourceRef.current.disconnect();
        } catch {}
        bgmSourceRef.current = null;
      }
      if (bgmGainNodeRef.current) {
        try {
          bgmGainNodeRef.current.disconnect();
        } catch {}
        bgmGainNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsInitialized(false);
      initializedVideoRef.current = null;
    };
  }, [cleanupBgmEventListeners]);

  return { initAudioContext, isInitialized, applyEffects, ensureAudioContext };
}
