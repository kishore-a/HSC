import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import openai
import re

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

openai.api_key = os.getenv("OPENAI_API_KEY")


from fastapi.middleware.cors import CORSMiddleware
import openpyxl
from io import BytesIO
from fastapi import UploadFile, File
from typing import List

app = FastAPI()

# Allow CORS from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class HSCRequest(BaseModel):
    description: str

# Function to get HSC code from OpenAI
def get_hsc_from_openai(description: str) -> str:
    # Instruct the model to return only the numeric HSC code (6 or 8 digits)
    system_message = (
        "You are an expert in international trade classifications. "
        "When asked for an HSC code, reply with only the numeric 6- or 8-digit code, "
        "with no additional text, explanation, or punctuation."
    )
    user_prompt = f"Provide the Harmonized System Code (HSC) for the following product description:\n\n'{description}'"

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=10,
            temperature=0,
            stop=["\n"]
        )
        raw = response.choices[0].message.content
        # Extract a 6- or 8-digit code if present
        match = re.search(r"\b(\d{6}(?:\d{2})?)\b", raw)
        if match:
            return match.group(1)
        # Fallback to raw response
        return raw.strip()
    except Exception as e:
        logger.error(f"OpenAI API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve HSC code from OpenAI.")

@app.post("/get-hsc")
def get_hsc(request: HSCRequest):
    description = request.description.strip()
    if not description:
        logger.warning("Empty description received.")
        raise HTTPException(status_code=400, detail="Description is required.")
    
    hsc_code = get_hsc_from_openai(description)
    return {"description": description, "hsc_code": hsc_code}

@app.get("/health")
async def health_check():
    return {"status": "OK"}


# Data model for QA requests
class TableRow(BaseModel):
    description: str
    hsc_code: str

class QARequest(BaseModel):
    question: str
    table: List[TableRow]

@app.post("/ask")
def ask(request: QARequest):
    # Build a text representation of the table
    lines = [f"{i+1}. {row.description} -> {row.hsc_code}" for i, row in enumerate(request.table)]
    table_text = "\n".join(lines)
    system_msg = (
        "You are a helpful assistant that answers questions based on a table of product descriptions and HSC codes. "
        "Use only the information provided; do not invent data."
    )
    user_prompt = f"Here is the table of products and HSC codes:\n{table_text}\n\nQuestion: {request.question}"
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0
        )
        answer = response.choices[0].message.content.strip()
        return {"answer": answer}
    except Exception as e:
        logger.error(f"OpenAI QA API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to answer question.")

@app.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    # Accept only Excel files
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .xlsx files are supported.")
    try:
        contents = await file.read()
        wb = openpyxl.load_workbook(filename=BytesIO(contents))
        ws = wb.active
        # Read header row to find 'description' column
        header = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
        desc_idx = next((i for i, h in enumerate(header) if h and str(h).lower() == 'description'), 0)
        # Process each row and build result list
        results = []  # type: List[dict]
        for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
            desc_cell = row[desc_idx].value
            desc = str(desc_cell) if desc_cell is not None else ''
            code = get_hsc_from_openai(desc) if desc else ''
            # Stub confidence; refine as needed
            confidence = 1.0 if code else 0.0
            results.append({"description": desc, "hsc_code": code, "confidence": confidence})
        return {"filename": file.filename, "rows": results}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Excel upload: {e}")
        raise HTTPException(status_code=500, detail="Failed to process Excel file.")