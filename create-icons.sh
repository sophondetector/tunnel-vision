#! /usr/bin/env bash

BASE_IMAGE="logo/Base-Logo.png"
OUTPUT_DIR="public/images"

function create_image() {
  output_name=$OUTPUT_DIR/icon-$1.png
  magick $BASE_IMAGE -resize "$1x$1" "$output_name"
  printf "%s created\n" "$output_name"
}

function create_image_red() {
  output_name=$OUTPUT_DIR/red/icon-$1.png
  magick $BASE_IMAGE -fill red -colorize 50 -resize "$1x$1" "$output_name"
  printf "%s created\n" "$output_name"
}

printf "creating base icons..."

create_image 128
create_image 48
create_image 32
create_image 16

printf "done\n"

printf "creating red icons..."

create_image_red 128
create_image_red 48
create_image_red 32
create_image_red 16

printf "done\n"

printf "Icon creation done.\n"
