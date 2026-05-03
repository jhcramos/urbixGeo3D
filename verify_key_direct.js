const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
    const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('Missing GEMINI_API_KEY');
    console.log("Testing key:", key.substring(0, 8) + "...");

    try {
        const genAI = new GoogleGenerativeAI(key);

        console.log("Trying model: gemini-1.5-flash");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log("Success! Response:", response.text());
    } catch (e) {
        console.error("Failed:", e.message);
    }
}

test();
