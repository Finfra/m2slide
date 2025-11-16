#!/bin/bash

# Markdown to Reveal.js HTML converter
# Removes all existing HTML files and regenerates from md folder

rm slide/* && node generate-slides.js
