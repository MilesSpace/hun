// 游戏状态
let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    level: 1,
    health: 100
};

// 获取Canvas和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏对象
let player;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let platforms = [];
let powerUps = [];
let particles = [];

// 输入控制
const keys = {};

// 鼠标状态
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let mouseDownTime = 0;
let lastShootTime = 0;
const SHOOT_INTERVAL = 200; // 1秒间隔

// 游戏配置
const GAME_CONFIG = {
    GRAVITY: 0.8,
    JUMP_FORCE: -15,
    PLAYER_SPEED: 5,
    BULLET_SPEED: 10,
    ENEMY_SPEED: 2,
    BOSS_SPEED: 1.5,
    MAP_WIDTH: 5000, // 地图宽度设置为5000像素
    MAP_HEIGHT: canvas.height // 地图高度与画布一致，保证背景分层显示
};

// 加载玩家图片
const playerImage = new Image();
playerImage.src = 'assets/player1.png';

// 加载小兵图片
const soldierImage = new Image();
soldierImage.src = 'assets/soldier.png';

// 加载背景图片
const bgWallImage = new Image();
bgWallImage.src = 'assets/background_wall.png';
const bgTreeImage = new Image();
bgTreeImage.src = 'assets/background_tree.png';
const bgSkyImage = new Image();
bgSkyImage.src = 'assets/background_sky.png';
const bgWaterImage = new Image();
bgWaterImage.src = 'assets/background_water.png';
bgWaterImage.onload = function() {
    // 图片加载完成后强制刷新画面
    if (typeof gameLoop === 'function') requestAnimationFrame(gameLoop);
    if (typeof drawBackground === 'function') drawBackground();
};

// 加载草地平台图片
const bgGrassImage = new Image();
bgGrassImage.src = 'assets/background_grass.png';
// 全局平台宽高，初始为默认值，图片加载后自动更新
let platWidth = 120;
let platHeight = 24;
bgGrassImage.onload = function() {
    if (bgGrassImage.width > 0) platWidth = bgGrassImage.width;
    if (bgGrassImage.height > 0) platHeight = bgGrassImage.height;
};

// 摄像机x坐标
let cameraX = 0;
// 摄像机y坐标
let cameraY = 0;
// 平滑摄像机跟随
let targetCameraX = 0;
let cameraSmoothness = 0.08; // 摄像机跟随平滑度
let cameraVelocity = 0; // 摄像机速度，用于缓动
let cameraDamping = 0.85; // 摄像机阻尼
// 摄像机震动效果
let cameraShake = 0;
let cameraShakeDecay = 0.7; // 加快震动衰减
// 摄像机历史记录，用于检测方向变化
let cameraHistory = [];
let maxHistoryLength = 5;

// ========== 自定义画布和分层高度参数 ==========
const canvasWidth = 1200; // 画布宽度
const canvasHeight = 700; // 画布高度
const skyHeight = 120;    // 天空高度
const treeHeight = 80;    // 树高度
const wallHeight = 400;   // 墙高度
const waterHeight = 100;  // 水高度

// 计算每层的起始Y坐标
const skyY = 0;
const treeY = skyY + skyHeight;
const wallY = treeY + treeHeight;
const waterY = wallY + wallHeight;

// ========== 设置画布尺寸 ==========
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// ========== 修改地图高度 ==========
// GAME_CONFIG.MAP_WIDTH = canvasWidth; // 地图宽度与画布一致 - 注释掉，保持5000像素宽度
GAME_CONFIG.MAP_HEIGHT = canvasHeight; // 地图高度与画布一致

const WALL_GRASS_HEIGHT = 12; // wall素材顶部绿色部分高度

// 加载boss图片
const bossImage = new Image();
bossImage.src = 'assets/boss.png';

// 加载射击音效
const shootNormalAudio = new Audio('assets/shoot_normal.wav');
const shootShotgunAudio = new Audio('assets/shoot_shotgun.wav');
const shootLaserAudio = new Audio('assets/shoot_laser.wav');

// 创建音频池来避免延迟
const audioPool = {
    normal: [],
    shotgun: [],
    laser: []
};

// 预加载多个音频实例
function preloadAudio() {
    for (let i = 0; i < 5; i++) {
        const normalAudio = new Audio('assets/shoot_normal.wav');
        const shotgunAudio = new Audio('assets/shoot_shotgun.wav');
        const laserAudio = new Audio('assets/shoot_laser.wav');
        
        // 设置音频属性
        normalAudio.volume = 0.5;
        shotgunAudio.volume = 0.5;
        laserAudio.volume = 0.5;
        
        audioPool.normal.push(normalAudio);
        audioPool.shotgun.push(shotgunAudio);
        audioPool.laser.push(laserAudio);
    }
}

// 播放音效的函数
function playShootSound(type) {
    console.log('播放音效:', type);
    let pool;
    switch(type) {
        case 'normal':
            pool = audioPool.normal;
            break;
        case 'shotgun':
            pool = audioPool.shotgun;
            break;
        case 'laser':
            pool = audioPool.laser;
            break;
        default:
            return;
    }
    
    // 找到一个可用的音频实例
    for (let audio of pool) {
        if (audio.paused || audio.ended) {
            audio.currentTime = 0;
            audio.play().then(() => {
                console.log(type + '音效播放成功');
            }).catch(e => {
                console.error(type + '音效播放失败:', e);
            });
            return;
        }
    }
    
    // 如果所有实例都在播放，使用第一个
    if (pool.length > 0) {
        pool[0].currentTime = 0;
        pool[0].play().then(() => {
            console.log(type + '音效播放成功(重用实例)');
        }).catch(e => {
            console.error(type + '音效播放失败:', e);
        });
    }
}

// 预加载音频
preloadAudio();

// 玩家类
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.velX = 0;
        this.velY = 0;
        this.onGround = false;
        this.facing = 1; // 1 = 右, -1 = 左
        this.shootCooldown = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        // 二段跳相关属性
        this.jumpCount = 0;
        this.maxJumps = 2;
        this.canJump = true;
        // 武器系统
        this.weaponType = 'normal'; // 'normal', 'laser', 'shotgun'
        this.weaponTimer = 0;
        this.weaponDuration = 0;
    }

    update() {
        // 重力
        this.velY += GAME_CONFIG.GRAVITY;
        
        // 移动
        this.x += this.velX;
        this.y += this.velY;
        
        // 屏幕边界检查，保证玩家始终在当前摄像机视野内
        if (this.x < cameraX) this.x = cameraX;
        if (this.x + this.width > cameraX + canvas.width) this.x = cameraX + canvas.width - this.width;
        
        // 边界检查
        if (this.y + this.height > GAME_CONFIG.MAP_HEIGHT - 50) {
            this.y = GAME_CONFIG.MAP_HEIGHT - 50 - this.height;
            this.velY = 0;
            this.onGround = true;
            this.resetJump();
        } else {
            this.onGround = false;
        }
        
        // 平台碰撞检测
        this.checkPlatformCollisions();
        
        // 射击冷却
        if (this.shootCooldown > 0) this.shootCooldown--;
        
        // 武器计时器
        if (this.weaponTimer > 0) {
            this.weaponTimer--;
            if (this.weaponTimer <= 0) {
                this.weaponType = 'normal';
                this.weaponDuration = 0;
            }
        }
        
        // 无敌时间
        if (this.invulnerable) {
            this.invulnerableTime--;
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
            }
        }
        
        let onWaterGrass = false;
        let waterGrassPlatform = null;
        for (let p of platforms) {
            if (p.y === waterY - platHeight && this.x + this.width > p.x && this.x < p.x + p.width) {
                onWaterGrass = true;
                waterGrassPlatform = p;
                break;
            }
        }
        // 只要y+height在水面下沉区间，且x与草堆平台重叠，就吸附到草堆平台
        if (this.y + this.height >= waterY && this.y + this.height <= waterY + waterHeight && waterGrassPlatform) {
            this.y = waterGrassPlatform.y - this.height;
            GAME_CONFIG.JUMP_FORCE = -15;
        } else if (this.y + this.height >= waterY && this.y + this.height <= waterY + waterHeight) {
            this.y = waterY - this.height + 24; // 下沉24像素
            GAME_CONFIG.JUMP_FORCE = -10;
        } else {
            GAME_CONFIG.JUMP_FORCE = -15;
        }
    }

    checkPlatformCollisions() {
        // 检查是否按下S键或下箭头键来主动掉落
        const wantToDrop = keys['s'] || keys['arrowdown'];
        if (this.velY > 0) { // 只在下落时检测
            platforms.forEach(platform => {
                // 判断人物脚部是否刚好落到平台上方
                const prevBottom = this.y + this.height - this.velY;
                const currBottom = this.y + this.height;
                const wasAbove = prevBottom <= platform.y;
                const isAbove = currBottom > platform.y && currBottom <= platform.y + platform.height;
                const inX = this.x + this.width > platform.x && this.x < platform.x + platform.width;
                if (!wantToDrop && wasAbove && isAbove && inX) {
                    this.y = platform.y - this.height;
                    this.velY = 0;
                    this.onGround = true;
                    this.resetJump();
                }
            });
        }
    }

    resetJump() {
        this.jumpCount = 0;
        this.canJump = true;
    }

    jump() {
        if (this.canJump && this.jumpCount < this.maxJumps) {
            this.velY = GAME_CONFIG.JUMP_FORCE;
            this.jumpCount++;
            this.canJump = false;
            
            // 如果是二段跳，给一点向上的推力
            if (this.jumpCount === 2) {
                this.velY = GAME_CONFIG.JUMP_FORCE * 0.8; // 二段跳稍微弱一点
            }
        }
    }

    shoot() {
        if (this.shootCooldown <= 0) {
            // 根据武器类型播放不同音效
            try {
                playShootSound(this.weaponType);
            } catch(e){
                console.error('音效播放失败:', e);
            }
            // 计算玩家中心位置
            const playerCenterX = this.x + this.width / 2;
            const playerCenterY = this.y + this.height / 2;
            
            // 计算鼠标相对于玩家的方向
            const deltaX = mouseX - playerCenterX;
            const deltaY = mouseY - playerCenterY;
            
            // 计算距离
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // 如果鼠标在画布内，使用鼠标方向；否则使用玩家朝向
            let velX, velY;
            if (distance > 0 && mouseX >= 0 && mouseY >= 0 && mouseX <= GAME_CONFIG.MAP_WIDTH && mouseY <= GAME_CONFIG.MAP_HEIGHT) {
                // 标准化方向向量并乘以子弹速度
                velX = (deltaX / distance) * GAME_CONFIG.BULLET_SPEED;
                velY = (deltaY / distance) * GAME_CONFIG.BULLET_SPEED;
            } else {
                // 默认方向（玩家朝向）
                velX = this.facing * GAME_CONFIG.BULLET_SPEED;
                velY = 0;
            }
            
            // 根据武器类型创建不同的子弹
            switch (this.weaponType) {
                case 'laser':
                    this.createLaserBullet(playerCenterX, playerCenterY, velX, velY);
                    this.shootCooldown = 5; // 激光射击更快
                    break;
                case 'shotgun':
                    this.createShotgunBullets(playerCenterX, playerCenterY, velX, velY);
                    this.shootCooldown = 20; // 散弹枪射击较慢
                    break;
                default:
                    bullets.push(new Bullet(
                        playerCenterX,
                        playerCenterY,
                        velX,
                        velY,
                        'player'
                    ));
                    this.shootCooldown = 10;
                    break;
            }
        }
    }

    createLaserBullet(x, y, velX, velY) {
        bullets.push(new LaserBullet(x, y, velX, velY, 'player'));
    }

    createShotgunBullets(x, y, velX, velY) {
        // 扇形角度范围（单位：弧度），比如60度
        const spread = Math.PI / 3; // 60度
        const count = 5; // 子弹数量
        // 基础方向
        const baseAngle = Math.atan2(velY, velX);
        for (let i = 0; i < count; i++) {
            // -spread/2 到 +spread/2
            const angle = baseAngle - spread / 2 + (spread / (count - 1)) * i;
            const speed = GAME_CONFIG.BULLET_SPEED;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            bullets.push(new Bullet(x, y, vx, vy, 'player'));
        }
    }

    setWeapon(type, duration = 300) {
        this.weaponType = type;
        this.weaponTimer = duration;
        this.weaponDuration = duration;
    }

    takeDamage(damage) {
        if (!this.invulnerable) {
            this.health -= damage;
            this.invulnerable = true;
            this.invulnerableTime = 60;
            gameState.health = this.health;
            
            // 添加摄像机震动效果
            cameraShake = 5; // 减少震动强度
            
            if (this.health <= 0) {
                gameOver();
            }
        }
    }

    draw() {
        // 无敌闪烁效果
        if (this.invulnerable && Math.floor(this.invulnerableTime / 5) % 2 === 0) {
            return;
        }
        
        // 使用图片绘制玩家
        if (playerImage.complete) {
            ctx.save();
            if (this.facing === -1) {
                ctx.scale(-1, 1);
                ctx.drawImage(playerImage, -(this.x - cameraX) - this.width, this.y - cameraY, this.width, this.height);
            } else {
                ctx.drawImage(playerImage, this.x - cameraX, this.y - cameraY, this.width, this.height);
            }
            ctx.restore();
        } else {
            ctx.fillStyle = '#0066CC';
            ctx.fillRect(this.x - cameraX, this.y - cameraY, this.width, this.height);
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x - cameraX + 5, this.y - cameraY + 10, 8, 8);
            ctx.fillRect(this.x - cameraX + 27, this.y - cameraY + 10, 8, 8);
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - cameraX + (this.facing === 1 ? this.width : -10), this.y - cameraY + 20, 15, 5);
        }
    }
}

// 子弹类
class Bullet {
    constructor(x, y, velX, velY, owner) {
        this.x = x;
        this.y = y;
        this.velX = velX;
        this.velY = velY;
        this.width = 6;
        this.height = 6;
        this.owner = owner; // 'player' 或 'enemy'
        this.life = 120; // 子弹存活时间
        this.type = 'normal';
    }

    update() {
        this.x += this.velX;
        this.y += this.velY;
        this.life--;
        
        // 边界检查
        if (this.x < 0 || this.x > GAME_CONFIG.MAP_WIDTH || this.y < 0 || this.y > GAME_CONFIG.MAP_HEIGHT) {
            this.life = 0;
        }
    }

    draw() {
        ctx.fillStyle = this.owner === 'player' ? '#FFFF00' : '#FF0000';
        ctx.fillRect(this.x - cameraX - this.width/2, this.y - cameraY - this.height/2, this.width, this.height);
    }
}

// 激光子弹类
class LaserBullet extends Bullet {
    constructor(x, y, velX, velY, owner) {
        super(x, y, velX, velY, owner);
        this.width = 3;
        this.height = 6;      // 激光变短
        this.life = 30;       // 存活时间更短
        this.type = 'laser';
        this.damage = 30;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = this.owner === 'player' ? '#00FFFF' : '#FF00FF';
        ctx.fillRect(this.x - cameraX - this.width/2, this.y - cameraY - this.height/2, this.width, this.height);
        ctx.restore();
    }
}

// 敌人类
class Enemy {
    constructor(x, y, type = 'soldier') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = type === 'boss' ? 200 : 40;
        this.height = type === 'boss' ? 120 : 50;
        if (type === 'boss') {
            this.velX = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2); // 随机初速度
            this.velY = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2);
        } else {
            this.velX = -1;
            this.velY = 0;
        }
        this.health = type === 'boss' ? 200 : 30;
        this.maxHealth = this.health;
        this.shootCooldown = 0;
        this.patrolDistance = 200;
        this.startX = x;
        this.direction = -1;
        this.onGround = false;
    }

    update() {
        if (this.type === 'boss') {
            this.updateBoss();
        } else {
            this.updateSoldier();
        }
        
        if (this.shootCooldown > 0) this.shootCooldown--;
    }

    updateSoldier() {
        // 重力
        this.velY += GAME_CONFIG.GRAVITY;
        
        // 检测玩家位置并朝向玩家
        if (player) {
            const playerDistance = Math.abs(this.x - player.x);
            
            // 如果玩家在检测范围内（300像素），开始追踪
            if (playerDistance < 300) {
                // 朝向玩家方向
                if (player.x > this.x) {
                    this.velX = 1;
                    this.direction = 1;
                } else {
                    this.velX = -1;
                    this.direction = -1;
                }
                
                // 朝玩家方向射击
                if (this.shootCooldown <= 0 && Math.random() < 0.01) {
                    this.shoot();
                }
            } else {
                // 玩家不在范围内，继续巡逻
                if (Math.abs(this.x - this.startX) > this.patrolDistance) {
                    this.velX *= -1;
                    this.direction *= -1;
                }
            }
        }
        
        // 移动
        this.x += this.velX * GAME_CONFIG.ENEMY_SPEED;
        this.y += this.velY;
        
        // 边界检查
        if (this.y + this.height > GAME_CONFIG.MAP_HEIGHT - 50) {
            this.y = GAME_CONFIG.MAP_HEIGHT - 50 - this.height;
            this.velY = 0;
            this.onGround = true;
        }
        
        // 射击冷却
        if (this.shootCooldown > 0) this.shootCooldown--;
    }

    updateBoss() {
        // 满屏飞行逻辑（仅限于当前摄像机可见范围）
        this.x += this.velX;
        this.y += this.velY;
        // 获取当前摄像机可见范围
        const leftBound = cameraX;
        const rightBound = cameraX + canvas.width - this.width;
        // 横向边界反弹（只在屏幕内）
        if (this.x < leftBound) {
            this.x = leftBound;
            this.velX *= -1;
        } else if (this.x > rightBound) {
            this.x = rightBound;
            this.velX *= -1;
        }
        // 纵向边界与原逻辑一致
        if (this.y < 0) {
            this.y = 0;
            this.velY = Math.abs(this.velY) + (Math.random() - 0.5) * 2;
        } else if (this.y + this.height > GAME_CONFIG.MAP_HEIGHT) {
            this.y = GAME_CONFIG.MAP_HEIGHT - this.height;
            this.velY = -Math.abs(this.velY) + (Math.random() - 0.5) * 2;
        }
        // 定时扰动y速度
        if (Math.random() < 0.01) {
            this.velY += (Math.random() - 0.5) * 2;
        }
        // Boss射击
        if (this.shootCooldown <= 0 && Math.random() < 0.02) {
            this.shoot();
        }
    }

    shoot() {
        if (this.type === 'boss') {
            // 播放射击音效
            try { playShootSound('normal'); } catch(e){}
            // Boss发射三发追踪玩家的子弹
            if (player) {
                const bossCenterX = this.x + this.width / 2;
                const bossCenterY = this.y + this.height / 2;
                const playerCenterX = player.x + player.width / 2;
                const playerCenterY = player.y + player.height / 2;
                const deltaX = playerCenterX - bossCenterX;
                const deltaY = playerCenterY - bossCenterY;
                const baseAngle = Math.atan2(deltaY, deltaX);
                for (let i = 0; i < 3; i++) {
                    const angle = baseAngle + (i - 1) * 0.2; // 三发扇形
                    const speed = 5;
                    const vx = Math.cos(angle) * speed;
                    const vy = Math.sin(angle) * speed;
                    enemyBullets.push(new Bullet(
                        bossCenterX,
                        bossCenterY,
                        vx,
                        vy,
                        'enemy'
                    ));
                }
            }
        } else {
            // 播放射击音效
            try { playShootSound('normal'); } catch(e){}
            // 小兵朝玩家方向射击
            if (player) {
                // 计算朝向玩家的方向
                const deltaX = player.x - this.x;
                const deltaY = player.y - this.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > 0) {
                    // 标准化方向向量
                    const velX = (deltaX / distance) * 3;
                    const velY = (deltaY / distance) * 3;
                    
                    enemyBullets.push(new Bullet(
                        this.x + this.width/2,
                        this.y + this.height/2,
                        velX,
                        velY,
                        'enemy'
                    ));
                } else {
                    // 如果玩家就在小兵位置，使用默认方向
                    enemyBullets.push(new Bullet(
                        this.x + this.width/2,
                        this.y + this.height/2,
                        this.direction * 3,
                        0,
                        'enemy'
                    ));
                }
            } else {
                // 如果没有玩家，使用默认方向
                enemyBullets.push(new Bullet(
                    this.x + this.width/2,
                    this.y + this.height/2,
                    this.direction * 3,
                    0,
                    'enemy'
                ));
            }
        }
        this.shootCooldown = 60;
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            if (this.type === 'boss') {
                gameState.score += 1000;
                setTimeout(() => { nextLevel(); }, 1000); // boss死亡时延迟通关
            } else {
                gameState.score += 100;
            }
            return true; // 敌人死亡
        }
        return false;
    }

    draw() {
        if (this.type === 'boss') {
            // Boss绘制
            ctx.drawImage(bossImage, this.x - cameraX, this.y - cameraY, this.width, this.height);
            // 血条
            const healthBarWidth = this.width;
            const healthBarHeight = 10;
            const healthPercentage = this.health / this.maxHealth;
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(this.x - cameraX, this.y - cameraY - 15, healthBarWidth, healthBarHeight);
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(this.x - cameraX, this.y - cameraY - 15, healthBarWidth * healthPercentage, healthBarHeight);
            return;
        } else {
            // 小兵使用图片绘制
            if (soldierImage.complete) {
                ctx.save();
                
                // 根据朝向翻转图片
                if (this.direction === -1) {
                    // 向左时翻转图片
                    ctx.scale(-1, 1);
                    ctx.drawImage(soldierImage, -(this.x - cameraX + this.width), this.y - cameraY, this.width, this.height);
                } else {
                    // 向右时正常绘制
                    ctx.drawImage(soldierImage, this.x - cameraX, this.y - cameraY, this.width, this.height);
                }
                
                ctx.restore();
            } else {
                // 如果图片还没加载完成，使用备用绘制方式
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(this.x - cameraX, this.y - cameraY, this.width, this.height);
                
                // 敌人眼睛
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x - cameraX + 5, this.y - cameraY + 5, 8, 8);
                ctx.fillRect(this.x - cameraX + 27, this.y - cameraY + 5, 8, 8);
            }
        }
    }
}

// 平台类
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw() {
        if (bgGrassImage.complete && bgGrassImage.width > 0 && bgGrassImage.height > 0) {
            for (let px = 0; px < this.width; px += bgGrassImage.width) {
                for (let py = 0; py < this.height; py += bgGrassImage.height) {
                    ctx.drawImage(
                        bgGrassImage,
                        0, 0, // sx, sy
                        bgGrassImage.width, bgGrassImage.height, // sw, sh
                        this.x - cameraX + px, this.y - cameraY + py, // dx, dy
                        bgGrassImage.width, bgGrassImage.height // dw, dh
                    );
                }
            }
        }
    }
}

// 道具类
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type; // 'laser', 'shotgun'
        this.life = 600; // 道具存活时间
        this.bobOffset = 0;
        this.bobSpeed = 0.1;
    }

    update() {
        this.life--;
        this.bobOffset += this.bobSpeed;
    }

    draw() {
        // 上下浮动效果
        const bobY = this.y + Math.sin(this.bobOffset) * 5;
        
        ctx.save();
        
        // 道具背景光晕
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.type === 'laser' ? '#00FFFF' : '#FFD700';
        ctx.fillRect(this.x - cameraX - 5, bobY - cameraY - 5, this.width + 10, this.height + 10);
        
        ctx.globalAlpha = 1;
        
        // 道具主体
        if (this.type === 'laser') {
            // 激光道具
            ctx.fillStyle = '#00FFFF';
            ctx.fillRect(this.x - cameraX, bobY - cameraY, this.width, this.height);
            
            // 激光图标
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(this.x - cameraX + 5, bobY - cameraY + 5, 20, 4);
            ctx.fillRect(this.x - cameraX + 5, bobY - cameraY + 15, 20, 4);
        } else if (this.type === 'shotgun') {
            // 散弹枪道具
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(this.x - cameraX, bobY - cameraY, this.width, this.height);
            
            // 散弹枪图标
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x - cameraX + 5, bobY - cameraY + 10, 20, 10);
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(this.x - cameraX + 8 + i * 5, bobY - cameraY + 5, 2, 20);
            }
        }
        
        ctx.restore();
    }
}

// 粒子效果类
class Particle {
    constructor(x, y, velX, velY, color, life) {
        this.x = x;
        this.y = y;
        this.velX = velX;
        this.velY = velY;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.velX;
        this.y += this.velY;
        this.velY += 0.1; // 重力
        this.life--;
    }

    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - cameraX, this.y - cameraY, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// 碰撞检测
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 创建爆炸效果
function createExplosion(x, y, color = '#FF6B6B') {
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        const speed = Math.random() * 3 + 2;
        particles.push(new Particle(
            x,
            y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            color,
            30
        ));
    }
}

// 随机生成道具
function spawnRandomPowerUp(x, y) {
    if (Math.random() < 0.3) { // 30%概率生成道具
        const types = ['laser', 'shotgun'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        powerUps.push(new PowerUp(x, y, randomType));
    }
}

// Boss关状态
let bossAppeared = false;
let bossJustAppeared = false;
let bossStage = 0; // 0-小兵阶段，1-Boss阶段，2-通关

function initLevel(level) {
    enemies = [];
    platforms = [];
    powerUps = [];
    bossAppeared = false;
    bossJustAppeared = false;
    bossStage = 0;
    // 主路y设为wall区域中间，wallY=treeDrawY+treeHeight
    const mainRoadY = (canvas.height - platHeight) / 2;
    const treeDrawY = mainRoadY - treeHeight;
    const wallY_dynamic = treeDrawY + treeHeight;
    const wallTop = wallY_dynamic;
    const wallBottom = waterY;
    // 主路 - 更稀疏的草垛平台（60%概率）
    if (mainRoadY >= wallTop && mainRoadY < wallBottom - platHeight) {
        for (let x = 0; x < GAME_CONFIG.MAP_WIDTH; x += platWidth) {
            if (Math.random() < 0.6) { // 60%概率生成主路草垛
                platforms.push(new Platform(x, mainRoadY, platWidth, platHeight));
            }
        }
    }
    // 悬浮平台 - 在更大的地图范围内分布
    const floatPlatforms = [
        {x: 200, y: mainRoadY - 100},
        {x: 600, y: mainRoadY - 100},
        {x: 1000, y: mainRoadY - 100},
        {x: 1400, y: mainRoadY - 100},
        {x: 1800, y: mainRoadY - 100},
        {x: 2200, y: mainRoadY - 100},
        {x: 2600, y: mainRoadY - 100},
        {x: 3000, y: mainRoadY - 100},
        {x: 3400, y: mainRoadY - 100},
        {x: 3800, y: mainRoadY - 100},
        {x: 4200, y: mainRoadY - 100},
        {x: 4600, y: mainRoadY - 100},
        {x: 350, y: mainRoadY + 100},
        {x: 800, y: mainRoadY + 100},
        {x: 1200, y: mainRoadY + 100},
        {x: 1600, y: mainRoadY + 100},
        {x: 2000, y: mainRoadY + 100},
        {x: 2400, y: mainRoadY + 100},
        {x: 2800, y: mainRoadY + 100},
        {x: 3200, y: mainRoadY + 100},
        {x: 3600, y: mainRoadY + 100},
        {x: 4000, y: mainRoadY + 100},
        {x: 4400, y: mainRoadY + 100},
        {x: 4800, y: mainRoadY + 100}
    ];
    floatPlatforms.forEach(p => {
        if (p.y >= wallTop && p.y < wallBottom - platHeight) {
            platforms.push(new Platform(p.x, p.y, platWidth, platHeight));
        }
    });
    // 主路下方草垛平台 - 更加随机分布
    let x = 0;
    while (x < GAME_CONFIG.MAP_WIDTH) {
        if (Math.random() < 0.7) {
            platforms.push(new Platform(x, waterY - platHeight, platWidth, platHeight));
        }
        x += 150 + Math.random() * 350; // 下一个草垛间隔在150~500像素之间
    }
    // 玩家、小兵初始都在主路上
    player = new Player(50, mainRoadY - 60);
    // 在更大的地图范围内分布敌人
    for (let i = 1; i <= 20; i++) {
        let x = 200 + i * 240; // 每240像素一个敌人，覆盖整个地图
        if (x < GAME_CONFIG.MAP_WIDTH - 100) { // 确保敌人不会生成在地图边缘
            enemies.push(new Enemy(x, mainRoadY - 50, 'soldier'));
        }
    }
    // 记录主路和tree的y坐标供背景绘制
    window._mainRoadY = mainRoadY;
    window._treeDrawY = treeDrawY;
    window._wallY_dynamic = wallY_dynamic;
}

// 下一关
function nextLevel() {
    gameState.level++;
    if (gameState.level > 3) {
        // 游戏胜利
        document.getElementById('winScore').textContent = gameState.score;
        document.getElementById('winScreen').style.display = 'block';
        gameState.isRunning = false;
        return;
    }
    
    // 恢复生命值
    player.health = Math.min(player.health + 50, player.maxHealth);
    gameState.health = player.health;
    
    // 初始化新关卡
    initLevel(gameState.level);
    
    // 更新UI
    document.getElementById('level').textContent = gameState.level;
}

// 游戏结束
function gameOver() {
    gameState.isRunning = false;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOver').style.display = 'block';
}

// 重新开始游戏
function restartGame() {
    gameState = {
        isRunning: false,
        isPaused: false,
        score: 0,
        level: 1,
        health: 100
    };
    
    player = new Player(50, GAME_CONFIG.MAP_HEIGHT / 2);
    bullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    powerUps = []; // 清空道具
    
    // 重置摄像机状态
    cameraX = 0;
    cameraY = 0;
    targetCameraX = 0;
    cameraVelocity = 0;
    cameraShake = 0;
    cameraHistory = []; // 重置摄像机历史记录
    
    document.getElementById('score').textContent = '0';
    document.getElementById('level').textContent = '1';
    document.getElementById('health').textContent = '100';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
    document.getElementById('winScreen').style.display = 'none';
    bossAppeared = false;
    bossJustAppeared = false;
    bossStage = 0;
}

// 开始游戏
function startGame() {
    gameState.isRunning = true;
    document.getElementById('startScreen').style.display = 'none';
    initLevel(1);
    gameLoop();
}

// 输入处理
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key.toLowerCase() === 'r') {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// 鼠标事件处理
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left + cameraX;
    mouseY = e.clientY - rect.top + cameraY;
});

canvas.addEventListener('mousedown', (e) => {
    if (gameState.isRunning && player && e.button === 0) { // 只处理左键
        // 修正点击时的mouseX、mouseY为全局坐标
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left + cameraX;
        mouseY = e.clientY - rect.top + cameraY;
        
        // 设置鼠标按下状态
        isMouseDown = true;
        mouseDownTime = Date.now();
        lastShootTime = Date.now();
        
        // 立即发射第一颗子弹
        player.shoot();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) { // 只处理左键
        isMouseDown = false;
    }
});

// 全局mouseup事件，防止鼠标在canvas外部释放时状态不正确
document.addEventListener('mouseup', (e) => {
    if (e.button === 0) { // 只处理左键
        isMouseDown = false;
    }
});

canvas.addEventListener('click', (e) => {
    if (gameState.isRunning && player) {
        // 修正点击时的mouseX、mouseY为全局坐标
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left + cameraX;
        mouseY = e.clientY - rect.top + cameraY;
        // 注意：这里不再直接调用player.shoot()，因为mousedown已经处理了
    }
});

// 游戏主循环
function gameLoop() {
    if (!gameState.isRunning) return;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    drawBackground();
    
    // 绘制平台
    platforms.forEach(platform => platform.draw());
    
    // 更新玩家
    if (player) {
        // 玩家输入
        if (keys['a'] || keys['arrowleft']) {
            player.velX = -GAME_CONFIG.PLAYER_SPEED;
            player.facing = -1;
        } else if (keys['d'] || keys['arrowright']) {
            player.velX = GAME_CONFIG.PLAYER_SPEED;
            player.facing = 1;
        } else {
            player.velX = 0;
        }
        
        // 处理跳跃输入
        if (keys[' '] || keys['w'] || keys['arrowup']) {
            player.jump();
        }
        
        // 重置跳跃状态（当松开跳跃键时）
        if (!keys[' '] && !keys['w'] && !keys['arrowup']) {
            player.canJump = true;
        }
        
        // 处理连续射击
        if (isMouseDown && gameState.isRunning) {
            const currentTime = Date.now();
            if (currentTime - lastShootTime >= SHOOT_INTERVAL) {
                player.shoot();
                lastShootTime = currentTime;
            }
        }
        
        player.update();
    }
    
    // 更新子弹
    bullets = bullets.filter(bullet => {
        bullet.update();
        bullet.draw();
        return bullet.life > 0;
    });
    
    // 更新敌人子弹
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.update();
        bullet.draw();
        return bullet.life > 0;
    });
    
    // 更新敌人
    enemies = enemies.filter(enemy => {
        enemy.update();
        enemy.draw();
        return enemy.health > 0;
    });
    
    // 更新粒子
    particles = particles.filter(particle => {
        particle.update();
        particle.draw();
        return particle.life > 0;
    });
    
    // 更新道具
    powerUps = powerUps.filter(powerUp => {
        powerUp.update();
        powerUp.draw();
        return powerUp.life > 0;
    });
    
    // 玩家始终在平台之上
    if (player) {
        player.draw();
    }
    
    // 碰撞检测
    handleCollisions();
    
    // 所有关卡都支持小兵死光后出现boss
    if (!bossAppeared && enemies.length > 0 && enemies.every(e => e.type === 'soldier')) {
        // 还有小兵，什么都不做
    } else if (!bossAppeared && enemies.length === 0) {
        // 小兵死光，生成boss
        let bossX = 2500; // 在地图中间位置生成boss
        if (gameState.level === 1) bossX = 2000;
        if (gameState.level === 2) bossX = 3000;
        if (gameState.level === 3) bossX = 4000;
        enemies.push(new Enemy(bossX, GAME_CONFIG.MAP_HEIGHT - 150, 'boss'));
        bossAppeared = true;
        bossJustAppeared = true; // 新增，防止本帧直接通关
    }
    // boss刚出现的那一帧不判定通关
    if (bossJustAppeared) {
        bossJustAppeared = false;
    }
    
    // 更新UI
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('health').textContent = gameState.health;
    
    // 摄像机跟随玩家
    if (player) {
        // 检测玩家是否停止移动
        const playerStopped = Math.abs(player.velX) < 0.1;
        
        // 摄像机预测 - 根据玩家速度预测位置
        const predictionDistance = player.velX * 5; // 减少预测距离
        let targetX = player.x + player.width / 2 - canvas.width / 2 + predictionDistance;
        
        // 限制预测范围，避免过度预测
        const maxPrediction = 50; // 减少最大预测范围
        if (Math.abs(predictionDistance) > maxPrediction) {
            targetX = player.x + player.width / 2 - canvas.width / 2 + (predictionDistance > 0 ? maxPrediction : -maxPrediction);
        }
        
        targetCameraX = targetX;
        targetCameraX = Math.max(0, Math.min(targetCameraX, GAME_CONFIG.MAP_WIDTH - canvas.width));
        
        // 如果玩家停止移动，摄像机也停止移动
        if (playerStopped) {
            // 摄像机保持在当前位置，不进行任何移动
            cameraVelocity = 0;
        } else {
            // 玩家移动时的正常跟随逻辑
            const isFirstMove = Math.abs(cameraX) < 1;
            let springStrength = isFirstMove ? 0.08 : 0.12; // 首次移动使用更小的强度
            
            const distance = targetCameraX - cameraX;
            let springDamping = 0.92; // 基础阻尼
            
            // 自适应阻尼 - 距离越近，阻尼越大
            const distanceRatio = Math.abs(distance) / (canvas.width / 2);
            if (distanceRatio < 0.1) {
                springDamping = 0.98; // 非常接近时使用更高阻尼
            } else if (distanceRatio < 0.3) {
                springDamping = 0.95; // 较近时使用较高阻尼
            }
            
            cameraVelocity += distance * springStrength;
            cameraVelocity *= springDamping;
            
            // 当距离很小时，逐渐减少速度，避免微小振荡
            if (Math.abs(distance) < 2) {
                cameraVelocity *= 0.5; // 在接近目标时大幅减少速度
            }
            
            // 限制最大速度，避免过度移动
            const maxVelocity = 4; // 进一步减少最大速度
            if (Math.abs(cameraVelocity) > maxVelocity) {
                cameraVelocity = cameraVelocity > 0 ? maxVelocity : -maxVelocity;
            }
            
            // 当速度很小时，直接停止，避免微小抖动
            if (Math.abs(cameraVelocity) < 0.05) { // 降低阈值
                cameraVelocity = 0;
            }
            
            cameraX += cameraVelocity;
        }
        
        // 更新摄像机历史记录
        cameraHistory.push(cameraX);
        if (cameraHistory.length > maxHistoryLength) {
            cameraHistory.shift();
        }
        
        // 检测摄像机方向变化
        if (cameraHistory.length >= 3) {
            const recent = cameraHistory.slice(-3);
            const direction1 = recent[1] - recent[0];
            const direction2 = recent[2] - recent[1];
            
            // 如果方向发生改变，提供额外的平滑处理
            if ((direction1 > 0 && direction2 < 0) || (direction1 < 0 && direction2 > 0)) {
                cameraVelocity *= 0.2; // 方向改变时大幅减少速度
            }
            
            // 如果玩家停止且摄像机在微小振荡，直接停止
            if (playerStopped && Math.abs(direction1) < 0.1 && Math.abs(direction2) < 0.1) {
                cameraVelocity = 0;
            }
        }
        
        // 最终稳定检查 - 如果玩家停止且摄像机几乎不动，强制停止
        // 只有在distance已定义时才检查
        if (!playerStopped && typeof distance !== 'undefined') {
            if (Math.abs(cameraVelocity) < 0.1 && Math.abs(distance) < 0.5) {
                cameraX = targetCameraX;
                cameraVelocity = 0;
            }
        }
        
        // 添加摄像机震动
        if (cameraShake > 0) {
            cameraX += (Math.random() - 0.5) * cameraShake;
            cameraShake *= cameraShakeDecay;
        }
        
        // 边界限制
        if (cameraX < 0) {
            cameraX = 0;
            cameraVelocity = 0;
        } else if (cameraX > GAME_CONFIG.MAP_WIDTH - canvas.width) {
            cameraX = GAME_CONFIG.MAP_WIDTH - canvas.width;
            cameraVelocity = 0;
        }
        
        cameraY = 0; // 只横向移动，纵向固定
    }
    
    requestAnimationFrame(gameLoop);
}

// 绘制背景
function drawBackground() {
    // 视差滚动参数 - 所有层次都更接近角色移动速度
    const skyParallax = 0.7;    // 天空移动速度
    const treeParallax = 0.8;   // 树木移动速度
    const wallParallax = 0.9;   // 墙壁移动速度
    const waterParallax = 1.0;  // 水面完全跟随
    
    // 计算各层的视差偏移
    const skyOffset = cameraX * skyParallax;
    const treeOffset = cameraX * treeParallax;
    const wallOffset = cameraX * wallParallax;
    const waterOffset = cameraX * waterParallax;
    
    // 只负责游戏分层背景
    let treeDrawY = window._treeDrawY !== undefined ? window._treeDrawY : window._mainRoadY - treeHeight;
    
    // 绘制天空背景 - 最慢的视差
    if (bgSkyImage.complete && bgSkyImage.width > 0 && bgSkyImage.height > 0) {
        const bgStartX = Math.floor(skyOffset / bgSkyImage.width) * bgSkyImage.width;
        const bgEndX = bgStartX + canvas.width + bgSkyImage.width * 2;
        
        for (let x = bgStartX; x < bgEndX; x += bgSkyImage.width) {
            const drawX = x - skyOffset;
            if (drawX + bgSkyImage.width > 0 && drawX < canvas.width) {
                ctx.drawImage(bgSkyImage, drawX, 0, bgSkyImage.width, treeDrawY);
            }
        }
    } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, treeDrawY);
    }
    
    // 绘制树木背景 - 中等视差
    if (bgTreeImage.complete && bgTreeImage.width > 0 && bgTreeImage.height > 0) {
        const bgStartX = Math.floor(treeOffset / bgTreeImage.width) * bgTreeImage.width;
        const bgEndX = bgStartX + canvas.width + bgTreeImage.width * 2;
        
        for (let x = bgStartX; x < bgEndX; x += bgTreeImage.width) {
            const drawX = x - treeOffset;
            if (drawX + bgTreeImage.width > 0 && drawX < canvas.width) {
                ctx.drawImage(bgTreeImage, drawX, treeDrawY, bgTreeImage.width, treeHeight);
            }
        }
    } else {
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, treeDrawY, canvas.width, treeHeight);
    }
    
    // 绘制墙壁背景 - 较快视差
    let wallDrawY = window._wallY_dynamic !== undefined ? window._wallY_dynamic : (window._mainRoadY + platHeight);
    let wallDrawHeight = waterY - wallDrawY;
    if (bgWallImage.complete && bgWallImage.width > 0 && bgWallImage.height > 0) {
        const bgStartX = Math.floor(wallOffset / bgWallImage.width) * bgWallImage.width;
        const bgEndX = bgStartX + canvas.width + bgWallImage.width * 2;
        
        for (let x = bgStartX; x < bgEndX; x += bgWallImage.width) {
            const drawX = x - wallOffset;
            if (drawX + bgWallImage.width > 0 && drawX < canvas.width) {
                for (let y = wallDrawY; y < wallDrawY + wallDrawHeight; y += bgWallImage.height) {
                    ctx.drawImage(bgWallImage, drawX, y, bgWallImage.width, Math.min(bgWallImage.height, wallDrawY + wallDrawHeight - y));
                }
            }
        }
    } else {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, wallDrawY, canvas.width, wallDrawHeight);
    }
    
    // 绘制水面背景 - 最快视差
    if (bgWaterImage.complete && bgWaterImage.width > 0 && bgWaterImage.height > 0) {
        const bgStartX = Math.floor(waterOffset / bgWaterImage.width) * bgWaterImage.width;
        const bgEndX = bgStartX + canvas.width + bgWaterImage.width * 2;
        
        for (let x = bgStartX; x < bgEndX; x += bgWaterImage.width) {
            const drawX = x - waterOffset;
            if (drawX + bgWaterImage.width > 0 && drawX < canvas.width) {
                ctx.drawImage(bgWaterImage, drawX, waterY, bgWaterImage.width, waterHeight);
            }
        }
    } else {
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(0, waterY, canvas.width, waterHeight);
    }
    
    // 添加边缘渐变效果，让卷轴更加平滑
    const gradientWidth = 30; // 减少渐变宽度
    const gradient = ctx.createLinearGradient(0, 0, gradientWidth, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0.2)'); // 减少渐变强度
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    // 左边缘渐变
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gradientWidth, canvas.height);
    
    // 右边缘渐变
    const rightGradient = ctx.createLinearGradient(canvas.width - gradientWidth, 0, canvas.width, 0);
    rightGradient.addColorStop(0, 'rgba(0,0,0,0)');
    rightGradient.addColorStop(1, 'rgba(0,0,0,0.2)'); // 减少渐变强度
    ctx.fillStyle = rightGradient;
    ctx.fillRect(canvas.width - gradientWidth, 0, gradientWidth, canvas.height);
}

// 处理碰撞
function handleCollisions() {
    // 玩家子弹与敌人碰撞
    bullets.forEach((bullet, bulletIndex) => {
        if (bullet.owner === 'player') {
            enemies.forEach((enemy, enemyIndex) => {
                if (checkCollision(bullet, enemy)) {
                    const damage = bullet.type === 'laser' ? bullet.damage : 20;
                    if (enemy.takeDamage(damage)) {
                        createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#FF0000');
                        // 敌人死亡时可能生成道具
                        if (enemy.type !== 'boss') {
                            spawnRandomPowerUp(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                        }
                    }
                    bullet.life = 0;
                }
            });
        }
    });
    
    // 敌人子弹与玩家碰撞
    enemyBullets.forEach(bullet => {
        if (bullet.owner === 'enemy' && player && checkCollision(bullet, player)) {
            player.takeDamage(10);
            bullet.life = 0;
            createExplosion(bullet.x, bullet.y, '#FFFF00');
        }
    });
    
    // 玩家与敌人碰撞
    if (player) {
        enemies.forEach(enemy => {
            if (checkCollision(player, enemy)) {
                player.takeDamage(20);
                createExplosion(player.x + player.width/2, player.y + player.height/2, '#FFFF00');
            }
        });
        
        // 玩家与道具碰撞
        powerUps.forEach((powerUp, index) => {
            if (checkCollision(player, powerUp)) {
                // 收集道具
                if (powerUp.type === 'laser') {
                    player.setWeapon('laser', 300);
                    createExplosion(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, '#00FFFF');
                } else if (powerUp.type === 'shotgun') {
                    player.setWeapon('shotgun', 300);
                    createExplosion(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, '#FFD700');
                }
                powerUp.life = 0; // 移除道具
            }
        });
    }
}

// 初始化游戏
function init() {
    player = new Player(50, GAME_CONFIG.MAP_HEIGHT / 2);
    drawBackground();
}

// 页面加载完成后初始化
window.addEventListener('load', init);

// 1. 平台生成限制
// 在initLevel等平台生成处，修正y坐标
// 例如：
// platforms.push(new Platform(x, Math.min(y, waterY - platformHeight), width, height));
// 下面为自动修正：
const oldPushPlatform = platforms.push.bind(platforms);
platforms.push = function(p) {
    if (p.y + p.height > waterY) {
        p.y = waterY - p.height;
    }
    return oldPushPlatform(p);
};

// 2. 玩家update限制
const oldPlayerUpdate = Player.prototype.update;
Player.prototype.update = function() {
    oldPlayerUpdate.call(this);
    if (this.y + this.height > waterY) {
        this.y = waterY - this.height;
        this.velY = 0;
        this.onGround = true;
        this.resetJump();
    }
};

// 3. 敌人updateSoldier限制
const oldEnemyUpdateSoldier = Enemy.prototype.updateSoldier;
Enemy.prototype.updateSoldier = function() {
    oldEnemyUpdateSoldier.call(this);
    if (this.y + this.height > waterY) {
        this.y = waterY - this.height;
        this.velY = 0;
        this.onGround = true;
    }
};

// 4. 敌人updateBoss限制
const oldEnemyUpdateBoss = Enemy.prototype.updateBoss;
Enemy.prototype.updateBoss = function() {
    oldEnemyUpdateBoss.call(this);
    if (this.y + this.height > waterY) {
        this.y = waterY - this.height;
        this.velY = 0;
        this.onGround = true;
    }
};

// 5. 玩家和敌人初始化y坐标限制
function safeY(y, height) {
    return Math.min(y, waterY - height);
}
// 在init等初始化时调用safeY
// 例如：player = new Player(x, safeY(y, playerHeight)); 