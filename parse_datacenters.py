import csv
import json

coords_map = {
    'Hohhot': [40.84, 111.75],
    'Tahoe Reno': [39.53, -119.81],
    'Harbin': [45.80, 126.53],
    'Zhangbei': [41.15, 114.71],
    'Langfang': [39.53, 116.70],
    'Las Vegas': [36.17, -115.13],
    'Council Bluffs': [41.26, -95.86],
    'Newport': [51.58, -2.99],
    'Bluffdale': [40.45, -111.93],
    'Mesa': [33.41, -111.83],
    'Chicago': [41.87, -87.62],
    'Atlanta': [33.74, -84.38],
    'Northern Virginia': [38.84, -77.42],  # Ashburn approx
    'Ashburn': [39.04, -77.48],
    'Panvel': [18.98, 73.11],
    'Covilhã': [40.28, -7.50],
    'Quincy': [47.23, -119.85],
    'Frankfurt': [50.11, 8.68]
}

data = []
# It's actually a TSV-like format pasted with some weird chars maybe. Let's read it lines.
with open('datacenters_global.csv', 'r') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('\u200b'):
            continue
        parts = line.split('\t')
        if len(parts) >= 4:
            name = parts[1].strip()
            operator = parts[2].strip()
            location = parts[3].strip()
            
            lat, lon = None, None
            for key in coords_map:
                if key in location:
                    lat, lon = coords_map[key]
                    break
            
            if lat is not None:
                data.append({
                    "name": name,
                    "operator": operator,
                    "location": location,
                    "lat": lat,
                    "lon": lon
                })

with open('tmp_datacenters.json', 'w') as out:
    json.dump(data, out, indent=2)

