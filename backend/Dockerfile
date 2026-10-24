FROM python:3.12-slim
WORKDIR /app/backend
ENV PYTHONUNBUFFERED=1
COPY backend/server/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend/server /app/backend/server
COPY backend/scripts /app/backend/scripts
COPY frontend/public/data /app/frontend/public/data
EXPOSE 8000
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
