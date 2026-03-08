import csv
import json

companies = []
with open('companies_global.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        lat, lon = row['coordinates'].split(',')
        companies.append({
            'name': row['company'],
            'city': row['city'],
            'lat': float(lat.strip()),
            'lon': float(lon.strip())
        })

print(json.dumps(companies))
