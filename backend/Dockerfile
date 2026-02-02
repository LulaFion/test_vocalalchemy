# Backend Dockerfile for VocalAlchemy
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install additional audio processing libraries
RUN pip install --no-cache-dir soundfile librosa numpy

# Copy application code
COPY . .

# Create data directories
RUN mkdir -p data/audio data/models/GPT_weights data/models/SoVITS_weights data/training_projects data/slice_samples data/library

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
