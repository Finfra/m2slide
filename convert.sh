#!/bin/bash

# Markdown to Reveal.js HTML converter
# Removes all existing HTML files and regenerates from Documents/LlmAndVibeCoding folder

rm Documents/LlmAndVibeCoding_slide/* && node generate-slides.js
