FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE ${PORT}

# Serves the static files in the repo. Override the CMD to run an API/server
# once one is added (e.g., `docker run ... python your_server.py`).
CMD ["sh", "-c", "python -m http.server ${PORT}"]

