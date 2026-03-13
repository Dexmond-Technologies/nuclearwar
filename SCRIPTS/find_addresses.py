import os
import re

btc_regex = re.compile(r'bc1[a-z0-9]{39,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}')
solana_regex = re.compile(r'[1-9A-HJ-NP-Za-km-z]{32,44}')

found = []
for root, _, files in os.walk('.'):
    if '.git' in root or 'node_modules' in root: continue
    for file in files:
        if file.endswith(('.js', '.html', '.txt', '.env')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    btcs = btc_regex.findall(content)
                    if btcs:
                        for b in btcs:
                            if len(b) > 20: found.append(f"BTC in {path}: {b}")
                            
                    sols = solana_regex.findall(content)
                    if sols:
                        for s in sols:
                            if len(s) > 30 and 'bc1' not in s and 'import' not in s and 'export' not in s: 
                                found.append(f"SOL in {path}: {s}")
                                
            except Exception as e:
                pass

for f in set(found):
    print(f)
