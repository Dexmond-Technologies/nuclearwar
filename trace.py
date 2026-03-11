import urllib.request
import json

url = "https://public-api.solscan.io/token/holders?tokenAddress=AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa&limit=10"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("TOP 5 HOLDERS:")
        for idx, holder in enumerate(data.get('data', [])[:5]):
            print(f"{idx+1}. {holder['address']} | Amount: {holder['amount'] / 1e6}")
except Exception as e:
    print(e)
