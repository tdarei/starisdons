/**
 * Galactic Senate System
 * UI and logic for player governance and voting.
 * Bridges the gap between the Solidity DAO contract and the frontend.
 */

class GalacticSenate {
    constructor() {
        this.isOpen = false;
        this.activeBills = [];
        this.votingPower = 0; // Derived from StarToken balance (simulated)

        // Mock Data for Prototype
        this.activeBills = [
            {
                id: 101,
                title: "Increase Helium-3 Spawn Rate",
                description: "Proposal to increase global He-3 deposits by 15% to fuel the growing fleet requirements.",
                author: "Admiral_Adybag",
                votesFor: 15420,
                votesAgainst: 4200,
                endTime: Date.now() + 86400000 * 2, // 2 days
                status: "active"
            },
            {
                id: 102,
                title: "Terraforming Subsidies Act",
                description: "Grant 500 Credits to any player who reaches Terraforming Stage 2 on a Barren World.",
                author: "Eco_Warrior_99",
                votesFor: 8900,
                votesAgainst: 9100,
                endTime: Date.now() + 86400000 * 1, // 1 day
                status: "active"
            },
            {
                id: 103,
                title: "Declare War on Thargoids",
                description: "Authorized use of force against the invading Thargoid fleets in Sector 7.",
                author: "Hawk_Legion",
                votesFor: 45000,
                votesAgainst: 200,
                endTime: Date.now() - 10000, // Ended
                status: "passed"
            }
        ];

        this.init();
    }

    init() {
        console.log('🏛️ Galactic Senate System Initialized');
        // Simulate fetching wallet balance
        this.votingPower = Math.floor(Math.random() * 5000) + 500;
    }

    showUI() {
        if (this.isOpen) return;
        this.createModal();
        this.isOpen = true;
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'senate-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(10, 15, 30, 0.95);
            z-index: 20000;
            display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
            font-family: 'Cinzel', serif; /* Majestic font */
            color: #d4af37;
            padding-top: 50px;
            backdrop-filter: blur(5px);
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            width: 80%; max-width: 1000px;
            background: rgba(0,0,0,0.8);
            border: 2px solid #d4af37;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 0 30px rgba(212, 175, 55, 0.2);
            max-height: 80vh; overflow-y: auto;
        `;

        // Load font dynamically if needed, or fallback
        const header = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #d4af37; padding-bottom: 1rem; margin-bottom: 2rem;">
                <div>
                    <h1 style="margin:0; font-size: 2.5rem; text-transform: uppercase; letter-spacing: 2px;">The Galactic Senate</h1>
                    <div style="font-family: 'Raleway', sans-serif; color: #888; margin-top: 0.5rem;">
                        Voice of the Federation • Voting Power: <span style="color:#fff;">${this.votingPower} $STAR</span>
                    </div>
                </div>
                <button onclick="document.getElementById('senate-modal').remove(); window.galacticSenate.isOpen = false;" 
                    style="background:none; border:none; color:#d4af37; font-size:2rem; cursor:pointer;">×</button>
            </div>
        `;

        const billsHtml = this.activeBills.map(bill => this.renderBillItem(bill)).join('');

        content.innerHTML = header + `<div style="display:flex; flex-direction:column; gap: 1.5rem;">${billsHtml}</div>`;
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    renderBillItem(bill) {
        const totalVotes = bill.votesFor + bill.votesAgainst;
        const percentFor = totalVotes > 0 ? (bill.votesFor / totalVotes) * 100 : 0;

        const isEnded = bill.endTime < Date.now();
        const timeRemaining = isEnded ? "Voting Closed" : Math.ceil((bill.endTime - Date.now()) / (1000 * 60 * 60)) + " Hours Remaining";

        return `
            <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 4px; border-left: 4px solid ${isEnded ? '#666' : '#d4af37'};">
                <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                    <h3 style="margin:0; font-family: 'Raleway', sans-serif; font-size: 1.3rem; color: #fff;">#${bill.id}: ${bill.title}</h3>
                    <span style="font-size: 0.9rem; color: ${isEnded ? '#ff4' : '#4f4'};">${timeRemaining}</span>
                </div>
                <p style="font-family: 'Raleway', sans-serif; line-height: 1.5; color: #ccc; margin-bottom: 1rem;">${bill.description}</p>
                
                <div style="margin-bottom: 1rem;">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.2rem;">
                        <span>YES (${bill.votesFor.toLocaleString()})</span>
                        <span>NO (${bill.votesAgainst.toLocaleString()})</span>
                    </div>
                    <div style="height: 6px; background: #333; border-radius: 3px; overflow: hidden; display: flex;">
                        <div style="width: ${percentFor}%; background: #4caf50;"></div>
                        <div style="width: ${100 - percentFor}%; background: #f44336;"></div>
                    </div>
                </div>

                ${!isEnded ? `
                <div style="display:flex; gap: 1rem;">
                    <button onclick="window.galacticSenate.vote(${bill.id}, true)" 
                        style="flex:1; padding: 0.8rem; background: rgba(76, 175, 80, 0.2); border: 1px solid #4caf50; color: #4caf50; cursor: pointer; font-weight:bold; transition:all 0.2s;">
                        VOTE YES
                    </button>
                    <button onclick="window.galacticSenate.vote(${bill.id}, false)" 
                        style="flex:1; padding: 0.8rem; background: rgba(244, 67, 54, 0.2); border: 1px solid #f44336; color: #f44336; cursor: pointer; font-weight:bold; transition:all 0.2s;">
                        VOTE NO
                    </button>
                </div>
                ` : `
                <div style="text-align:center; padding: 0.5rem; background: rgba(0,0,0,0.3); color: #fff; font-family: 'Raleway', sans-serif;">
                    Outcome: ${bill.votesFor > bill.votesAgainst ? 'PASSED' : 'REJECTED'}
                </div>
                `}
            </div>
        `;
    }

    vote(billId, isFor) {
        // Find bill
        const bill = this.activeBills.find(b => b.id === billId);
        if (!bill) return;

        // Simulate transaction
        const voteWeight = this.votingPower;

        if (isFor) bill.votesFor += voteWeight;
        else bill.votesAgainst += voteWeight;

        // Visual update (re-render whole modal for simplicity, or just update DOM)
        // For MVP, close and reopen or alert
        alert(`Vote cast successfully! Your ${voteWeight} VP have been counted.`);

        // Refresh UI
        document.getElementById('senate-modal').remove();
        this.createModal();
    }
}

if (typeof window !== 'undefined') {
    window.GalacticSenate = GalacticSenate;
    window.galacticSenate = new GalacticSenate();
}
