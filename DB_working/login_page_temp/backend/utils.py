# utils.py
import requests
import json
import re

LLAMA_CPP_URL = "http://127.0.0.1:8080/v1/chat/completions"

class LLMConnectionError(Exception):
    """Custom exception for LLM connection errors"""
    pass

def get_local_llm_response(prompt_text):
    """
    Sends a prompt to the local llama.cpp server and gets a response.
    It also cleans the response by removing <think> blocks.
    Raises LLMConnectionError if connection fails.
    """
    prompt_text += " /no-think" # Suppress the <think> block
    headers = { "Content-Type": "application/json" }
    data = {
        "model": "local-model",
        "messages": [{"role": "user", "content": prompt_text}],
        "temperature": 0.7,
        "max_tokens": 14000
    }
    try:
        response = requests.post(LLAMA_CPP_URL, headers=headers, data=json.dumps(data), timeout=30)
        response.raise_for_status()
        content = response.json()['choices'][0]['message']['content']
        # Reliably remove the <think> block if the AI still adds it
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
        return content
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Error connecting to local LLM server: {e}"
        print(error_msg)
        raise LLMConnectionError("AI server is offline. Please start the LLM server on port 8080 and try again.")
    except requests.exceptions.RequestException as e:
        error_msg = f"Error connecting to local LLM server: {e}"
        print(error_msg)
        raise LLMConnectionError("AI server is offline. Please start the LLM server on port 8080 and try again.")