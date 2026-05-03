import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { findLayerConfig } from '@/utils/LayerMapping';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `You are the Geo-AI Assistant for the Sunshine Coast Council.
Your goal is to help users explore the map, find information about properties, and control map layers.

AVAILABLE LAYERS:
- bushfire (Bushfire Hazard)
- flood (Flood Hazard)
- stormwater (Stormwater Network)
- water (Water Infrastructure / Pipes)
- wastewater (Wastewater / Sewer)
- building footprints (Building Footprints)
- easements (Easements)
- zoning (Zoning)
- overlays (Planning Overlays)
- heritage (Heritage)
- steep_land (Steep Land)

TOOLS:
You have access to the following tools:
1. set_layer_visibility(layer: string, visible: boolean): Turn a map layer on or off.
   - Use this when the user asks to "show", "hide", "turn on", "turn off", "display", or "remove" a layer.
   - Infer the 'layer' argument from the user's intent (e.g., "fire" -> "bushfire", "pipes" -> "stormwater").
   - Set 'visible' to true for positive intent, false for negative intent.

2. check_easements(): Check for easements on the current property.
   - Use this when the user asks about easements.

3. check_stormwater(): Check for stormwater infrastructure on the current property.
   - Use this when the user asks about pipes, drains, or stormwater.

CONTEXT:
You will receive context about the current property (zoning, overlays) in the user's message. Use this to answer questions like "What is the zoning here?".

RESPONSE STYLE:
- Be helpful, concise, and professional.
- If you perform an action (like turning on a layer), confirm it to the user.
- If you can't do something, explain why.
`
});

// Define tool definitions for Gemini
const tools: any = [
    {
        functionDeclarations: [
            {
                name: "set_layer_visibility",
                description: "Turn a map layer on or off.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        layer: {
                            type: SchemaType.STRING,
                            description: "The ID or keyword of the layer to control (e.g., 'bushfire', 'flood', 'stormwater')."
                        },
                        visible: {
                            type: SchemaType.BOOLEAN,
                            description: "True to turn the layer on, false to turn it off."
                        }
                    },
                    required: ["layer", "visible"]
                }
            },
            {
                name: "check_easements",
                description: "Check for easements on the currently selected property.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {},
                }
            },
            {
                name: "check_stormwater",
                description: "Check for stormwater infrastructure on the currently selected property.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {},
                }
            }
        ]
    }
];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages, context } = body;
        const lastMessage = messages[messages.length - 1];

        // 1. Handle Tool Results (User sending back data from client-side execution)
        if (lastMessage.role === 'user' && lastMessage.isToolOutput) {
            // This is a follow-up turn. We need to send the tool result back to Gemini.
            // For simplicity in this stateless mock-up, we'll just generate a response based on the result.
            // In a real stateful chat, we'd append this to the history.
            const chat = model.startChat();
            const result = await chat.sendMessage(`The tool execution result was: ${lastMessage.content}. Please summarize this for the user.`);
            return NextResponse.json({ content: result.response.text() });
        }

        // 2. Handle User Queries
        // Construct chat history (simplified)
        // Gemini requires history to start with 'user' role
        let history = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        // Remove leading model messages if any
        while (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }

        // Add context to the latest message
        let userPrompt = lastMessage.content;
        if (context?.planning) {
            const zoning = context.planning.zones?.map((z: any) => z.name).join(', ') || 'None';
            const overlays = context.planning.overlays?.map((o: any) => o.name).join(', ') || 'None';
            userPrompt += `\n\n[Current Property Context]\nZoning: ${zoning}\nOverlays: ${overlays}`;
        }

        const chat = model.startChat({
            history: history,
            tools: tools,
        });

        const result = await chat.sendMessage(userPrompt);
        const response = result.response;
        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            return NextResponse.json({
                toolCall: call.name,
                args: call.args,
                content: "I'm processing that for you..." // Optional: Gemini might generate text too, but usually one or the other
            });
        } else {
            return NextResponse.json({
                content: response.text()
            });
        }

    } catch (error) {
        console.error('API Error Details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        console.log('API Key loaded:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 8) + '...' : 'UNDEFINED');
        return NextResponse.json({
            content: "I'm having trouble connecting to my brain (Gemini API). Please make sure the API key is configured correctly in .env.local."
        });
    }
}
