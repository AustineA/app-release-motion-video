#!/bin/zsh
# grab.sh <template> <outdir> <step> <scale> [from] [to] [palette] [photos]
# photos: demo photo names, one per slot ("gloss-2,zine-1"), in place of the template's own.
# Renders a Grain template with the app's debug renderer on the iPhone simulator and copies the frames out.
SIM=63993FB9-7EE8-4299-AEE7-C04F35E8A479; BID=app.aestheticallypleasing.grain
id=$1; out=$2; step=$3; scale=$4; from=${5:-0}; to=${6:-999}; pal=$7; photos=$8
args=(-GrainRenderTemplate $id -GrainRenderStep $step -GrainRenderScale $scale -GrainRenderFrom $from -GrainRenderTo $to -onboarded YES)
[ -n "$pal" ] && args+=(-GrainPalette $pal)
[ -n "$photos" ] && args+=(-GrainDemoPhotos $photos)
xcrun simctl terminate $SIM $BID >/dev/null 2>&1
D=$(xcrun simctl get_app_container $SIM $BID data)/Documents/renders
rm -rf "$D"
xcrun simctl launch $SIM $BID "${args[@]}" >/dev/null
for i in {1..600}; do [ -f "$D/DONE" ] && break; sleep 0.5; done
[ -f "$D/DONE" ] || { echo "timeout $id"; exit 1; }
mkdir -p $out; rm -f $out/*(N); cp "$D"/$id-*.png $out/ ; echo "$id total=$(cat $D/DONE) frames=$(ls $out | wc -l | tr -d ' ')"
xcrun simctl terminate $SIM $BID >/dev/null 2>&1
