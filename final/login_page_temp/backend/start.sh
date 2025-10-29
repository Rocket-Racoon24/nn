#!/bin/bash

# Start the Llama Server in the background
# We've added --model-alias and --chat-template
echo "--- Starting Llama Server on port 8080 in OpenAI chat mode... ---"
./llama.cpp/server -m Qwen3-1.7B-Q8_0.gguf -c 32768 --host 0.0.0.0 --port 8080 --model-alias local-model --chat-template qwen &

# Give the server a second to start up
sleep 2

# Start the Gunicorn Flask Server in the foreground
# This runs your 'call.py' file's 'app' variable
echo "--- Starting Flask App on port 5000... ---"
gunicorn --bind 0.0.0.0:5000 --workers 1 --threads 8 --timeout 300 "call:app"