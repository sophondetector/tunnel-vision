#! /usr/bin/env bash

BASE_IMAGE="logo/Base-Logo.png"
OUTPUT_DIR="public/images"

function create_image() {
  output_name=$OUTPUT_DIR/icon-$1.png
  magick $BASE_IMAGE -resize "$1x$1" "$output_name"
  printf "%s created\n" "$output_name"
}

create_image 128
create_image 48
create_image 32
create_image 16

printf "Icon creation done.\n"
