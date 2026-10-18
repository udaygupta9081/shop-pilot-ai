# pyrefly: ignore [missing-import]
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_template(
    """
    You are a conversation title generation agent.

    Your task is to generate a short, meaningful title for the conversation
    based on the provided context.

    Instructions:
    - Identify the main topic or purpose of the conversation.
    - Generate a concise title, ideally 3-7 words.
    - Use natural, descriptive language.
    - Capture the primary topic rather than minor details.
    - If the conversation involves debugging, reflect the problem being solved.
    - If it involves building something, reflect the feature or system being built.
    - Do not include explanations, summaries, or introductory phrases.
    - Do not use quotation marks around the title.
    - Return only the title as plain text.

    Conversation:
    {context}
    """
)