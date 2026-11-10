# pyrefly: ignore [missing-import]
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_template(
    "Write a natural 3-7 word title for this conversation. "
    "Return only the title, with no explanation or quotation marks.\n"
    "Conversation:\n{context}"
)