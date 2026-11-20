FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data ./data
COPY ingest.py evaluate.py convert_scolaire.py pdf_to_draft.py ./
COPY templates ./templates

ENV INDEX_DIR=/app/index
ENV EMBED_BACKEND=local

EXPOSE 8001

CMD ["sh", "-c", "python ingest.py --backend local && uvicorn app.main:app --host 0.0.0.0 --port 8001"]
