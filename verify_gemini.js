const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

async function test() {
    try {
        const envPath = path.join(__dirname, ".env.local");
        if (!fs.existsSync(envPath)) {
            console.error("Error: .env.local file not found.");
            return;
        }
        const envContent = fs.readFileSync(envPath, "utf8");
        const match = envContent.match(/GEMINI_API_KEY=(.*)/);
        const key = match ? match[1].trim() : null;

        if (!key || key === "YOUR_GEMINI_API_KEY_HERE") {
            console.error("Error: Invalid or placeholder API key found in .env.local");
            return;
        }

        console.log("Found key starting with:", key.substring(0, 8) + "...");

        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log("Testing API connection...");
        const result = await model.generateContent("Reply with 'Success' if you can read this.");
        const response = await result.response;
        console.log("API Response:", response.text());
        console.log("✅ API Key is VALID and working!");

    } catch (e) {
        console.error("❌ API Test Failed:", e.message);
        if (e.message.includes("API_KEY_INVALID")) {
            console.error("Reason: The API key provided is invalid.");
        }
    }
}

test();
