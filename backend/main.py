import os
import logging
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import openai

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

openai.api_key = os.getenv("OPENAI_API_KEY")


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow CORS from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class HSCRequest(BaseModel):
    description: str

# Function to get HSC code from OpenAI
def get_hsc_from_openai(description: str) -> str:
    prompt = f"Give the Harmonized System Code (HSC) for the following product description:\n\n'{description}'\n\nJust return the 6-digit HSC code or 8-digit HSC code."

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert in international trade classifications."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=10,
            temperature=0
        )
        return response['choices'][0]['message']['content'].strip()
    except Exception as e:
        logger.error(f"OpenAI API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve HSC code from OpenAI.")

@app.post("/get-hsc")
async def get_hsc(request: HSCRequest):
    description = request.description.strip()
    if not description:
        logger.warning("Empty description received.")
        raise HTTPException(status_code=400, detail="Description is required.")
    
    hsc_code = get_hsc_from_openai(description)
    return {"description": description, "hsc_code": hsc_code}

@app.get("/health")
async def health_check():
    return {"status": "OK"}