#!/bin/bash
export prj_name=m2SlideStyle1_single

export m2slide_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export prj_path=./Projects/$prj_name

cd "$m2slide_path" || exit 1
rm -rf "$prj_path/slide"
./m2slide.sh "$prj_path"
if [ -f "$prj_path/slide/index.html" ]; then
    open -a "Google Chrome" "$prj_path/slide/index.html"
else
    open -a "Google Chrome" "$prj_path"/slide/*.html
fi
