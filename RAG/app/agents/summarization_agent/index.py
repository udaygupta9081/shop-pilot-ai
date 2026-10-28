# pyrefly: ignore [missing-import]
import logging
import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from langchain_google_genai import ChatGoogleGenerativeAI
# pyrefly: ignore [missing-import]
from langchain_core.output_parsers import StrOutputParser
from typing import List
from .prompt import prompt

load_dotenv()
logger = logging.getLogger("Summarization Agent")

def summarize(summary: str, messages:list):
    
    try:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            logger.warning("GOOGLE_API_KEY is not set.")
            return None
        
        llm = ChatGoogleGenerativeAI(api_key=api_key, model="gemini-3.6-flash")
        parser = StrOutputParser()
        chain = prompt | llm | parser
        response = chain.invoke({"summary": summary, "messages": messages})
        return response
    except Exception as e:
        logger.error(f"Failed to summarize: {e}")
        return None