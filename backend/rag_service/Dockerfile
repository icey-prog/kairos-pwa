FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DB_DIR=/data

EXPOSE 8100

CMD ["python", "main.py"]
