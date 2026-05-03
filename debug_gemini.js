const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) throw new Error('Missing GEMINI_API_KEY');
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

console.log("Sending request to:", URL.replace(API_KEY, "HIDDEN_KEY"));

const req = https.get(URL, (res) => {
    console.log(`Status Code: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log("Response Body:");
        try {
            const json = JSON.parse(body);
            if (json.models) {
                console.log("Available Gemini Models:");
                json.models.filter(m => m.name.includes('gemini')).forEach(m => console.log(`- ${m.name}`));
            } else {
                console.log(body);
            }
        } catch (e) {
            console.log(body);
        }
    });
});

req.on('error', (error) => {
    console.error("Request Error:", error);
});
