#!/bin/bash

# Markdown to Reveal.js HTML converter
# Removes all existing HTML files and regenerates from LlmAndVibeCoding folder

rm LlmAndVibeCoding_slide/* && node generate-slides.js
