import requests
from dotenv import load_dotenv
import os

def send_to_bale(message):
    load_dotenv()
    token = os.getenv('BALE_TOKEN')
    url = f"https://tapi.bale.ai/bot{token}/sendMessage"
    payload = {
        "chat_id": 1048249292,
        "text": message,
    }
    return requests.post(url, json=payload)