FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc g++ libnetcdf-dev libhdf5-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend folder
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend code
COPY backend/ .

# Create data directories
RUN mkdir -p /app/data /app/uploads

EXPOSE 8000

ENV PYTHONPATH=/app
ENV SECRET_KEY=production-secret-key

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
