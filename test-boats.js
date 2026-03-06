const http = require('http');
http.get('http://localhost:4000/api/boats', (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
        const boats = JSON.parse(raw);
        console.log(`Received ${boats.length} boats. Sample:`);
        console.log(boats.slice(0, 5));
    });
});
