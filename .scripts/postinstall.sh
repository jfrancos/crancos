#!/bin/bash

if command -v code &>/dev/null; then
  code . -g $(ls src/App.?sx):9:7
fi
