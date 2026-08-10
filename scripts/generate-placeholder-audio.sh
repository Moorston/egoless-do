#!/bin/bash
# ─── 生成占位音频文件 ──────────────────────────────────────────
# 使用 ffmpeg 生成简单的音频文件，让 app 可以正常运行
# 用户可以稍后替换为真实的音乐文件

SOUNDS_DIR="apps/mobile/assets/sounds"
DURATION=30  # 30秒音频

echo "生成占位音频文件..."

# 专注类 - 白噪音风格
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=white:r=44100:a=0.3" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/white-noise.mp3" 2>/dev/null && echo "✓ white-noise.mp3"

# 专注类 - 咖啡馆环境音（粉噪音）
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=pink:r=44100:a=0.3" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/cafe.mp3" 2>/dev/null && echo "✓ cafe.mp3"

# 专注类 - 键盘声（棕噪音）
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=brown:r=44100:a=0.3" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/keyboard.mp3" 2>/dev/null && echo "✓ keyboard.mp3"

# 冥想类 - 颂钵（低频正弦波）
ffmpeg -y -f lavfi -i "sine=frequency=174:duration=$DURATION" -af "volume=0.3,afade=t=in:st=0:d=2,afade=t=out:st=28:d=2" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/singing-bowl.mp3" 2>/dev/null && echo "✓ singing-bowl.mp3"

# 冥想类 - 西藏铃（高频正弦波）
ffmpeg -y -f lavfi -i "sine=frequency=528:duration=$DURATION" -af "volume=0.2,afade=t=in:st=0:d=2,afade=t=out:st=28:d=2" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/tibetan-bell.mp3" 2>/dev/null && echo "✓ tibetan-bell.mp3"

# 冥想类 - 流水（粉噪音 + 滤波）
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=pink:r=44100:a=0.4" -af "highpass=f=200,lowpass=f=2000" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/water-flow.mp3" 2>/dev/null && echo "✓ water-flow.mp3"

# 运动类 - 节拍（120 BPM 鼓点）
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=white:r=44100:a=0.5" -af "lowpass=f=100,atempo=2" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/beat.mp3" 2>/dev/null && echo "✓ beat.mp3"

# 运动类 - 鼓点（低频脉冲）
ffmpeg -y -f lavfi -i "sine=frequency=60:duration=$DURATION" -af "volume=0.5,atempo=2" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/drums.mp3" 2>/dev/null && echo "✓ drums.mp3"

# 运动类 - 电子（高频合成音）
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=$DURATION" -af "volume=0.3,tremolo=f=5:d=0.8" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/electronic.mp3" 2>/dev/null && echo "✓ electronic.mp3"

# 睡眠类 - 摇篮曲（柔和正弦波）
ffmpeg -y -f lavfi -i "sine=frequency=261:duration=$DURATION" -af "volume=0.2,afade=t=in:st=0:d=3,afade=t=out:st=27:d=3" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/lullaby.mp3" 2>/dev/null && echo "✓ lullaby.mp3"

# 睡眠类 - ASMR（白噪音 + 低通滤波）
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=white:r=44100:a=0.15" -af "lowpass=f=1000" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/asmr.mp3" 2>/dev/null && echo "✓ asmr.mp3"

# 睡眠类 - 壁炉（棕噪音）
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=brown:r=44100:a=0.25" -af "lowpass=f=500" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/fireplace.mp3" 2>/dev/null && echo "✓ fireplace.mp3"

# 自然类 - 森林（粉噪音 + 滤波）
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=pink:r=44100:a=0.3" -af "bandpass=f=800:width_type=o:w=2" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/forest.mp3" 2>/dev/null && echo "✓ forest.mp3"

# 自然类 - 雷雨（棕噪音 + 低频）
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=brown:r=44100:a=0.4" -af "lowpass=f=300" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/thunderstorm.mp3" 2>/dev/null && echo "✓ thunderstorm.mp3"

# 自然类 - 海鸥（白噪音 + 高通滤波）
ffmpeg -y -f lavfi -i "anoisesrc=d=$DURATION:c=white:r=44100:a=0.2" -af "highpass=f=2000" -codec:a libmp3lame -qscale:a 2 "$SOUNDS_DIR/seagulls.mp3" 2>/dev/null && echo "✓ seagulls.mp3"

echo ""
echo "完成！已生成 15 个占位音频文件"
echo "文件位置: $SOUNDS_DIR/"
echo ""
echo "这些是简单的噪音/正弦波音频，用作占位符。"
echo "请稍后替换为真实的音乐文件以获得更好的体验。"
