// Class to represent a basic link in a doubly linked list.
class BaseLink {
    constructor() {
        this.up = this;
        this.down = this;
        this.left = this;
        this.right = this;
    }

    insertUp(link) {
        link.up = this.up;
        link.down = this;
        this.up.down = link;
        this.up = link;
    }

    inserDown(link) {
        this.down.insertUp(link);
    }

    insertLeft(link) {
        link.left = this.left;
        link.right = this;
        this.left.right = link;
        this.left = link;
    }

    insertRight(link) {
        this.right.insertLeft(link);
    }
}


// Class to represent a column header link.
class ColHeader extends BaseLink {
    constructor() {
        super();
        this.linkCount = 0;
    }

    // Function to delete the column from a list.
    delete() {
        for (const link of this.iterator()) {
            link.left.right = link.right;
            link.right.left = link.left;
            link.rowHeader && link.rowHeader.linkCount--;
        }
        this.left.right = this.right;
        this.right.left = this.left;
    }

    // Fuction to iterate over links in the column.
    * iterator() {
        let link = this.down;
        while (link !== this) {
            yield link;
            link = link.down;
        }
        return;
    }
}


// Class to represent a row header link.
class RowHeader extends BaseLink {
    constructor() {
        super();
        this.linkCount = 0;
    }

    // Function to delete the row from a list.
    delete() {
        for (const link of this.iterator()) {
            link.up.down = link.down;
            link.down.up = link.up;
            link.colHeader && link.colHeader.linkCount--;
        }
        this.up.down = this.down;
        this.down.up = this.up;
    }

    // Fuction to iterate over links in the row.
    * iterator() {
        let link = this.right;
        while (link !== this) {
            yield link;
            link = link.right;
        }
        return;
    }
}


// Class to represent a link in a doubly linked list.
//  Links store the column and row headers to determine which column or row
//  they belong to, along with some content.
class Link extends BaseLink {
    constructor(content) {
        super();
        this.colHeader = null;
        this.rowHeader = null;
        this.content = content;
        content.link = this;
    }

    // Function to delete a link from its column and row.
    delete() {
        this.up.down = this.down;
        this.down.up = this.up;
        this.left.right = this.right;
        this.right.left = this.left;
        this.colHeader && this.colHeader.linkCount--;
        this.rowHeader && this.rowHeader.linkCount--;
    }
}


// Class to represent a circular doubly linked list.
class CircularDoublelyLinkedList {
    constructor() {
        this.root = new BaseLink();
    }
}


// Class to represent an Enemy
class Enemy {
    constructor(x=0, y=0, w=20, h=20) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.link = null;
    }

    // Function to delete the Link object that holds the enemy from its list.
    delete() {
        this.link.delete()
    }

    draw() {
        rect(this.x, this.y, this.w, this.h);
    }

    // Getter to return a bounding box for collision detection.
    get boundingBox() {
        return {
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
        };
    }
}


// Base class for "missiles" (player bullets and enemy bombs).
class Missile {
    constructor(x, y, w, h, velocity) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.velocity = velocity;
        this.active = false;
    }

    move() {
        this.y += this.velocity;
    }

    draw() {
        if (this.active) {
            rect(this.x, this.y, this.w, this.h)
        }
    }

    // Getter to return a bounding box for collision detection.
    get boundingBox() {
        return {
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
        };
    }
}


// Class to represent player bullets.
class Bullet extends Missile {
    constructor(x, y, w, h, velocity) {
        super(x, y, w, h, velocity);
    }

    update() {
        if (!this.active) {return}

        if (this.y <= 0) {
            this.active = false;
        } else {
            this.move();
        }
    }
}


// Class to represent enemy bombs.
class Bomb extends Missile {
    constructor(x, y, w, h, velocity) {
        super(x, y, w, h, velocity);
    }

    update() {
        if (!this.active) {return}

        if (this.y >= 460 - this.h) {
            this.active = false;
        } else {
            this.move();
        }
    }
}


// Class to represent a pool of objects
class Pool {
    constructor(objects) {
        this.objects = objects;
    }

    // Function to return an inactive object,
    // or null if none exists in the pool.
    pull() {
        const inactiveObject = this.objects.find(object => !object.active);
        return inactiveObject ? inactiveObject : null;
    }

    // Returns all active objects in the pool.
    getActiveObjects() {
        const activeObjects = this.objects.filter(object => object.active);
        return activeObjects;
    }

    // Updates all objects in the pool.
    update() {
        for (const object of this.objects) {
            object.update();
        }
    }
}


// Class to store and update all enemies on the screen.
class EnemyController {
    constructor() {
        this.enemyList = null;

        // Store the current row that will be updated.
        this.currentRow = null;

        // Store an iterator that cycles through the enemy rows.
        this.rowCycle = null

        // Store the minimum and maximum x values for the enemies.
        this.minX = 10;
        this.maxX = 620 - 40;

        // Store the number of ticks until the enemies move again.
        this.baseMoveTicks = 36;
        this.ticksToNextMove = this.baseMoveTicks;

        // Store the number of ticks until the enemies drop another bomb.
        this.baseFireTicks = 120;
        this.ticksToNextFire = this.baseFireTicks;

        // Store the direction the enemies are travelling.
        //  (-1 = right-to-left, 1 = left-to-right)
        this.enemyDirection = 1;

        // Stores a Pool of bombs from which the enemies can pull.
        //  (This allows there to only be two bombs on screen at any time.)
        this.enemyBombPool = new Pool([
            new Bomb(0, 0, 4, 10, 4),
            new Bomb(0, 0, 4, 10, 4),
        ]);
    }

    // Function to drop bomb if enough time has elapsed since the last bomb
    // and there is an available bomb.
    dropBomb() {
        // Try to get a bomb from the pool.
        const bomb = this.enemyBombPool.pull();

        // If no bomb in the pool is available, return.
        if (!bomb) {
            return;
        }

        // If a bomb is available, get the last enemy in every column, and
        // choose one at random to drop a bomb.
        const lastEnemyInCol = Array.from(this.colIterator()).map(
            col => col.up.content
        );

        const bomber = (
            lastEnemyInCol[Math.floor(Math.random() * lastEnemyInCol.length)]
        );

        // Set the position of the bomb and activate it.
        bomb.x = bomber.x + bomber.w / 2 - bomb.w / 2;
        bomb.y = bomber.y + bomber.h;
        bomb.active = true;
        
        // Reset ticks to next fire.
        this.ticksToNextFire = this.baseFireTicks;
    }

    // Iterate through all enemies in the current row.
    * currentRowIterator() {
        for (const link of this.currentRow.iterator()) {
            yield link.content;
        }
        return;
    }

    // Function to update all enemies.
    update() {
        if(this.enemyCount === 0) {
            return;
        }

        this.ticksToNextMove--;
        this.ticksToNextFire--;

        this.baseMoveTicks = 0 + Math.floor(this.enemyCount * 0.65);
        this.baseFireTicks = this.enemyCount * 3;

        if (this.ticksToNextMove <= 0) {
            this.move();
        }

        if (this.ticksToNextFire <= 0) {
            this.dropBomb();
        }
    }

    // Function to move enemies in the current row or to moveall enemies down
    // a row if the edge of the screen has been reached.
    move() {
        this.currentRow = this.rowCycle.next().value;

        const edgeReached = (
            this.enemyDirection > 0 && this.lastEnemy.x >= this.maxX ||
            this.enemyDirection < 0 && this.firstEnemy.x <= this.minX
        );

        if (edgeReached && this.currentRow === this.lastRow) {
            for (const enemy of this.enemyIterator()) {
                enemy.y += 20;
            }

            this.enemyDirection *= -1;
            this.rowCycle = this.rowCycleIterator();
        } else {
            for (const enemy of this.currentRowIterator()) {
                enemy.x += 8 * this.enemyDirection;
            }
        }

        this.ticksToNextMove = this.baseMoveTicks;
    }

    // Function to fill the enemy list with links containing enemy objects,
    // parameters determine how many enemy and their locations.
    fillEnemyList(cols, rows, startX, startY, stepX, stepY) {
        const newEnemyList = new CircularDoublelyLinkedList();

        const colHeaders = [];
        for (let c = 0; c < cols; c++) {
            const colHeader = new ColHeader();
            colHeader.name = `col#${c}`;
            colHeaders.push(colHeader);
            
            newEnemyList.root.insertLeft(colHeader);
        }
        
        for (let r = 0; r < rows; r++) {
            const rowHeader = new RowHeader();
            rowHeader.name = `row#${r}`;
            for (let c = 0; c < cols; c++) {
                const enemy = new Enemy(
                    startX + c * stepX,
                    startY + r * stepY,
                    40, 25
                );

                const link = new Link(enemy);

                rowHeader.insertLeft(link);
                link.rowHeader = rowHeader;
                rowHeader.linkCount++;
                
                colHeaders[c].insertUp(link);
                link.colHeader = colHeaders[c];
                colHeaders[c].linkCount++;
                console.log(link.colHeader, link.rowHeader)
            }
            newEnemyList.root.insertUp(rowHeader);
        }

        this.enemyList = newEnemyList;
        this.rowCycle = this.rowCycleIterator();
    }

    // Function to iterate over all enemies in the enemy list.
    * enemyIterator() {
        let enemyCount = 0;
        let colHeader = this.enemyList.root.right;
        while (colHeader !== this.enemyList.root) {
            let link = colHeader.down;
            while (link !== colHeader) {
                enemyCount++;
                yield link.content;
                link = link.down;
            }
            colHeader = colHeader.right;
        }
        return enemyCount;
    }

    // Function to iterate over all columns in the enemy list.
    * colIterator() {
        let colHeader = this.enemyList.root.right;
        while (colHeader !== this.enemyList.root) {
            yield colHeader;
            colHeader = colHeader.right;
        }
        return;
    }

    // Function to iterate over all rowss in the enemy list.
    * rowIterator() {
        let rowHeader = this.enemyList.root.down;
        while (rowHeader !== this.enemyList.root) {
            yield rowHeader;
            rowHeader = rowHeader.down;
        }
        return;
    }

    // Function to repeatedly cycle through the rows of the enemy list.
    * rowCycleIterator() {
        let rowHeader = this.enemyList.root;
        while (true) {
            if (rowHeader === this.enemyList.root) {
                rowHeader = rowHeader.up;
            }
            yield rowHeader;
            rowHeader = rowHeader.up;
        }
    }

    // Getter to return first (leftmost) column.
    get firstCol() {
        const colHeader = this.enemyList.root.right;
        return colHeader !== this.enemyList.root ? colHeader : null;
    }

    // Getter to return top enemy in leftmost column.
    get firstEnemy() {
        const col = this.firstCol;
        return col ? col.down.content : null;
    }

    // Getter to return last (rightmost) column.
    get lastCol() {
        const colHeader = this.enemyList.root.left;
        return colHeader !== this.enemyList.root ? colHeader : null;
    }

    // Getter to return bottom enemy in rightmost column.
    get lastEnemy() {
        const col = this.lastCol;
        return col ? col.up.content : null;
    }

    // Getter to return first (top) row.
    get firstRow() {
        const rowHeader = this.enemyList.root.down;
        return rowHeader !== this.enemyList.root ? rowHeader : null;
    }

    // Getter to return last (bottom) row.
    get lastRow() {
        const rowHeader = this.enemyList.root.up;
        return rowHeader !== this.enemyList.root ? rowHeader : null;
    }

    // Getter for bottom row y position.
    get LastRowY() {
        const rowHeader = this.enemyList.root.up;
        if (rowHeader && rowHeader.right !== rowHeader) {
            return rowHeader.right.content.y;
        }
        return null;
    }

    // Getter to count remaining enemies.
    get enemyCount() {
        let count = 0;
        for (const row of this.rowIterator()) {
            count += row.linkCount;
        }
        return count;
    }
}


// Class to represent the player tank.
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 25;
        this.velocity = 4;
        this.lives = 4;

        // Pool of bullets that the player can pull from.
        // Only one bullet can be onscreen at any time.
        this.bulletPool = new Pool([
            new Bullet(0, 0, 2, 8, -6),
        ]);

        // Stores whether the fire button is being held down.
        this.fireDown = false;
    }

    draw() {
        if (this.lives > 0) {
            triangle(
                this.x, this.y + this.h,
                this.x + this.w, this.y + this.h,
                this.x + this.w / 2, this.y
            );
        }
    }

    update() {
        if (this.lives <= 0) {
            return;
        }

        // Move the player / fire a bullet
        if (keyIsDown(LEFT_ARROW)) {
            this.x -= this.velocity;
        }
        if (keyIsDown(RIGHT_ARROW)) {
            this.x += this.velocity;
        }
        if (keyIsDown(32)) {
            if (this.fireDown) {
                return;
            }

            const bullet = this.bulletPool.pull();
            if (bullet) {
                bullet.x = this.x + this.w / 2 - bullet.w / 2;
                bullet.y = this.y - bullet.h;
                bullet.active = true;
            }
            this.fireDown = true;
        } else {
            this.fireDown = false;
        }

        // Keep the player within the screen.
        if (this.x < 0) {
            this.x = 0;
        } else if (this.x > 640 - this.w) {
            this.x = 640 - this.w;
        }
    }

    // Getter to return a bounding box for collision detection.
    get boundingBox() {
        return {
            x: this.x,
            y: this.y + this.h / 3,
            w: this.w,
            h: this.h * 2 / 3,
        };
    }
}


// Class to represent a bunker
class Bunker {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 20;
        this.maxDamage = 5;
        this.damage = 0;
        this.alive = true;
    }

    update() {
        if (this.damage >= this.maxDamage) {
            this.alive = false;
        }
    }

    draw() {
        if (this.alive) {
            push();
            fill(255, 255, 255, 255 - 255 / this.maxDamage * this.damage);
            arc(
                this.x + this.w / 2, this.y + this.h, this.w, this.h * 2,
                PI, 0, CHORD
            );
            pop();
        }
    }

    // Getter to return a bounding box for collision detection.
    get boundingBox() {
        return {
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
        };
    }
}


// Class to represent the UFO
class UFO {
    constructor(x, y, w=55, h=25) {
        this.x = x;
        this.y = y;
        this.velocity = 4;
        this.w = w;
        this.h = h;
        this.bonus = 200;
        this.alive = false;
        this.direction = 0;

        this.ticksToNextAppearance = 600 + Math.floor(Math.random() * 300);
        
        this.baseMoveTicks = 10;
        this.ticksToNextMove = this.baseMoveTicks;
    }

    reset() {
        this.alive = true;
        this.direction = Math.random() >= 0.5 ? 1 : -1;
        this.x = this.direction > 0 ? -70 : 640;
        this.bonus = 100 + 50 * Math.floor(Math.random() * 5);
    }

    update() {
        this.ticksToNextAppearance--;
        this.ticksToNextMove--;

        if (this.ticksToNextAppearance <= 0) {
            this.reset();
            this.ticksToNextMove = this.baseMoveTicks;
            this.ticksToNextAppearance = 600 + Math.floor(Math.random() * 300);
        }

        if (!this.alive) {return}

        if (this.ticksToNextMove) {
            this.x += this.velocity * this.direction;
        }

        // Deactivate UFO if it is offscreen
        if (this.x < -this.w || this.x > 640) {
            this.alive = false;
        } 
    }

    draw() {
        if (this.alive) {
            rect(this.x, this.y, this.w, this.h);
        }
    }

    // Getter to return a bounding box for collision detection.
    get boundingBox() {
        return {
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
        };
    }
}


// Set up game variables and objects
let score = 0;

const player = new Player(200, 420);

const bunkers = [
    new Bunker(50, 385),
    new Bunker(320 - 20, 385),
    new Bunker(640 - 50 - 40, 385),
];

const enemyController = new EnemyController();
enemyController.fillEnemyList(10, 5, 10, 120, 50, 30);

const ufo = new UFO(0, 60);


// Function to detect collision between two entities based on their
// bounding boxes.
const detectCollision = (entity1, entity2) => {
    const {x: x1, y: y1, w: w1, h: h1} = entity1.boundingBox;
    const {x: x2, y: y2, w: w2, h: h2} = entity2.boundingBox;

    if (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2) {
        return true;
    }
    return false;
};


// Function to check for collision between specific game objects
// and handle the collisions.
const collisionDetection = () => {
    // Handle enemy collisions.
    for (const enemy of enemyController.enemyIterator()) {
        // Handle collision with bullets.
        for (const bullet of player.bulletPool.objects) {
            if (bullet.active && detectCollision(enemy, bullet)) {
                const enemyCol = enemy.link.colHeader;
                const enemyRow = enemy.link.rowHeader;
                enemy.delete();
                bullet.active = false;
                score += 50

                if (enemyCol.linkCount === 0) {
                    enemyCol.delete();
                }
                if (enemyRow.linkCount === 0) {
                    enemyRow.delete();
                }
            }
        }

        // Handle collision with the player.
        if (detectCollision(enemy, player)) {
            player.lives = 0;
        }

        // Handle collision with bunkers.
        for (const bunker of bunkers){
            if (detectCollision(enemy, bunker)) {
                bunker.damage = 9999;
            }
        }
    }

    // Handle bullet collisions.
    for (const bullet of player.bulletPool.objects) {
        if (!bullet.active) {
            continue;
        }
        
        // Handle collision with bunkers.
        for (const bunker of bunkers) {
            if (bunker.alive && detectCollision(bullet, bunker)) {
                bullet.active = false;
                bunker.damage++;
            }
        }

        // Handle collision with UFO
        if (ufo.alive && detectCollision(bullet, ufo)) {
            bullet.active = false;
            ufo.alive = false;
            score += ufo.bonus;
        }
    }

    // Handle bomb collisions.
    for (const bomb of enemyController.enemyBombPool.objects) {
        if (!bomb.active) {
            continue;
        }

        // Handle collision with player.
        if (detectCollision(bomb, player)) {
            bomb.active = false;
            player.lives--;
        }

        // Handle collision with bunkers.
        for (const bunker of bunkers) {
            if (bunker.alive && detectCollision(bomb, bunker)) {
                bomb.active = false;
                bunker.damage++;
            }
        }
    }
};


// Set up variable for the game loop.
let tick = 0;
const updatesPerSecond = 60;
const tickLength = 1000 / updatesPerSecond;

let previousTime;
let timeSinceLastTick = 0;

let gameState = 0; // 1 = win, 0 = game running, -1 = lose


// Game loop function.
const updateGame = () => {
    requestAnimationFrame(updateGame);

    const currentTime = Date.now();
    const deltaTime = currentTime - previousTime;
    previousTime = currentTime;

    timeSinceLastTick += deltaTime;

    while (timeSinceLastTick > tickLength) {
        tick++;

        if (enemyController.enemyCount <= 0) {
            gameState = 1;
        } else if (player.lives <= 0 || enemyController.LastRowY >= 440) {
            gameState = -1;
        }

        if (gameState === 0) {
            player.update();
            player.bulletPool.update();
            enemyController.enemyBombPool.update();
            enemyController.update();
            for (const bunker of bunkers) {
                bunker.update();
            }
            ufo.update();

            collisionDetection();
        }

        timeSinceLastTick -= tickLength;
    }
}

// Function to start the game loop.
const startGame = () => {
    previousTime = Date.now();
    updateGame();
}

// Setup the canvas and start the game loop.
function setup() {
    createCanvas(640, 480);
    background(200);
    textSize(24);

    startGame();
}

// Render game objects to the screen or display end screen.
//  (Depending on `gameState`)
function draw() {
    background(200);
    
    if (gameState === 0) {
        // Draw a line for the ground.
        line(-2, 460, 642, 460);

        // Draw player lives.
        for (let i = 0; i < player.lives - 1; i++) {
            triangle(
                10 + 25 * i, 467,
                20 + 25 * i, 450,
                30 + 25 * i, 467
            )
        }

        // Display score.
        text(`Score: ${score}`, 10, 28);

        for (const bullet of player.bulletPool.objects) {
            bullet.draw();
        }

        for (const bomb of enemyController.enemyBombPool.objects) {
            bomb.draw();
        }

        for (const enemy of enemyController.enemyIterator()) {
            enemy.draw();
        }

        player.draw();

        for (const bunker of bunkers) {
            bunker.draw();
        }

        ufo.draw();    
    } 
    // Win screen.
    else if (gameState === 1) {
        textAlign(CENTER);
        textSize(72);
        fill(255, 255, 255);
        text('You Win!', 320, 220);
        textSize(36);
        text(`Score: ${score}`, 320, 275);
    }
    // Lose screen.
    else if (gameState === -1) {
        textAlign(CENTER);
        textSize(72);
        fill(200, 20, 20);
        text('You Lose!', 320, 220);
        textSize(36);
        text(`Score: ${score}`, 320, 275);
    }
}