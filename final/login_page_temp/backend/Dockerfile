# Start from a standard Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# --- 1. Install System Dependencies ---
# We need 'git', 'cmake', and 'build-essential' to build llama-server
# We need 'ffmpeg' because your code uses yt-dlp
RUN apt-get update && apt-get install -y \
    git \
    cmake \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# --- 2. Build the Llama Server from Source ---
RUN git clone https://github.com/ggerganov/llama.cpp.git
WORKDIR /app/llama.cpp
# This 'make' command builds the 'server' binary
RUN make server
WORKDIR /app

# --- 3. Install Python Dependencies ---
# Copy requirements file first for Docker caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- 4. Copy ALL Your Project Files ---
# This copies:
# - call.py, chatbot_routes.py, etc.
# - Qwen3-1.7B-Q8_0.gguf (your model)
# - start.sh (our new script)
COPY . .

# --- 5. Set Permissions ---
# Give our start script permission to run
RUN chmod +x /app/start.sh

# --- 6. Expose Both Ports ---
EXPOSE 5000
EXPOSE 8080

# --- 7. Run! ---
# This is the final command that starts both services
CMD ["/app/start.sh"]