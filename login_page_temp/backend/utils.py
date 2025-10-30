# utils.py
import requests
import json
import re

LLAMA_CPP_URL = "http://127.0.0.1:8080/v1/chat/completions"

def get_local_llm_response(prompt_text):
    """
    Sends a prompt to the local llama.cpp server and gets a response.
    It also cleans the response by removing <think> blocks.
    """
    prompt_text += " /no-think" # Suppress the <think> block
    headers = { "Content-Type": "application/json" }
    data = {
        "model": "local-model",
        "messages": [{"role": "user", "content": prompt_text}],
        "temperature": 0.7,
        "max_tokens": 2048
    }
    try:
        response = requests.post(LLAMA_CPP_URL, headers=headers, data=json.dumps(data))
        response.raise_for_status()
        content = response.json()['choices'][0]['message']['content']
        # Reliably remove the <think> block if the AI still adds it
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
        return content
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to local LLM server: {e}")
        return f"Error connecting to local LLM server: {e}"