from docx import Document
from io import BytesIO

def docx_to_text(data: bytes) -> str:
    doc = Document(BytesIO(data))
    parts = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(parts).strip()