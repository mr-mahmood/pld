import requests
from datetime import datetime
import cv2

idx_to_value = {
  0: "0",
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "ا",
  11: "ب",
  12: "ت",
  13: "ث",
  14: "ج",
  15: "د",
  16: "ز",
  17: "س",
  18: "ش",
  19: "ص",
  20: "ط",
  21: "ع",
  22: "ق",
  23: "ل",
  24: "م",
  25: "ن",
  26: "ه",
  27: "و",
  28: "پ",
  29: "ژ",
  30: "ی"
}


# -----------------------------
# Send request to fetch all active gates
# -----------------------------
def fetch_gates_from_backend():
    API_URL = "http://127.0.0.1:8000/api/gates/vision/"
    headers = {"Authorization": "Bearer sUpErsecreTcvtoken123@#fg5"}
    response = requests.get(API_URL, headers=headers).json()
    
    gates = []
    
    if response["success"] == True and response["data"] != []:
        gates = response["data"]["gates"]

    for idx, gate in enumerate(gates):
        gate["gate_idx"] = idx
    
    return gates
# -----------------------------
# Divide the list of gates into fixed-size chunks for parallel processing
# -----------------------------
def split_gates(gates, chunk_size=5):
    return [gates[i:i+chunk_size] for i in range(0, len(gates), chunk_size)]
        
    
def log(label, message):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"\n{now} | {label:<30} | {message}", end='')
    