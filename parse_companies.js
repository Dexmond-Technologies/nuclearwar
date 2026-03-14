const fs = require('fs');

const data = fs.readFileSync('/home/r/Documents/Dexmond Technologies/nuclearwar/DATA/companies_global.csv', 'utf8');
const lines = data.split('\n').filter(l => l.trim().length > 0).slice(1); // skip header

const companies = [];

for (const line of lines) {
  // Parse CSV carefully expecting commas inside quotes
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  
  if (parts.length >= 3) {
    const company = parts[0].replace(/"/g, '');
    const coordsStr = parts[parts.length - 1].replace(/"/g, '');
    const coords = coordsStr.split(',');
    
    if (coords.length === 2 && !isNaN(parseFloat(coords[0])) && !isNaN(parseFloat(coords[1]))) {
      companies.push({
        name: company,
        lat: parseFloat(coords[0]),
        lon: parseFloat(coords[1])
      });
    }
  }
}

// Generate the exact JS array to inject into game.html
console.log('const GLOBAL_COMPANIES = ' + JSON.stringify(companies, null, 2) + ';');
