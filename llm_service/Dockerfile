FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml README.md ./
COPY app ./app
COPY evaluation ./evaluation

RUN pip install --no-cache-dir -e .

EXPOSE 8100

CMD ["python", "-m", "uvicorn", "app.api.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8100"]
