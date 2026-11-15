// 効果音（Web Audio で短い音を鳴らす。ファイル不要）
let ctx = null;

function tone(freqs, dur = 0.12) {
  try {
    ctx = ctx ?? new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur * 0.8;
    }
  } catch (e) {
    // 音が出せない環境では何もしない
  }
}

export const sound = {
  enabled: true,
  ok() { if (this.enabled) tone([880]); },
  ng() { if (this.enabled) tone([330, 262], 0.15); },
  clear() { if (this.enabled) tone([523, 659, 784, 1047], 0.12); },
};
