#!/bin/zsh
# 一键出片：打包冻结 → 逐帧渲染（带运动模糊）→ 导出事件表 → 合成配乐 → 混音合成 → 封面
set -e
cd "$(dirname "$0")/.."
mkdir -p out
PORT=${PORT:-5176}
NAME=${NAME:-film}
COVER_T=${COVER_T:-6.0}
npx vite build
python3 -m http.server $PORT --directory dist --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
until curl -s -o /dev/null http://127.0.0.1:$PORT/; do sleep 0.2; done
URL="http://127.0.0.1:$PORT/?export=1"
node scripts/export.mjs --url="$URL" --events=out/events.json --out=out/film_silent.mp4 --sub=${SUB:-8}
node scripts/audio.mjs out/events.json out/music.wav
ffmpeg -y -loglevel error -i out/film_silent.mp4 -i out/music.wav -map 0:v:0 -map 1:a:0 \
  -filter:a "loudnorm=I=-14:TP=-1.5:LRA=11" -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "out/${NAME}_成片.mp4"
node scripts/export.mjs --url="$URL&cover=1" --frames=$COVER_T --dir=out/cover --sub=8
cp "out/cover/t$(node -e 'console.log((+process.argv[1]).toFixed(2))' $COVER_T).jpg" out/封面.jpg
# 带封面版：第一帧放封面（平台默认拿第一帧当缩略图），并内嵌封面图
ffmpeg -y -loglevel error -loop 1 -framerate 60 -t 0.0334 -i out/封面.jpg -i "out/${NAME}_成片.mp4" -i out/封面.jpg \
  -filter_complex "[0:v]scale=1080:1920,format=yuv420p,setsar=1,fps=60[c];[1:v]setsar=1[v];[c][v]concat=n=2:v=1:a=0[vv];[1:a]adelay=33:all=1[aa]" \
  -map "[vv]" -map "[aa]" -map 2:v -c:v:0 libx264 -preset slow -crf 15 -pix_fmt yuv420p -c:v:1 copy -disposition:v:1 attached_pic \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart "out/${NAME}_成片_带封面.mp4"
echo "成片：out/${NAME}_成片.mp4   带封面版：out/${NAME}_成片_带封面.mp4   封面：out/封面.jpg"
