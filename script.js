const SCREEN_WIDTH = 640, SCREEN_HEIGHT = 480;

const entities = [];


// for testing
let score = 0;
//----//

class Entity {
    _component(component, values) {
        Object.assign(this, {...component.properties, ...values});
        this[component.name] = true;

    }
}


class Component {
    constructor(name, properties={}) {
        this.name = name;
        this.properties = properties;
    }
}


class System {
    constructor(componentType, handlingFunction) {
        this.componentType = componentType;
        this.handlingFunction = handlingFunction;
    }

    run(entities) {
        for (const entity of entities) {
            if (entity.hasOwnProperty(this.componentType)) {
                this.handlingFunction(entity);
            }
        }
    }
}


class InputSystem {
    constructor(entities, player) {
        this.entities = entities;
        this.player = player;

        this.fireButtonDown = false;
    }

    run() {
        if (keyIsDown(UP_ARROW) && ! this.fireButtonDown) {
            const bullet = new Bullet();
            bullet.x = this.player.x;
            this.entities.push(bullet);
            this.fireButtonDown = true;
        } else if (!keyIsDown(UP_ARROW)) {
            this.fireButtonDown = false;
        }
    }
}


class Game {
    constructor() {
        this.previousTime;
        this.lag;

        this.inputSystem = {run: () => null};
        this.systems = [];
        this.entities = [];
    }

    start() {
        this.lag = 0;
        this.previousTime = Date.now();
        this.main();
    }

    main() {
        requestAnimationFrame(() => this.main());
        const currentTime = Date.now();
        const delta = currentTime - this.previousTime;
        this.previousTime = currentTime;
        this.lag += delta;
        //console.log(this.lag);

        while (this.lag >= 1000 / 60) {
            //console.log('here');
            this.update();
            this.lag -= 1000 / 60;
        }

    }

    update() {
        this.inputSystem.run();
        for (const system of this.systems) {
            system.run(this.entities);
        }
    }
}


function collisionDetection(entity1, entity2) {
    box1 = {
        x: entity1.boundingBox.x + entity1.x,
        y: entity1.boundingBox.y + entity1.y,
        w: entity1.boundingBox.w,
        h: entity1.boundingBox.h,
    }
    box2 = {
        x: entity2.boundingBox.x + entity2.x,
        y: entity2.boundingBox.y + entity2.y,
        w: entity2.boundingBox.w,
        h: entity2.boundingBox.h,
    }
    if (
        box1.x < box2.x + box2.w && box1.x + box1.w > box2.x &&
        box1.y < box2.y + box2.h && box1.y + box1.h > box2.y
    ) {
        return true;
    }
    return false;
}

const healthComponent = new Component('healthComponent', {health: 1});
const positionComponent = new Component('positionComponent', {x: 0, y: 0});
const rotationComponent = new Component('rotationComponent', {rotation: 0});
const velocityComponent = new Component('velocityComponent', {xVel: 2, yVel: 0});
const renderComponent = new Component('renderComponent');
const collisionComponent = new Component('collisionComponent', {boundingBox: {x: 0, y: 0, w: 0, h: 0}});
const animationComponent = new Component('animationComponent', {animationTick: 0, animation: 'idle'});

const movementSystem = new System('positionComponent', (entity) => {
    entity.move();
})

const renderSystem = new System('renderComponent', (entity) => {
    entity.draw();
})

const animationSystem = new System('animationComponent', (entity) => {
    entity.animate()
});

const collisionSystem = new System('collisionComponent', (entity1, entity2) => {
    if (entity1 !== entity2) {
        if (collisionDetection(entity1, entity2)) {
            //console.log('collision');
            score++;
            return true;
        }
    }
})

collisionSystem.run = (entity1, entities) => {
    for (const entity of entities) {
        if (collisionSystem.handlingFunction(entity1, entity)) {
            return true;
        }
    }
}

class Player extends Entity {
    constructor() {
        super();
        this._component(positionComponent, {
            x: SCREEN_WIDTH / 2, 
            y: SCREEN_HEIGHT - 35
        });
        this._component(healthComponent);
        this._component(renderComponent);
        this._component(collisionComponent);
    }

    move() {
        if (keyIsDown(LEFT_ARROW)) {
            this.x -= 10;
        }
        if (keyIsDown(RIGHT_ARROW)) {
            this.x += 10;
        }
        if (this.x < 10) {
            this.x = 10;
        } else if (this.x > SCREEN_WIDTH - 10) {
            this.x = SCREEN_WIDTH - 10;
        }
    }

    draw() {
        fill(50, 100, 200);
        ellipse(this.x, this.y, 50, 50);
    }
}

class Enemy extends Entity {
    constructor(position) {
        super();
        this._component(positionComponent, position);
        this._component(rotationComponent);
        this._component(velocityComponent);
        this._component(healthComponent);
        this._component(renderComponent);
        this._component(animationComponent, {animation: 'moving'});
        this._component(collisionComponent, {boundingBox: {x: -15, y: -15, w: 30, h: 30}});
    }

    animate() {
        this.animationTick++;
        if (this.animation === 'descending') {
            this.rotation += PI / 15;
            if (this.animationTick > 15) {
                this.rotation = 0;
                this.animation = 'moving';
                this.animationTick = 0;
            }
        }
    }

    move() {
        if (this.animation === 'descending') {
            this.y += 2;
        }
        if (this.animation !== 'moving') {
            return;
        }
        this.x += this.xVel;
        let edgeReached = false;
        if (this.x <= 15) {
            this.x = 15;
            edgeReached = true;
        } else if (this.x >= SCREEN_WIDTH - 15) {
            this.x = SCREEN_WIDTH - 15;
            edgeReached = true;
        }
        if (edgeReached) {
            this.xVel = -this.xVel * 1.4;
            this.animationTick = 0;
            this.animation = 'descending';
        }
        if (this.y >= SCREEN_HEIGHT - 40) {
            this.reset();
        }
        if (collisionSystem.run(this, entities)) {
            this.reset();
        }
    }

    // for testing
    reset() {
        this.x = SCREEN_WIDTH / 2;
        this.y = 25;
        this.xVel = 2;
    }
    //----//

    draw() {
        push();
        translate(this.x, this.y);
        rotate(this.rotation);
        fill(200, 50, 100);
        rect(0, 0, 30, 30);
        pop();
    }
}

class Bullet extends Entity {
    constructor() {
        super();
        this._component(positionComponent, {y: SCREEN_HEIGHT - 35});
        this._component(velocityComponent, {xVel: 0, yVel: -8});
        this._component(renderComponent);
        this._component(collisionComponent, {boundingBox: {x: -2.5, y: -2.5, w: 5, h: 5}});
    }

    draw() {
        push();
        translate(this.x, this.y);
        fill(80, 200, 80);
        rect(0, 0, 5, 5);
        pop();
    }

    move() {
        this.y += this.yVel;
        collisionSystem.run(this, entities);
    }
}


//const entities = [];

const player = new Player();

entities.push(player);
entities.push(new Enemy(
    position = {x: SCREEN_WIDTH / 2 - 15, y: 25}
));

//function updateGame() {
//    movementSystem.run(entities);
//    animationSystem.run(entities);
//}



game = new Game();
game.inputSystem = new InputSystem(entities, player);
game.systems = [
    movementSystem,
    animationSystem,
];

game.entities = entities;

function setup() {
    createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    background(200);
    rectMode(CENTER);

    requestAnimationFrame(() => game.start());
}



function draw() {
    clear();
    background(200);
    // for testing
    textSize(32);
    fill(30);
    text(`Collisions: ${score}`, 10, 30);
    //----//
    renderSystem.run(entities);
}