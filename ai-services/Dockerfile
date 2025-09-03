# Use Python 3.10 as base image
FROM python:3.10

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start the application
CMD ["python", "src/app.py"]