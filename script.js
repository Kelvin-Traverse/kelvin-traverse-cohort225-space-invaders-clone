//------------------------------------------------------------//
// Space Invaders Clone (WIP)
// by Erish Traverse and Kelvin Traverse
//------------------------------------------------------------//

// TODO //----------------------------------------------------//
//
// Implement enemy bombs
//   Otherwise it's less Space Invaders,
//   and more Space Visitors
//
// Implement bunkers
//
//------------------------------------------------------------//

// Constants for determining enemy movement
const enemyMovementStep = 21;
const enemyDescentStep = 30;

// Class to represent an enemy
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = enemyMovementStep * 3 - 8;
        this.height = enemyDescentStep - 4;
        this.alive = true;
    }

    // Function to move the enemy by one step (-1 = left, 0 = down, 1 = right)
    move(direction) {
        if (direction === 0) {
            this.y += enemyDescentStep;
        } else {
            this.x += direction * enemyMovementStep;
        }
    }

    // Function for rendering the enemy
    draw() {
        if (this.alive) {
            rect(this.x, this.y, this.width, this.height);
        }
    }

    // Function for getting the bounding box for detecting collisions
    getBoundingBox() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }
}

// Class used to group enemies
class EnemyGroup {
    constructor(enemyRows) {

        this.enemyRows = enemyRows;
        
        // Stores how many game ticks must elapse before the enemy group moves
        //   This gets shorter as more enemies are destroyed.
        this.moveTicks = 36;
        this.ticksToNextMove = this.moveTicks;
        
        // Stores the current row that will be moved on the next move
        this.currentRow = 0;

        // Stores the direction to move the group in
        this.direction = 1;
        
        // Stores the position of the group in an imaginary grid
        this.x = 0;
        this.y = 0;

        // Used to determine how far left and right the group can go
        //   `minX` decreases as columns on the left get destroyed
        //   `maxX` increases as columns on the right get destroyed
        this.minX = 0;
        this.maxX = 4;
    }

    update() {
        this.ticksToNextMove--;
        this.pruneEmptyRows();
        this.pruneRowEnds();
        this.updateSpeed();

        // If ticks to next move is 0, move the group
        if (this.ticksToNextMove === 0) {

            // Determine if the group is at the edge of the screen
            const edgeReached = (
                this.x === this.minX && this.direction < 0 ||
                this.x === this.maxX && this.direction > 0
            );

            // If the edge has been reached and all row have been updated,
            // the next move will cause the group to descend by 1 row and
            // set the new movement direction to the opposite direction
            //   e.g. if the group was moving left before descending they will
            //   now start moving right.
            if (this.currentRow === 0 && edgeReached) {
                this.enemyRows.forEach(row => {
                    row.forEach(enemy => enemy.move(0))
                });
                this.direction *= -1;
                this.y++;
            } 
            // If the edge has not been reached, just move the current row horizontally
            else {
                this.enemyRows[this.currentRow].forEach(enemy => enemy.move(this.direction));
                this.currentRow = (this.currentRow + 1) % this.enemyRows.length;
            }

            // If the last row has been updated, start from the first row.
            if (this.currentRow === this.enemyRows.length - 1) {
                this.x += this.direction;
            }
            
            // Reset ticks to next move.
            this.ticksToNextMove = this.moveTicks;
        }
    }

    // Remove columns of dead enemies from the ends of the rows.
    // This allows `minX` and `maxX` to be updated so the group can move further horizontally
    pruneRowEnds() {
        // Check if leftmost and rightmost enemies are dead in every row.
        const leftEmpty = this.enemyRows.every(row => !row[0].alive);
        const rightEmpty = this.enemyRows.every(row => !row[row.length - 1].alive);

        // Remove every column of dead enemies from the coresponding side.
        for (const row of this.enemyRows) {
            leftEmpty && row.shift();
            rightEmpty && row.pop();
        }

        // Update how far the group can move.
        leftEmpty && (this.minX -= 3);
        rightEmpty && (this.maxX += 3);
    }

    // Remove rows of dead enemies.
    // This allows empty rows to be skipped on updates
    pruneEmptyRows() {
        this.enemyRows = this.enemyRows.filter((row, i) => {
            const someAlive = row.some(enemy => enemy.alive);
            if (!someAlive && i < this.currentRow) {
                this.currentRow--;
            }
            return someAlive;
        });
        this.currentRow %= this.enemyRows.length;
    }

    // Increases the speed of the group as enemies are destroyed
    updateSpeed() {
        let remainingEnemies = 0;
        this.enemyRows.forEach(row => {
            remainingEnemies += row.reduce((p, c) => c.alive ? p + 1 : p, 0)
        })
        this.moveTicks = Math.floor(2 + remainingEnemies * 0.85);
    }

    // Render all enemies in the group
    draw() {
        this.enemyRows.forEach(row => {
            row.forEach(enemy => enemy.draw())
        });
    }
}

// Class to represent the UFO
class UFO {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.speed = 0;
        this.width = 70;
        this.height = 30;
        this.bonus = 200;
        this.alive = false;
    }

    // Function to move the UFO
    update() {
        if (!this.alive) {return}

        this.x += this.speed;

        // Deactivate UFO if it is offscreen
        if (this.y <= -30) {
            this.alive = false;
        } 
    }

    // Function for rendering the UFO
    draw() {
        if (this.alive) {
            rect(this.x, this.y, this.width, this.height);
        }
    }

    // Function for getting the bounding box for detecting collisions
    getBoundingBox() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }
}

// Class to represent the player
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.height = 20;
        this.width = 20;
        this.speed = 5;
        this.lives = 4;
    }

    // Render the player
    draw() {
        if (this.lives > 0) {
            rect(this.x, this.y, this.width, this.height);
        }
    }

    // Move the player
    update() {
        if (keyIsDown(LEFT_ARROW)) {
            this.x -= this.speed;
        }
        if (keyIsDown(RIGHT_ARROW)) {
            this.x += this.speed;
        }

        // Keep the player within the screen.
        if (this.x < 40) {
            this.x = 40;
        } else if (this.x > 600) {
            this.x = 600;
        }
    }

    // Function for getting the bounding box for detecting collisions
    getBoundingBox() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }
}

// Class representing the player's bullet
class Bullet {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 2;
        this.height = 20;
        this.active = false;
    }

    // Update the position of the bullet if it is active, and check if it has
    // collided with any entity in entities.
    update(entities) {
        if (!this.active) {return}

        // Deactivate bullet if it is offscreen
        if (this.y <= -10) {
            this.active = false;
        } else {
            this.move();
            for (const entity of entities.filter(entity => entity.alive)) {
                if (collisionDetection(this.getBoundingBox(), entity.getBoundingBox())) {
                    entity.alive = false;
                    this.active = false;
                    break;
                }
            }
        }
    }

    // Move bullet
    move() {
        this.y -= 8;
    }

    // Render bullet
    draw() {
        if (this.active) {
            rect(this.x, this.y, this.width, this.height);
        }
    }

    // Returns the bounding box for collision detection
    getBoundingBox() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }
}

// Class to represent enemy bombs. 
class Bomb {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 4;
        this.height = 10;
        this.active = false;
    }

    update(entity) {
        if (!this.active) {return}

        // Deactivate bomb if it hits the ground
        if (this.y >= 480) {
            this.active = false;
        } else {
            this.move();
            if (collisionDetection(this.getBoundingBox(), entity.getBoundingBox())) {
                entity.lives--;
                this.active = false;
            }
        }
        this.move();
    }  
    
    move() {
        this.y += 2;
    }
    
    draw() {
        if (this.active) {
            rect(this.x, this.y, this.width, this.height);
        }
    }

    getBoundingBox() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }
}

// Function for detecting collisions using bounding boxes.
function collisionDetection(boundingBox1, boundingBox2) {
    const {x: x1, y: y1, w: w1, h: h1} = boundingBox1;
    const {x: x2, y: y2, w: w2, h: h2} = boundingBox2;

    if (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2) {
        return true;
    }
    return false;
}

// Create and store Enemy objects to be passed to an EnemyGroup object.
const enemies = [];

for (let i = 0; i < 5; i++) {
    const enemyRow = []
    for (let j = 0; j < 8; j++) {
        const enemy = new Enemy(50 + j * enemyMovementStep * 3, 50 + i * enemyDescentStep);
        enemyRow.push(enemy);
    }
    enemies.push(enemyRow);
}

// Create an enemy group object.
const enemyGroup = new EnemyGroup(enemies.reverse());

// Create the UFO object
const ufo = new UFO();

// Create the bomb object
const bomb = new Bomb();

// Create the Player and Bullet objects.
const player = new Player(320, 400);
const bullet = new Bullet();


//-- Test Stuff ----------------------------------------------//
let destroyedLastColumn = false;
const destroyLastColumn = () => {
    if (!destroyedLastColumn) {
        for (const row of enemyGroup.enemyRows) {
            row[row.length - 1].alive = false;
        }
        //destroyedLastColumn = true;
    }
}

let destroyedTopRow = false;
const destroyTopRow = () => {
    if (!destroyedLastColumn) {
        for (const enemy of enemyGroup.enemyRows[enemyGroup.enemyRows.length - 1]) {
            enemy.alive = false;
        }
        //destroyedTopRow = true;
    }
}
//------------------------------------------------------------//




// Set up the game loop.
let tick = 0;
const updatesPerSecond = 60;
const tickLength = 1000 / updatesPerSecond;

let previousTime;
let timeSinceLastTick = 0;

//-- Game Loop --//
const update = () => {
    requestAnimationFrame(update);

    const currentTime = Date.now();
    const deltaTime = currentTime - previousTime;
    previousTime = currentTime;

    timeSinceLastTick += deltaTime;

    while (timeSinceLastTick > tickLength) {
        tick++;

        player.update();

        ufo.update();

        // Pass list of enemies to the bullet update function to
        // detect collisions
        bullet.update([...enemies.reduce((p, c) => [...p, ...c], []), ufo]);
        enemyGroup.update();

        bomb.update(player);

        timeSinceLastTick -= tickLength;
    }
}

// Function to start the game.
const start = () => {
    previousTime = Date.now();
    update();
}

// Function to setup the canvas for rendering the game.
function setup() {
    createCanvas(640, 480);
    background(200);

    // Start the game.
    start();
}

// Function to randomly drop a bomb
function dropBomb() {
    const lastEnimeyInCol = new Array(enemies[0].length).fill(null);

    enemies.forEach ( row => {
        for (let i = 0; i < row.length; i++) {
            if ( lastEnimeyInCol[i] === null && row[i].alive === true) {
                lastEnimeyInCol[i] = row[i];
            }
        }
    } );
 
    let bomber = lastEnimeyInCol[Math.floor(Math.random() * lastEnimeyInCol.length)];

    bomb.x = bomber.x;
    bomb.y = bomber.y;
    bomb.active = true;
}

// Function to randomly spawn UFO
function spawnUFO() {
    ufo.x = 670;
    ufo.y = 10;
    ufo.speed = -6;
    ufo.alive = true;
}

// Handle some inputs.
function keyPressed() {
    if (keyCode === 38) {
        destroyLastColumn();
    } else if (keyCode === 40) {
        destroyTopRow();
    }
    
    // b to drop bomb for test
    else if (keyCode === 66) {
        dropBomb();
    }

    // u to spawn UFO for test
    else if (keyCode === 85) {
        spawnUFO();
    }

    // Spacebar to fire bullet if it is inactive.
    else if (keyCode === 32 && !bullet.active) {
        bullet.x = player.x;
        bullet.y = player.y;
        bullet.active = true;
    }
}

// Function for rendering the game.
function draw() {
    background(200);

    enemyGroup.draw();
    player.draw();
    bullet.draw();
    bomb.draw();
    ufo.draw();

    for (let i = 0; i < player.lives - 1; i++) {
        rect(10 + i * 40, 450, 20, 20);
    }
}