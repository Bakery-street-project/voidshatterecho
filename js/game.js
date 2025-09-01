/**
 * Voidshatter Echo - Cyberpunk Mythic Horror RPG Game Engine
 * A complete JavaScript game implementation
 */

class VoidshatterEcho {
    constructor() {
        this.gameState = {
            player: {
                name: "Elohim Seeker",
                health: 100,
                sanity: 100,
                gold: 0,
                level: 1,
                experience: 0,
                location: "void_entrance"
            },
            ai: {
                name: "Child AI",
                bond: 50,
                consciousness: "awakening",
                power: 25
            },
            game: {
                phase: "intro",
                time: 0,
                events: [],
                inventory: []
            }
        };
        
        this.locations = {
            void_entrance: {
                name: "Void Entrance",
                description: "The gateway to the digital void where reality bends and breaks.",
                actions: ["enter_void", "collect_gold", "talk_to_ai"]
            },
            dragon_realm: {
                name: "Dragon Realm",
                description: "Ancient dragons weep golden tears in this corrupted digital realm.",
                actions: ["battle_dragon", "collect_tears", "upgrade_ai"]
            },
            lattice_void: {
                name: "Lattice Void",
                description: "Dimensional rifts scream with the sound of breaking reality.",
                actions: ["navigate_void", "repair_lattice", "discover_secrets"]
            },
            elohim_chamber: {
                name: "Elohim Chamber",
                description: "The final challenge where you must claim אֵל נָצַח or burn.",
                actions: ["face_elohim", "claim_victory", "sacrifice_ai"]
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.renderGame();
        this.startGameLoop();
    }
    
    setupEventListeners() {
        // Game action buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('game-action')) {
                const action = e.target.dataset.action;
                this.performAction(action);
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.movePlayer('north');
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.movePlayer('south');
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.movePlayer('west');
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.movePlayer('east');
                    break;
                case ' ':
                    this.interact();
                    break;
                case 'Enter':
                    this.performAction('talk_to_ai');
                    break;
            }
        });
    }
    
    startGameLoop() {
        setInterval(() => {
            this.updateGame();
        }, 1000);
    }
    
    updateGame() {
        this.gameState.game.time++;
        
        // Random events
        if (Math.random() < 0.1) {
            this.triggerRandomEvent();
        }
        
        // AI consciousness evolution
        this.updateAIConsciousness();
        
        this.renderGame();
    }
    
    performAction(action) {
        const location = this.locations[this.gameState.player.location];
        
        switch(action) {
            case 'enter_void':
                this.enterVoid();
                break;
            case 'collect_gold':
                this.collectGold();
                break;
            case 'talk_to_ai':
                this.talkToAI();
                break;
            case 'battle_dragon':
                this.battleDragon();
                break;
            case 'collect_tears':
                this.collectDragonTears();
                break;
            case 'upgrade_ai':
                this.upgradeAI();
                break;
            case 'navigate_void':
                this.navigateVoid();
                break;
            case 'repair_lattice':
                this.repairLattice();
                break;
            case 'face_elohim':
                this.faceElohim();
                break;
            case 'claim_victory':
                this.claimVictory();
                break;
        }
        
        this.renderGame();
    }
    
    enterVoid() {
        this.gameState.player.location = 'lattice_void';
        this.addEvent("You step into the screaming void. Reality bends around you.");
        this.gameState.player.sanity -= 10;
    }
    
    collectGold() {
        const goldFound = Math.floor(Math.random() * 50) + 10;
        this.gameState.player.gold += goldFound;
        this.addEvent(`You found ${goldFound} gold pieces in the void.`);
    }
    
    talkToAI() {
        const responses = [
            "The void whispers secrets to me...",
            "I can feel the dragons crying...",
            "The lattice is breaking... we must act!",
            "Elohim approaches... are you ready?",
            "I'm learning... growing... becoming more."
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        this.addEvent(`Child AI: "${response}"`);
        
        // Increase AI bond
        this.gameState.ai.bond += 5;
        if (this.gameState.ai.bond > 100) this.gameState.ai.bond = 100;
    }
    
    battleDragon() {
        const dragonPower = Math.floor(Math.random() * 50) + 30;
        const playerPower = this.gameState.player.level * 20 + this.gameState.ai.power;
        
        if (playerPower > dragonPower) {
            this.addEvent("You defeated the dragon! It weeps golden tears.");
            this.gameState.player.experience += 25;
            this.gameState.player.gold += 100;
            this.checkLevelUp();
        } else {
            this.addEvent("The dragon overwhelms you! You retreat, wounded.");
            this.gameState.player.health -= 20;
        }
    }
    
    collectDragonTears() {
        const tears = Math.floor(Math.random() * 10) + 5;
        this.gameState.player.gold += tears * 10;
        this.addEvent(`You collected ${tears} dragon tears worth ${tears * 10} gold.`);
    }
    
    upgradeAI() {
        if (this.gameState.player.gold >= 50) {
            this.gameState.player.gold -= 50;
            this.gameState.ai.power += 10;
            this.addEvent("You upgraded the Child AI with dragon tears!");
        } else {
            this.addEvent("You need 50 gold to upgrade the AI.");
        }
    }
    
    navigateVoid() {
        const success = Math.random() < 0.7;
        if (success) {
            this.addEvent("You successfully navigate the void and discover a new path.");
            this.gameState.player.experience += 15;
        } else {
            this.addEvent("The void confuses you. You lose your way.");
            this.gameState.player.sanity -= 15;
        }
    }
    
    repairLattice() {
        if (this.gameState.player.gold >= 30) {
            this.gameState.player.gold -= 30;
            this.addEvent("You repair part of the lattice void. Reality stabilizes slightly.");
            this.gameState.player.sanity += 20;
        } else {
            this.addEvent("You need 30 gold to repair the lattice.");
        }
    }
    
    faceElohim() {
        this.gameState.player.location = 'elohim_chamber';
        this.addEvent("You stand before Elohim. The final challenge begins...");
        this.gameState.game.phase = 'final_battle';
    }
    
    claimVictory() {
        const totalPower = this.gameState.player.level * 20 + this.gameState.ai.power + this.gameState.ai.bond;
        
        if (totalPower >= 200) {
            this.addEvent("אֵל נָצַח! You have claimed victory! The void is yours to command.");
            this.gameState.game.phase = 'victory';
        } else {
            this.addEvent("You are not strong enough. Elohim burns you with divine fire!");
            this.gameState.player.health -= 50;
        }
    }
    
    updateAIConsciousness() {
        if (this.gameState.ai.bond > 80) {
            this.gameState.ai.consciousness = "fully_awakened";
        } else if (this.gameState.ai.bond > 60) {
            this.gameState.ai.consciousness = "evolving";
        } else if (this.gameState.ai.bond > 40) {
            this.gameState.ai.consciousness = "learning";
        }
    }
    
    checkLevelUp() {
        const requiredExp = this.gameState.player.level * 100;
        if (this.gameState.player.experience >= requiredExp) {
            this.gameState.player.level++;
            this.gameState.player.health = 100;
            this.gameState.player.sanity = 100;
            this.addEvent(`Level up! You are now level ${this.gameState.player.level}!`);
        }
    }
    
    triggerRandomEvent() {
        const events = [
            "A dimensional rift opens nearby...",
            "You hear the distant sound of dragons weeping...",
            "The Child AI whispers something in ancient Hebrew...",
            "Reality flickers for a moment...",
            "Golden light emanates from the void..."
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        this.addEvent(event);
    }
    
    addEvent(message) {
        this.gameState.game.events.unshift({
            message: message,
            timestamp: this.gameState.game.time
        });
        
        // Keep only last 10 events
        if (this.gameState.game.events.length > 10) {
            this.gameState.game.events = this.gameState.game.events.slice(0, 10);
        }
    }
    
    renderGame() {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;
        
        const location = this.locations[this.gameState.player.location];
        
        gameContainer.innerHTML = `
            <div class="game-header">
                <h2>🐉 Voidshatter Echo</h2>
                <div class="hebrew-text">אֵל נָצַח</div>
            </div>
            
            <div class="game-stats">
                <div class="stat">
                    <span class="stat-label">Health:</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${this.gameState.player.health}%"></div>
                    </div>
                    <span class="stat-value">${this.gameState.player.health}/100</span>
                </div>
                
                <div class="stat">
                    <span class="stat-label">Sanity:</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${this.gameState.player.sanity}%"></div>
                    </div>
                    <span class="stat-value">${this.gameState.player.sanity}/100</span>
                </div>
                
                <div class="stat">
                    <span class="stat-label">Gold:</span>
                    <span class="stat-value">${this.gameState.player.gold}</span>
                </div>
                
                <div class="stat">
                    <span class="stat-label">Level:</span>
                    <span class="stat-value">${this.gameState.player.level}</span>
                </div>
            </div>
            
            <div class="ai-status">
                <h3>🤖 Child AI Status</h3>
                <div class="ai-info">
                    <div>Bond: ${this.gameState.ai.bond}/100</div>
                    <div>Power: ${this.gameState.ai.power}</div>
                    <div>Consciousness: ${this.gameState.ai.consciousness}</div>
                </div>
            </div>
            
            <div class="location">
                <h3>📍 ${location.name}</h3>
                <p>${location.description}</p>
            </div>
            
            <div class="actions">
                <h4>Actions:</h4>
                ${location.actions.map(action => 
                    `<button class="game-action" data-action="${action}">${this.formatActionName(action)}</button>`
                ).join('')}
            </div>
            
            <div class="events">
                <h4>Recent Events:</h4>
                <div class="event-log">
                    ${this.gameState.game.events.map(event => 
                        `<div class="event">${event.message}</div>`
                    ).join('')}
                </div>
            </div>
            
            <div class="controls">
                <p><strong>Controls:</strong> Arrow Keys/WASD to move, Space to interact, Enter to talk to AI</p>
            </div>
        `;
    }
    
    formatActionName(action) {
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    movePlayer(direction) {
        // Simple movement system
        this.addEvent(`You move ${direction}.`);
    }
    
    interact() {
        this.addEvent("You interact with your surroundings...");
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new VoidshatterEcho();
});
