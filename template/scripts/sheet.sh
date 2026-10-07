#!/bin/zsh
# 把若干静帧拼成一张联系表：sheet.sh out.jpg cols w a.jpg b.jpg ...
out=$1; cols=$2; w=$3; shift 3
h=$(( w * 16 / 9 ))
inputs=(); filters=""; i=0
for f in "$@"; do
  inputs+=(-i "$f")
  label=$(basename "$f" .jpg)
  filters+="[$i:v]scale=${w}:${h}[v$i];"
  i=$((i+1))
done
n=$i; rows=$(( (n + cols - 1) / cols ))
stack=""; for ((j=0;j<n;j++)); do stack+="[v$j]"; done
layout=""; for ((j=0;j<n;j++)); do c=$((j % cols)); r=$((j / cols)); layout+="$((c*w))_$((r*h))|"; done
layout=${layout%|}
ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "${filters}${stack}xstack=inputs=${n}:layout=${layout}:fill=black" -q:v 3 "$out"
