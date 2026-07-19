import pytest
from embeddings import RecursiveTextSplitter, chunk_pdf, chunk_codebase, chunk_audio

def test_recursive_splitter():
    splitter = RecursiveTextSplitter(chunk_size=50, chunk_overlap=10)
    text = "This is a long sentence. We split it recursively to check output length."
    chunks = splitter.split_text(text)
    for c in chunks:
        assert len(c) <= 50

def test_chunk_pdf():
    parsed = {"pages": [{"page_number": 1, "text": "Page one text. " * 20}]}
    chunks = chunk_pdf(parsed)
    assert len(chunks) > 0
    assert chunks[0]["location"]["page_number"] == 1

def test_chunk_codebase():
    parsed = {"chunks": [{"file_path": "main.py", "text": "def test():\n    pass"}]}
    chunks = chunk_codebase(parsed)
    assert len(chunks) == 1
    assert chunks[0]["location"]["file_path"] == "main.py"

def test_chunk_audio():
    parsed = {
        "segments": [
            {"speaker": "Speaker 1", "start_time": 0.0, "end_time": 2.0, "text": "Hello."},
            {"speaker": "Speaker 2", "start_time": 2.0, "end_time": 4.0, "text": "Hi."}
        ]
    }
    chunks = chunk_audio(parsed)
    assert len(chunks) == 1
    assert "Speaker 1" in chunks[0]["location"]["speaker"]
    assert "Speaker 2" in chunks[0]["location"]["speaker"]
    assert chunks[0]["location"]["start_time"] == 0.0
