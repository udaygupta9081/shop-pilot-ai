# pyrefly: ignore [missing-import]
import logging
import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from langchain_google_genai import ChatGoogleGenerativeAI
# pyrefly: ignore [missing-import]
from langchain_core.output_parsers import StrOutputParser
from .prompt import prompt

load_dotenv()
logger = logging.getLogger("Naming Agent")
parser = StrOutputParser()

# Cache the naming chain to avoid recreating LLM and pipeline on every request
_naming_chain = None

def get_naming_chain():
    global _naming_chain
    if _naming_chain is not None:
        return _naming_chain

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("GOOGLE_API_KEY is not set.")
        return None

    # Model configuration (gemini-3.6-flash)
    model_name = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")

    try:
        llm_kwargs = {
            "model": model_name,
            "google_api_key": api_key,
            "max_retries": 1,
            "request_timeout": 15.0  # Google API requires minimum deadline >= 10.0s
        }
        # gemini-3.6-flash uses fixed sampling defaults; omit temperature to avoid warnings
        if "3.6" not in model_name:
            llm_kwargs["temperature"] = 0.2

        llm = ChatGoogleGenerativeAI(**llm_kwargs)
        _naming_chain = prompt | llm | parser
        return _naming_chain
    except Exception as e:
        logger.error(f"Failed to initialize naming chain: {e}")
        return None

def name_conversation(question: str) -> str:
    clean_q = (question or "").strip()
    if not clean_q:
        return "New Chat"

    # Fast-path only for trivial greetings
    lower_q = clean_q.lower()
    if lower_q in ["hi", "hello", "hey", "hola", "new chat"]:
        return "New Chat"

    fallback_title = clean_q[:35].strip() + ("..." if len(clean_q) > 35 else "")

    chain = get_naming_chain()
    if not chain:
        return fallback_title

    try:
        response = chain.invoke({"context": clean_q})
        raw_title = str(response).strip(' \t\n\r"\'`')
        if raw_title:
            # Enforce single-line title and strip extra formatting
            first_line = raw_title.split("\n")[0].strip(' "\'`')
            if first_line:
                print(f"[Naming Agent] Generated title: {first_line}", flush=True)
                return first_line
        return fallback_title
    except Exception as e:
        logger.error(f"Naming agent error: {e}")
        return fallback_title