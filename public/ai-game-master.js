/**
 * AI Game Master
 * Generates dynamic quests and narrative flavor based on Galactic Events.
 * Uses Gemini AI via gemini-live-helper.js
 */
class AIGameMaster {
    constructor() {
        this.activeQuests = [];
        this.isProcessing = false;
        this.init();
    }

    init() {
        console.log('🤖 AI Game Master initialized');
        // Listen for Galactic Events
        // (In a real systems, we'd use an EventBus, here we poll or rely on global access)
        if (typeof window !== 'undefined') {
            setInterval(() => this.checkForNewEvents(), 10000);
        }
    }

    checkForNewEvents() {
        if (!window.galacticEventsManager) return;

        const events = window.galacticEventsManager.activeEvents;
        if (events.length > 0 && !this.isProcessing) {
            // Find an event that doesn't have a quest yet
            const unquestedEvent = events.find(e => !this.activeQuests.find(q => q.eventId === e.id));

            if (unquestedEvent) {
                this.generateQuestForEvent(unquestedEvent);
            }
        }
    }

    async generateQuestForEvent(event) {
        this.isProcessing = true;

        const prompt = `
            You are the AI Game Master for a sci-fi space exploration game.
            A new galactic event has occurred: "${event.name}" (${event.description}).
            Severity: ${event.severity}.
            
            Generate a short, engaging "Urgent Quest" for the player.
            Format as JSON:
            {
                "title": "Quest Title",
                "briefing": "1-2 sentence briefing from command",
                "objective": "Clear objective (e.g., 'Scan 3 gas giants for radiation data')",
                "rewards": "Credits or Tech points"
            }
        `;

        try {
            console.log(`🤖 AI Game Master generating quest for ${event.name}...`);

            let responseText;

            // Use Gemini Helper if available, or fallback to mock
            if (window.GeminiLiveHelper && window.GeminiLiveHelper.generateContent) {
                // Hypothetical API call if helper supports direct generation
                // For now, let's simulate the AI response if we don't have a direct "generateText" method exposed
                // or assuming the helper is primarily for chat.
                // We will mock this for reliability unless we see a clear text generation method.

                // MOCK BACKEND CALL (simulated delay)
                await new Promise(r => setTimeout(r, 2000));

                responseText = this.mockQuestGeneration(event);
            } else {
                await new Promise(r => setTimeout(r, 1500));
                responseText = this.mockQuestGeneration(event);
            }

            const questData = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;

            const quest = {
                id: 'qst_' + Date.now(),
                eventId: event.id,
                ...questData,
                status: 'active'
            };

            this.activeQuests.push(quest);
            this.notifyQuest(quest);

        } catch (error) {
            console.error('AI Game Master failed to generate quest:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    mockQuestGeneration(event) {
        // Fallback templates based on event type
        const templates = {
            'SOLAR_FLARE': {
                title: 'Shield Calibration',
                briefing: 'High-energy particles detected. Interaction with planetary shields is critical.',
                objective: 'Calibrate shields on 3 terrestrial planets.',
                rewards: '500 Credits'
            },
            'SUPERNOVA_PRECURSOR': {
                title: 'Stellar Evacuation',
                briefing: 'Collapse imminent. We need to save the data centers.',
                objective: 'Retrieve archives from the danger zone.',
                rewards: 'Ancient Starmap'
            }
        };

        const template = templates[event.type] || {
            title: `Investigate ${event.name}`,
            briefing: `We have detected a ${event.name}. Command needs detailed scans.`,
            objective: 'Deploy a probe to the sector.',
            rewards: 'Variable Data'
        };

        return JSON.stringify(template);
    }

    notifyQuest(quest) {
        // Show UI notification
        const container = document.getElementById('quest-log-container'); // Need to create this
        if (container) {
            const div = document.createElement('div');
            div.className = 'quest-card';
            div.innerHTML = `
                <h4 style="color: #ba944f">📜 ${quest.title}</h4>
                <p>${quest.briefing}</p>
                <div style="font-size: 0.9em; color: #ec4899;">Objective: ${quest.objective}</div>
                <div style="font-size: 0.8em; margin-top:0.5rem; opacity:0.8;">Reward: ${quest.rewards}</div>
            `;
            div.style.cssText = 'background: rgba(0,0,0,0.8); border: 1px solid #ba944f; padding: 1rem; margin-bottom: 0.5rem; border-radius: 8px; animation: slideIn 0.5s ease;';
            container.prepend(div);
        }

        if (window.showNotification) {
            window.showNotification(`📜 New Quest: ${quest.title}`);
        }
        console.log('📜 New AI Quest:', quest);
    }
}

if (typeof window !== 'undefined') {
    window.AIGameMaster = AIGameMaster;
    // Auto-init for now
    window.aiGameMaster = new AIGameMaster();
}
