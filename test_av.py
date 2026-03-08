import requests

API_KEY = "L20L6NZLQ7TFYAPB"

def get_commodity(func):
    url = f"https://www.alphavantage.co/query?function={func}&interval=monthly&apikey={API_KEY}"
    r = requests.get(url)
    data = r.json()
    if 'data' in data:
        return float(data['data'][0]['value'])
    return None

def get_global_quote(symbol):
    url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={API_KEY}"
    r = requests.get(url)
    data = r.json()
    if 'Global Quote' in data and '05. price' in data['Global Quote']:
        return float(data['Global Quote']['05. price'])
    return None

print("COPPER:", get_commodity("COPPER"))
print("ALUMINUM:", get_commodity("ALUMINUM"))
print("LIT:", get_global_quote("LIT"))
print("REMX:", get_global_quote("REMX"))
print("GLD:", get_global_quote("GLD"))
print("VALE:", get_global_quote("VALE"))
print("NICK:", get_global_quote("NICK"))
