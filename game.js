// Tower Defense Game
// Main game logic
// Features:
// - Tower upgrade system (damage, range, fire rate)
// - Multiple enemy types with unique stats and behaviors
// - Scoring system (points and money)
// - Wave progression logic
// - Win/loss conditions (survive all waves, lose all lives)
// - Grid-based tower placement
// - Visual range indicators and health bars
//
// Usage:
// 1. Include this script in an HTML page with a <canvas id="gameCanvas"></canvas>
// 2. Create game instance: const game = new Game(document.getElementById('gameCanvas'));
// 3. Add UI buttons to call game.startPlacingTower('towerType') for each tower type.
// 4. Game runs automatically with requestAnimationFrame.
//
// Tower types: basic, sniper, rapid, splash
// Enemy types: basic, fast, tank, boss
//
// Controls:
// - Click a tower type button to select, then click on walkable grid to place.
// - Click on placed tower to upgrade (cost increases with level).
// - Game automatically spawns enemies in waves.

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 40;
const GRID_WIDTH = Math.floor(CANVAS_WIDTH / GRID_SIZE);
const GRID_HEIGHT = Math.floor(CANVAS_HEIGHT / GRID_SIZE);

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = CANVAS_WIDTH;
        this.height = CANVAS_HEIGHT;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.waveManager = new WaveManager(this);
        this.money = 150;
        this.score = 0;
        this.lives = 20;
        this.gameOver = false;
        this.gameWon = false;
        this.selectedTowerType = 'basic';
        this.placingTower = false;
        this.grid = this.createGrid();
        this.path = this.createPath();

        // Tower types with base stats
        this.towerTypes = {
            basic: { cost: 50, damage: 10, range: 100, fireRate: 1, color: 'blue', name: 'Basic Tower' },
            sniper: { cost: 100, damage: 30, range: 200, fireRate: 0.5, color: 'green', name: 'Sniper Tower' },
            rapid: { cost: 75, damage: 5, range: 80, fireRate: 3, color: 'orange', name: 'Rapid Tower' },
            splash: { cost: 120, damage: 15, range: 90, fireRate: 1.2, color: 'purple', name: 'Splash Tower' }
        };

        // Enemy types
        this.enemyTypes = {
            basic: { health: 50, speed: 1, reward: 10, color: 'red', size: 20 },
            fast: { health: 30, speed: 2, reward: 15, color: 'yellow', size: 15 },
            tank: { health: 150, speed: 0.5, reward: 30, color: 'brown', size: 25 },
            boss: { health: 300, speed: 0.3, reward: 100, color: 'darkred', size: 30 }
        };

        // UI events
        canvas.addEventListener('click', (e) => this.handleClick(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Start game loop
        this.lastTime = 0;
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    createGrid() {
        let grid = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            grid[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                grid[y][x] = { walkable: true, tower: null };
            }
        }
        // Mark path as not walkable for tower placement
        this.path.forEach(point => {
            let gridX = Math.floor(point.x / GRID_SIZE);
            let gridY = Math.floor(point.y / GRID_SIZE);
            if (gridY >= 0 && gridY < GRID_HEIGHT && gridX >= 0 && gridX < GRID_WIDTH) {
                grid[gridY][gridX].walkable = false;
            }
        });
        return grid;
    }

    createPath() {
        // Create a simple path from left to right with some turns
        let path = [];
        let startX = 0;
        let startY = Math.floor(GRID_HEIGHT / 2) * GRID_SIZE;
        path.push({ x: startX, y: startY });
        // Go right 1/3
        for (let i = 1; i <= GRID_WIDTH / 3; i++) {
            path.push({ x: i * GRID_SIZE, y: startY });
        }
        // Go down 1/3
        for (let i = 1; i <= GRID_HEIGHT / 3; i++) {
            path.push({ x: (GRID_WIDTH / 3) * GRID_SIZE, y: startY + i * GRID_SIZE });
        }
        // Go right to end
        for (let i = GRID_WIDTH / 3 + 1; i <= GRID_WIDTH; i++) {
            path.push({ x: i * GRID_SIZE, y: startY + (GRID_HEIGHT / 3) * GRID_SIZE });
        }
        return path;
    }

    handleClick(e) {
        if (this.gameOver) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const gridX = Math.floor(x / GRID_SIZE);
        const gridY = Math.floor(y / GRID_SIZE);

        if (this.placingTower) {
            if (this.grid[gridY] && this.grid[gridY][gridX] && this.grid[gridY][gridX].walkable) {
                const towerType = this.towerTypes[this.selectedTowerType];
                if (this.money >= towerType.cost) {
                    this.money -= towerType.cost;
                    const tower = new Tower(
                        gridX * GRID_SIZE + GRID_SIZE / 2,
                        gridY * GRID_SIZE + GRID_SIZE / 2,
                        this.selectedTowerType,
                        towerType
                    );
                    this.towers.push(tower);
                    this.grid[gridY][gridX].tower = tower;
                    this.grid[gridY][gridX].walkable = false;
                    this.placingTower = false;
                } else {
                    alert('Not enough money!');
                }
            }
        } else {
            // Check if clicked on a tower to upgrade
            for (let tower of this.towers) {
                const dist = Math.sqrt((x - tower.x) ** 2 + (y - tower.y) ** 2);
                if (dist <= tower.range) {
                    this.upgradeTower(tower);
                    break;
                }
            }
        }
    }

    handleMouseMove(e) {
        if (!this.placingTower) return;
        // For visual feedback while placing tower
        this.mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
        this.mouseY = e.clientY - this.canvas.getBoundingClientRect().top;
    }

    upgradeTower(tower) {
        const upgradeCost = tower.level * 25 + 50;
        if (this.money >= upgradeCost) {
            this.money -= upgradeCost;
            tower.upgrade();
        } else {
            alert(`Need $${upgradeCost} to upgrade!`);
        }
    }

    gameLoop(time) {
        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.update(deltaTime);
        this.draw();

        if (!this.gameOver && !this.gameWon) {
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    update(deltaTime) {
        if (this.gameOver || this.gameWon) return;

        // Update wave manager
        this.waveManager.update(deltaTime);

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].update(deltaTime);
            if (this.enemies[i].health <= 0) {
                this.money += this.enemies[i].reward;
                this.score += this.enemies[i].reward;
                this.enemies.splice(i, 1);
            } else if (this.enemies[i].x > CANVAS_WIDTH) {
                // Enemy reached the end
                this.lives--;
                this.enemies.splice(i, 1);
                if (this.lives <= 0) {
                    this.gameOver = true;
                }
            }
        }

        // Update towers
        this.towers.forEach(tower => {
            tower.update(deltaTime, this.enemies, this.projectiles);
        });

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(deltaTime);
            if (this.projectiles[i].markedForDeletion) {
                this.projectiles.splice(i, 1);
            }
        }

        // Check win condition
        if (this.waveManager.waves.length === 0 && this.enemies.length === 0) {
            this.gameWon = true;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw grid
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                this.ctx.strokeStyle = '#ccc';
                this.ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                if (!this.grid[y][x].walkable && !this.grid[y][x].tower) {
                    // Path
                    this.ctx.fillStyle = '#aaa';
                    this.ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            }
        }

        // Draw path line
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.path.forEach((point, i) => {
            if (i === 0) this.ctx.moveTo(point.x, point.y);
            else this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.stroke();

        // Draw towers
        this.towers.forEach(tower => tower.draw(this.ctx));

        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Draw projectiles
        this.projectiles.forEach(projectile => projectile.draw(this.ctx));

        // Draw UI
        this.drawUI();

        // Draw placing tower preview
        if (this.placingTower) {
            const gridX = Math.floor(this.mouseX / GRID_SIZE);
            const gridY = Math.floor(this.mouseY / GRID_SIZE);
            if (this.grid[gridY] && this.grid[gridY][gridX] && this.grid[gridY][gridX].walkable) {
                this.ctx.fillStyle = 'rgba(0, 100, 255, 0.5)';
                this.ctx.fillRect(gridX * GRID_SIZE, gridY * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
        }

        // Draw game over / win screen
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over', this.width / 2, this.height / 2 - 50);
            this.ctx.font = '24px sans-serif';
            this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 20);
        } else if (this.gameWon) {
            this.ctx.fillStyle = 'rgba(0, 150, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('You Win!', this.width / 2, this.height / 2 - 50);
            this.ctx.font = '24px sans-serif';
            this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 20);
        }
    }

    drawUI() {
        this.ctx.fillStyle = 'black';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Money: $${this.money}`, 10, 20);
        this.ctx.fillText(`Score: ${this.score}`, 10, 40);
        this.ctx.fillText(`Lives: ${this.lives}`, 10, 60);
        this.ctx.fillText(`Wave: ${this.waveManager.currentWaveIndex + 1} / ${this.waveManager.totalWaves}`, 10, 80);
        this.ctx.fillText(`Enemies: ${this.enemies.length}`, 10, 100);

        // Draw tower shop
        let y = 120;
        for (const type in this.towerTypes) {
            const tower = this.towerTypes[type];
            this.ctx.fillStyle = tower.color;
            this.ctx.fillRect(10, y, 20, 20);
            this.ctx.fillStyle = 'black';
            this.ctx.fillText(`${tower.name} - $${tower.cost}`, 40, y + 15);
            y += 30;
        }

        // Instructions
        this.ctx.fillText('Click a tower type to select, then click grid to place.', 200, 20);
        this.ctx.fillText('Click on a placed tower to upgrade.', 200, 40);
    }

    startPlacingTower(type) {
        if (this.towerTypes[type]) {
            this.selectedTowerType = type;
            this.placingTower = true;
        }
    }
}

class Tower {
    constructor(x, y, type, stats) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.damage = stats.damage;
        this.range = stats.range;
        this.fireRate = stats.fireRate; // shots per second
        this.color = stats.color;
        this.level = 1;
        this.fireCooldown = 0;
        this.upgradeCost = 50;
    }

    update(deltaTime, enemies, projectiles) {
        this.fireCooldown -= deltaTime;
        if (this.fireCooldown <= 0) {
            // Find target
            let target = null;
            let minDist = Infinity;
            for (let enemy of enemies) {
                const dist = Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2);
                if (dist <= this.range && dist < minDist) {
                    minDist = dist;
                    target = enemy;
                }
            }
            if (target) {
                // Fire projectile
                projectiles.push(new Projectile(this.x, this.y, target, this.damage, this.color));
                this.fireCooldown = 1 / this.fireRate;
            }
        }
    }

    draw(ctx) {
        // Draw tower base
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw range circle (optional, for debugging)
        // ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        // ctx.beginPath();
        // ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        // ctx.stroke();

        // Draw level indicator
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv${this.level}`, this.x, this.y + 5);
    }

    upgrade() {
        this.level++;
        this.damage = Math.floor(this.damage * 1.5);
        this.range += 10;
        this.fireRate *= 1.1;
        this.upgradeCost += 25;
    }
}

class Enemy {
    constructor(type, stats, path) {
        this.type = type;
        this.health = stats.health;
        this.maxHealth = stats.health;
        this.speed = stats.speed;
        this.reward = stats.reward;
        this.color = stats.color;
        this.size = stats.size;
        this.path = path;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
    }

    update(deltaTime) {
        if (this.pathIndex >= this.path.length - 1) {
            // Reached end of path, will be removed in game update
            this.x += this.speed * GRID_SIZE * deltaTime;
            return;
        }
        const target = this.path[this.pathIndex + 1];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) {
            this.pathIndex++;
        } else {
            this.x += (dx / dist) * this.speed * GRID_SIZE * deltaTime;
            this.y += (dy / dist) * this.speed * GRID_SIZE * deltaTime;
        }
    }

    draw(ctx) {
        // Draw enemy body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw health bar
        const barWidth = 30;
        const barHeight = 4;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size / 2 - 8;
        ctx.fillStyle = 'red';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
    }
}

class Projectile {
    constructor(x, y, target, damage, color) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.color = color;
        this.speed = 300;
        this.markedForDeletion = false;
    }

    update(deltaTime) {
        if (!this.target || this.target.health <= 0) {
            this.markedForDeletion = true;
            return;
        }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
            // Hit target
            this.target.health -= this.damage;
            this.markedForDeletion = true;
        } else {
            this.x += (dx / dist) * this.speed * deltaTime;
            this.y += (dy / dist) * this.speed * deltaTime;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

class WaveManager {
    constructor(game) {
        this.game = game;
        this.waves = [];
        this.currentWaveIndex = 0;
        this.waveCooldown = 0;
        this.waveInterval = 5; // seconds between waves
        this.totalWaves = 0;
        this.createWaves();
    }

    createWaves() {
        // Define waves as arrays of enemy types
        this.waves = [
            { enemies: ['basic', 'basic', 'basic', 'basic', 'basic'] },
            { enemies: ['basic', 'fast', 'basic', 'fast'] },
            { enemies: ['basic', 'basic', 'tank', 'basic'] },
            { enemies: ['fast', 'fast', 'fast', 'tank'] },
            { enemies: ['tank', 'tank', 'basic', 'basic', 'fast', 'fast'] },
            { enemies: ['boss', 'basic', 'basic', 'tank'] }
        ];
        this.totalWaves = this.waves.length;
    }

    update(deltaTime) {
        if (this.currentWaveIndex >= this.waves.length) {
            return; // All waves completed
        }
        if (this.waveCooldown > 0) {
            this.waveCooldown -= deltaTime;
            return;
        }
        const wave = this.waves[this.currentWaveIndex];
        if (wave.enemies.length > 0) {
            // Spawn enemy every second
            if (this.spawnTimer === undefined) {
                this.spawnTimer = 0;
            }
            this.spawnTimer += deltaTime;
            if (this.spawnTimer >= 1) {
                const enemyType = wave.enemies.shift();
                const stats = this.game.enemyTypes[enemyType];
                if (stats) {
                    this.game.enemies.push(new Enemy(enemyType, stats, this.game.path));
                }
                this.spawnTimer = 0;
            }
        } else {
            // Wave finished, wait for next wave
            if (this.game.enemies.length === 0) {
                this.currentWaveIndex++;
                this.waveCooldown = this.waveInterval;
                this.spawnTimer = undefined;
            }
        }
    }
}

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, Tower, Enemy, Projectile, WaveManager };
}