#! /usr/bin/env bash

BASE_IMAGE="TV-Logo-Full-Size.png"
OUTPUT_DIR="public/images"

function create_image() {
  output_name=$OUTPUT_DIR/icon-$1.png
  magick $BASE_IMAGE -resize $1x$1 $output_name
  printf "$output_name created\n"
}

create_image 128
create_image 48
create_image 32
create_image 16


# magick $BASE_IMAGE -resize 128x128 $OUTPUT_DIR/icon-128.png
# magick $BASE_IMAGE -resize 48x48 $OUTPUT_DIR/icon-48.png
# magick $BASE_IMAGE -resize 32x32 $OUTPUT_DIR/icon-32.png
# magick $BASE_IMAGE -resize 16x16 $OUTPUT_DIR/icon-16.png

# printf "New icons created in $OUTPUT_DIR\n"
