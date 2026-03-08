import requests

API_KEY = "L20L6NZLQ7TFYAPB"

def get_commodity(func):
    url = f"https://www.alphavantage.co/query?function={func}&interval=monthly&apikey={API_KEY}"
    r = requests.get(url)
    data = r.json()
    return data

print("ALUMINUM:", get_commodity("ALUMINUM"))
