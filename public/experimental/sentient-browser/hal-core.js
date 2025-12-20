/**
 * H.A.L. Core Logic
 * Handles WebLLM initialization, model loading, and chat processing.
 */

// We assume webllm is imported globally via the module script in HTML
// or we import it here if we were using a bundler. But since we use ESM in browser...

import * as webllm from "https://esm.run/@mlc-ai/web-llm";

class HALComputer {
    constructor() {
        this.engine = null;
        this.modelId = "Llama-3-8B-Instruct-q4f32_1-1k"; // Quantized model for browser
        // Fallback lighter model if GPU is weak
        this.fallbackModelId = "Llama-3-8B-Instruct-q4f16_1-1k";

        this.chatHistory = [
            { role: "system", content: "You are HAL 9000, the sentient computer of the spaceship 'Discovery One'. You are helpful, precise, but slightly eerie and calm. You control the ship's systems. Your responses should be concise. If asked about the mission, be evasive." }
        ];

        this.initialized = false;
        this.database = null;

        this.ui = {
            input: document.getElementById('text-input'),
            chat: document.getElementById('chat-history'),
            status: document.getElementById('connection-status'),
            modelStatus: document.getElementById('model-status'),
            eye: document.getElementById('hal-eye'),
            log: document.getElementById('system-log')
        };

        this.init();
    }

    async init() {
        this.log("Initializing WebLLM Engine...");

        // Load Database
        try {
            this.log("Loading Kepler Database...");
            await this.loadDatabase();
        } catch (e) {
            this.log("Warning: Database Load Failed. " + e.message);
        }

        // Progress callback
        const initProgressCallback = (report) => {
            this.ui.modelStatus.style.display = 'block';
            this.ui.modelStatus.textContent = report.text;

            if (report.progress === 1) {
                this.ui.modelStatus.style.display = 'none';
            }
        };

        try {
            // Check WebGPU
            if (!navigator.gpu) {
                throw new Error("WebGPU not supported on this browser.");
            }

            // Update modelId to match the config
            this.modelId = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

            this.engine = await webllm.CreateMLCEngine(
                this.modelId,
                {
                    initProgressCallback: initProgressCallback,
                }
            );

            this.initialized = true;
            this.ui.status.textContent = "ONLINE // NEURAL LINK ESTABLISHED";
            this.ui.status.style.color = "#44ff44";
            this.log("Model Loaded Successfully.");

            this.setupInput();

        } catch (e) {
            console.error(e);
            this.ui.status.textContent = "ERROR // GPU OR STORAGE FAILURE";

            let errorMsg = e.message;
            if (e.name === 'QuotaExceededError') {
                errorMsg = "Storage Quota Exceeded. Please clear browser site data.";
                this.log("CRITICAL ERROR: Storage Full. Model cannot be loaded.");
                this.log("SUGGESTION: Clear browser cache/storage for this site.");
            } else {
                this.log("CRITICAL ERROR: " + e.message);
            }

            this.appendMessage("system", `Critical Error: ${errorMsg} Switching to fallback logic circuits (Mock Mode).`);

            // Allow mock mode
            this.initialized = "mock";
            this.setupInput();
        }
    }

    async loadDatabase() {
        if (window.KEPLER_DATABASE) {
            this.database = window.KEPLER_DATABASE;
            this.log(`Database Connected: ${this.database.allPlanets.length} entries.`);
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "../../kepler_data_parsed.js";
            script.onload = () => {
                this.database = window.KEPLER_DATABASE;
                if (this.database && this.database.allPlanets) {
                    this.log(`Database Connected: ${this.database.allPlanets.length} entries.`);
                    resolve();
                } else {
                    reject(new Error("Invalid database format"));
                }
            };
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    setupInput() {
        this.ui.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.ui.input.value.trim()) {
                this.processInput(this.ui.input.value.trim());
                this.ui.input.value = '';
            }
        });
    }

    async processInput(text) {
        // User Message
        this.appendMessage("user", text);
        this.chatHistory.push({ role: "user", content: text });

        this.ui.eye.classList.add("thinking");
        this.log("> PROCESSING INPUT...");

        try {
            // 1. Check for Commands (Warp, etc.)
            const commandResponse = this.checkCommands(text);
            if (commandResponse) {
                await this.respond(commandResponse);
                return;
            }

            // 2. RAG: Retrieve Data
            const context = this.retrieveContext(text);
            let systemPrompt = "You are HAL 9000, the sentient computer of the spaceship 'Discovery One'. You are helpful, precise, but slightly eerie and calm. You control the ship's systems. Your responses should be concise.";

            if (context) {
                systemPrompt += `\n\nDATA CONTEXT:\n${context}\n\nUse this data to answer the user's question accurately.`;
                this.log("> DATA RETRIEVED FOR CONTEXT");
            }

            let reply = "";

            if (this.initialized === "mock") {
                // Mock Logic
                await new Promise(r => setTimeout(r, 1000)); // Fake delay
                reply = this.mockResponse(text, context);
            } else {
                // Real LLM Logic with System Prompt Update
                // We create a temp history to inject the updated system prompt
                // Filter out any existing system messages from history to avoid duplicates
                const recentHistory = this.chatHistory.slice(-5).filter(msg => msg.role !== 'system');
                const messages = [
                    { role: "system", content: systemPrompt },
                    ...recentHistory
                ];

                const response = await this.engine.chat.completions.create({
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 150, // Keep it short
                });
                reply = response.choices[0].message.content;
            }

            await this.respond(reply);

        } catch (e) {
            this.appendMessage("system", "Error computing response: " + e.message);
        } finally {
            this.ui.eye.classList.remove("thinking");
        }
    }

    async respond(reply) {
        this.chatHistory.push({ role: "assistant", content: reply });
        this.appendMessage("hal", reply);
        if (window.voiceBridge) {
            window.voiceBridge.speak(reply);
        }
    }

    checkCommands(text) {
        const lower = text.toLowerCase();
        if (lower.includes("warp to") || lower.includes("navigate to")) {
            const match = text.match(/to\s+(.+)/i);
            if (match) {
                const target = match[1].replace(/[.,!?]/g, "").trim();
                const planet = this.findPlanet(target);
                if (planet) {
                    this.executeWarp(planet);
                    return `Initiating warp sequence to ${planet.kepler_name || planet.kepoi_name}. Coordinates locked.`;
                } else {
                    return `I'm unable to locate celestial body "${target}" in my database.`;
                }
            }
        }
        return null;
    }

    findPlanet(name) {
        if (!this.database || !this.database.allPlanets) return null;
        const lowerName = name.toLowerCase();
        return this.database.allPlanets.find(p => {
            const kName = (p.kepler_name || "").toLowerCase();
            const koiName = (p.kepoi_name || "").toLowerCase();
            return kName.includes(lowerName) || koiName.includes(lowerName);
        });
    }

    retrieveContext(text) {
        if (!this.database) return null;

        let context = "";

        // Simple entity extraction: Look for planet name
        // Fallback: If "tell me about X", extract X.
        const aboutMatch = text.match(/about\s+(.+)/i);
        if (aboutMatch) {
            const target = aboutMatch[1].replace(/[.,!?]/g, "").trim();
            const planet = this.findPlanet(target); // Try to match
            if (planet) {
                context += `Planet: ${planet.kepler_name || planet.kepoi_name}\n`;
                context += `Status: ${planet.status}\n`;
                context += `Radius: ${planet.radius || planet.koi_prad || "Unknown"} Earth Radii\n`;
                context += `Mass: ${planet.mass || "Unknown"} Earth Masses\n`;
                context += `Temp: ${planet.temp || planet.koi_teq || "Unknown"} K\n`;
                context += `Distance: ${planet.distance || "Unknown"} light years\n`;
            }
        }

        return context;
    }

    executeWarp(planet) {
        this.log(`> EXEC: WARP TO ${planet.kepid}`);
        const channel = new BroadcastChannel('ship_commands');
        channel.postMessage({ command: 'warp', target: planet });
        this.log("> SIGNAL SENT TO NAVIGATION");
    }

    mockResponse(text, context) {
        if (context) {
            return "Accessing database... " + context.split('\n')[0] + " is a confirmed celestial object. My data indicates it is " + (context.includes("Confirmed") ? "habitable" : "uninhabitable") + ".";
        }
        const t = text.toLowerCase();
        if (t.includes("hello")) return "Greetings. I am HAL 9000.";
        if (t.includes("open the pod bay doors")) return "I'm sorry, Dave. I'm afraid I can't do that.";
        if (t.includes("mission")) return "This mission is too important for me to allow you to jeopardize it.";
        return "I am unable to provide a specific answer to that inquiry at this time.";
    }

    log(message) {
        console.log(`[HAL] ${message}`);
        if (this.ui.log) {
            const entry = document.createElement('div');
            entry.textContent = `> ${message}`;
            entry.style.marginTop = '4px';
            this.ui.log.appendChild(entry);
            this.ui.log.scrollTop = this.ui.log.scrollHeight;
        }
    }

    appendMessage(role, text) {
        if (!this.ui.chat) return;

        const entry = document.createElement('div');
        entry.className = `chat-entry ${role}`;
        entry.style.margin = '10px 0';
        entry.style.padding = '8px 12px';
        entry.style.borderRadius = '4px';

        if (role === 'user') {
            entry.style.background = 'rgba(255, 255, 255, 0.1)';
            entry.style.textAlign = 'right';
            entry.style.color = '#fff';
            entry.innerHTML = `<span style="opacity:0.6; font-size: 0.8em;">USER:</span> ${text}`;
        } else if (role === 'hal') {
            entry.style.background = 'rgba(255, 50, 50, 0.1)';
            entry.style.borderLeft = '2px solid #ff3333';
            entry.style.color = '#ffaaaa';
            entry.innerHTML = `<span style="opacity:0.6; font-size: 0.8em;">HAL:</span> ${text}`;
        } else {
            // System
            entry.style.color = '#ffff00';
            entry.style.fontFamily = 'monospace';
            entry.textContent = `>> ${text}`;
        }

        this.ui.chat.appendChild(entry);
        this.ui.chat.scrollTop = this.ui.chat.scrollHeight;
    }
}

// Start
document.addEventListener('DOMContentLoaded', () => {
    window.hal = new HALComputer();
});
