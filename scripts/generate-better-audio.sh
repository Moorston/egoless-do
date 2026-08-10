#!/bin/bash
# ─── 生成更好的占位音频文件 ──────────────────────────────────────
# 使用 ffmpeg 生成更接近真实音乐的音频文件

SOUNDS_DIR="apps/mobile/assets/sounds"
DURATION=60  # 60秒音频

echo "🎵 生成更好的占位音频文件..."
echo ""

# 专注类 - 白噪音（柔和的粉噪音）
echo "生成 white-noise.mp3..."
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=pink:r=44100:a=0.2" \
  -af "lowpass=f=3000,highpass=f=100" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/white-noise.mp3" 2>/dev/null

# 专注类 - 咖啡馆（棕噪音 + 环境音）
echo "生成 cafe.mp3..."
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=brown:r=44100:a=0.15" \
  -af "lowpass=f=2000" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/cafe.mp3" 2>/dev/null

# 专注类 - 键盘声（白噪音 + 高通滤波）
echo "生成 keyboard.mp3..."
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=white:r=44100:a=0.1" \
  -af "highpass=f=3000,lowpass=f=8000" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/keyboard.mp3" 2>/dev/null

# 冥想类 - 颂钵（多频正弦波叠加）
echo "生成 singing-bowl.mp3..."
ffmpeg -y -f lavfi -i "sine=frequency=174:duration=$DURATION" \
  -f lavfi -i "sine=frequency=348:duration=$DURATION" \
  -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest,volume=0.3,afade=t=in:st=0:d=3,afade=t=out:st=57:d=3" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/singing-bowl.mp3" 2>/dev/null

# 冥想类 - 西藏铃（高频正弦波 + 泛音）
echo "生成 tibetan-bell.mp3..."
ffmpeg -y -f lavfi -i "sine=frequency=528:duration=$DURATION" \
  -f lavfi -i "sine=frequency=1056:duration=$DURATION" \
  -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest,volume=0.15,afade=t=in:st=0:d=2,afade=t=out:st=58:d=2" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/tibetan-bell.mp3" 2>/dev/null

# 冥想类 - 流水（粉噪音 + 滤波）
echo "生成 water-flow.mp3..."
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=pink:r=44100:a=0.25" \
  -af "bandpass=f=800:width_type=o:w=2,lowpass=f=2000" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/water-flow.mp3" 2>/dev/null

# 运动类 - 节拍（低频脉冲 + 节奏）
echo "生成 beat.mp3..."
ffmpeg -y -f lavfi -i "sine=frequency=80:duration=$DURATION" \
  -af "volume=0.4,tremolo=f=2:d=0.9" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/beat.mp3" 2>/dev/null

# 运动类 - 鼓点（低频脉冲）
echo "生成 drums.mp3..."
ffmpeg -y -f lavfi -i "sine=frequency=60:duration=$DURATION" \
  -af "volume=0.5,tremolo=f=3:d=0.8" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/drums.mp3" 2>/dev/null

# 运动类 - 电子（高频合成音 + 颤音）
echo "生成 electronic.mp3..."
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=$DURATION" \
  -af "volume=0.2,tremolo=f=8:d=0.7" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/electronic.mp3" 2>/dev/null

# 睡眠类 - 摇篮曲（柔和正弦波 + 泛音）
echo "生成 lullaby.mp3..."
ffmpeg -y -f lavfi -i "sine=frequency=261:duration=$DURATION" \
  -f lavfi -i "sine=frequency=522:duration=$DURATION" \
  -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest,volume=0.15,afade=t=in:st=0:d=5,afade=t=out:st=55:d=5" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/lullaby.mp3" 2>/dev/null

# 睡眠类 - ASMR（白噪音 + 低通滤波）
echo "生成 asmr.mp3..."
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=white:r=44100:a=0.08" \
  -af "lowpass=f=800" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/asmr.mp3" 2>/dev/null

# 睡眠类 - 壁炉（棕噪音 + 低频）
echo "生成 fireplace.mp3..."
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=brown:r=44100:a=0.2" \
  -af "lowpass=f=400" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/fireplace.mp3" 2>/dev/null

# 自然类 - 森林（粉噪音 + 带通滤波）
echo "生成 forest.mp3..."
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=pink:r=44100:a=0.2" \
  -af "bandpass=f=600:width_type=o:w=2" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/forest.mp3" 2>/dev/null

# 自然类 - 雷雨（棕噪音 + 低频）
echo "生成 thunderstorm.mp3..."
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=brown:r=44100:a=0.3" \
  -af "lowpass=f=250" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/thunderstorm.mp3" 2>/dev/null

# 自然类 - 海鸥（白噪音 + 高通滤波）
echo "生成 seagulls.mp3..."
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=white:r=44100:a=0.15" \
  -af "highpass=f=1500,lowpass=f=4000" \
  -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/seagulls.mp3" 2>/dev/null

echo ""
echo "✅ 完成！已生成 15 个音频文件"
echo ""
echo "文件列表:"
ls -lh "$SOUNDS_DIR"/*.mp3 | awk '{print $9, $5}'
echo ""
echo "这些是改进的占位音频，比之前的版本更接近真实音乐。"
echo "请稍后从 Pixabay 下载真实的音乐文件替换它们。"
