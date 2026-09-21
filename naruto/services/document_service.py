import os
import io
import pandas as pd
from docx import Document

class DocumentService:
    @staticmethod
    def extract_text(filename: str, file_bytes: bytes) -> str:
        """Extract text from various file formats."""
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        content = ""
        
        try:
            if ext == 'pdf':
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                extracted_pages = []
                for i in range(min(len(reader.pages), 50)):  # Limit to 50 pages
                    text = reader.pages[i].extract_text() or ""
                    if text.strip():
                        extracted_pages.append(f"--- [Page {i+1}] ---\n{text.strip()}")
                content = "\n\n".join(extracted_pages)
            
            elif ext in ['docx', 'doc']:
                doc = Document(io.BytesIO(file_bytes))
                content = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
                
            elif ext == 'csv':
                df = pd.read_csv(io.BytesIO(file_bytes))
                content = df.to_string(index=False)
                
            elif ext in ['xlsx', 'xls']:
                df = pd.read_excel(io.BytesIO(file_bytes))
                content = df.to_string(index=False)
                
            else:
                # Text, code, markdown, json, etc.
                try:
                    content = file_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    content = file_bytes.decode("latin-1")
                    
        except Exception as e:
            return f"[Error extracting {filename}: {str(e)}]"
            
        return content

    @staticmethod
    def compare_documents(doc1_content: str, doc2_content: str) -> str:
        """Helper to structure comparison prompt."""
        return (
            "Please perform a detailed comparison of the following two documents. "
            "Highlight the key similarities, the major differences, and provide an overall summary of how they contrast.\n\n"
            "--- DOCUMENT 1 ---\n"
            f"{doc1_content}\n\n"
            "--- DOCUMENT 2 ---\n"
            f"{doc2_content}\n\n"
            "Please structure your response with clear headings."
        )
