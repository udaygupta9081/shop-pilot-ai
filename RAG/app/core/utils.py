import json
import re
from typing import Any, Union


def extract_json_safely(response_content: Union[str, list, Any]) -> dict:
    """Robustly extract and parse JSON from LLM output, handling list and string contents."""
    if isinstance(response_content, list):
        text_parts = []
        for part in response_content:
            if isinstance(part, str):
                text_parts.append(part)
            elif isinstance(part, dict) and "text" in part:
                text_parts.append(str(part["text"]))
            elif hasattr(part, "text"):
                text_parts.append(str(part.text))
            else:
                text_parts.append(str(part))
        text = "".join(text_parts)
    elif isinstance(response_content, str):
        text = response_content
    else:
        text = str(response_content)

    text = text.strip()

    # Strip markdown code fences if present
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        text = match.group(1)
    else:
        brace_match = re.search(r"(\{.*\})", text, re.DOTALL)
        if brace_match:
            text = brace_match.group(1)

    return json.loads(text)
