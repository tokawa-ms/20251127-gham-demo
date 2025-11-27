/**
 * スペースインベーダー - メインゲームスクリプト
 * 
 * 機能:
 * - インベーダーの隊列移動と攻撃
 * - 自機の操作と弾の発射
 * - バリアシステム
 * - UFOボーナス
 * - サウンドエフェクト（Web Audio API）
 * - ハイスコアのローカルストレージ保存
 */

'use strict';

// ============================================
// ゲーム定数
// ============================================
const GAME_CONFIG = {
    // キャンバスサイズ（論理サイズ）
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 700,
    
    // インベーダー設定
    INVADER_ROWS: 5,
    INVADER_COLS: 11,
    INVADER_WIDTH: 40,
    INVADER_HEIGHT: 30,
    INVADER_PADDING: 10,
    INVADER_TOP_OFFSET: 60,
    INVADER_BASE_SPEED: 40, // ピクセル/秒
    INVADER_DROP_DISTANCE: 15,
    INVADER_HITBOX_MARGIN: 10, // 当たり判定の拡大マージン（ピクセル）
    
    // 自機設定
    PLAYER_WIDTH: 50,
    PLAYER_HEIGHT: 30,
    PLAYER_SPEED: 300, // ピクセル/秒
    PLAYER_BOTTOM_MARGIN: 80, // 自機の画面下部からのマージン
    
    // 弾設定
    BULLET_WIDTH: 4,
    BULLET_HEIGHT: 15,
    PLAYER_BULLET_SPEED: 1000, // ピクセル/秒（500から倍速に変更）
    ENEMY_BULLET_SPEED: 200, // ピクセル/秒
    
    // バリア設定
    BARRIER_COUNT: 4,
    BARRIER_WIDTH: 60,
    BARRIER_HEIGHT: 40,
    BARRIER_HEALTH: 10,
    
    // UFO設定
    UFO_WIDTH: 50,
    UFO_HEIGHT: 20,
    UFO_SPEED: 150, // ピクセル/秒
    UFO_SPAWN_INTERVAL: 25000, // ミリ秒
    UFO_SCORE: 300,
    
    // ゲーム設定
    INITIAL_LIVES: 3,
    MAX_SPEED_MULTIPLIER: 5, // インベーダー最大速度倍率（10→5に緩和）
    ENEMY_SHOOT_DIVISOR: 5, // 敵発射数計算用の除数
    BARRIER_DAMAGE_PROBABILITY: 0.7, // バリアダメージ時のピクセル削除確率
    INVADER_MOVE_FACTOR: 0.5, // インベーダー移動量の調整係数
    
    // インベーダースコア（行ごと、上から順）
    INVADER_SCORES: [50, 40, 30, 20, 10],
    
    // インベーダーの色（行ごと、上から順）
    INVADER_COLORS: ['#ff0000', '#ff6600', '#ffff00', '#00ff00', '#00ffff']
};

// ============================================
// サウンドマネージャー（Web Audio API）
// ============================================
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
        this.moveIndex = 0;
        // インベーダー移動音の周波数
        this.moveFrequencies = [75.9, 66.2, 62.2, 57.7];
        console.log('[SoundManager] インスタンス作成');
    }

    /**
     * AudioContextを初期化する（ユーザー操作後に呼び出し必須）
     */
    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('[SoundManager] AudioContext初期化完了');
        } catch (e) {
            console.error('[SoundManager] AudioContext初期化失敗:', e);
        }
    }

    /**
     * 矩形波を生成して再生
     * @param {number} frequency - 周波数
     * @param {number} duration - 持続時間（秒）
     * @param {number} volume - 音量（0-1）
     */
    playTone(frequency, duration = 0.1, volume = 0.3) {
        if (!this.initialized || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
        
        console.log(`[SoundManager] Tone再生: ${frequency}Hz, ${duration}s`);
    }

    /**
     * インベーダー移動音（4音ループ）
     */
    playInvaderMove() {
        const freq = this.moveFrequencies[this.moveIndex];
        this.playTone(freq, 0.08, 0.2);
        this.moveIndex = (this.moveIndex + 1) % this.moveFrequencies.length;
    }

    /**
     * 自機発射音
     */
    playPlayerShoot() {
        if (!this.initialized || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.15);
        
        console.log('[SoundManager] 自機発射音再生');
    }

    /**
     * インベーダー撃破音
     */
    playInvaderHit() {
        if (!this.initialized || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
        
        console.log('[SoundManager] インベーダー撃破音再生');
    }

    /**
     * 自機被弾音（ホワイトノイズ爆発）
     */
    playPlayerHit() {
        if (!this.initialized || !this.audioContext) return;
        
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        noise.buffer = buffer;
        noise.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        noise.start(this.audioContext.currentTime);
        noise.stop(this.audioContext.currentTime + 0.5);
        
        console.log('[SoundManager] 自機被弾音（爆発）再生');
    }

    /**
     * UFO出現音（ピロピロ音）
     */
    playUFO() {
        if (!this.initialized || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 500;
        
        lfo.type = 'sine';
        lfo.frequency.value = 8;
        lfoGain.gain.value = 100;
        
        gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        
        lfo.start(this.audioContext.currentTime);
        oscillator.start(this.audioContext.currentTime);
        
        // UFOが画面を横切る間、音を続ける
        setTimeout(() => {
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            setTimeout(() => {
                oscillator.stop();
                lfo.stop();
            }, 100);
        }, 3000);
        
        console.log('[SoundManager] UFO出現音再生');
    }

    /**
     * UFO撃破音
     */
    playUFOHit() {
        if (!this.initialized || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
        
        console.log('[SoundManager] UFO撃破音再生');
    }

    /**
     * ゲームオーバー音
     */
    playGameOver() {
        if (!this.initialized || !this.audioContext) return;
        
        const notes = [400, 350, 300, 250, 200];
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, 0.3, 0.3);
            }, index * 200);
        });
        
        console.log('[SoundManager] ゲームオーバー音再生');
    }
}

// ============================================
// ゲームオブジェクトクラス
// ============================================

/**
 * インベーダークラス
 */
class Invader {
    constructor(x, y, row, col, type) {
        this.x = x;
        this.y = y;
        this.row = row;
        this.col = col;
        this.type = type; // 0-4 (上から順)
        this.width = GAME_CONFIG.INVADER_WIDTH;
        this.height = GAME_CONFIG.INVADER_HEIGHT;
        this.alive = true;
        this.animationFrame = 0;
        console.log(`[Invader] 作成: row=${row}, col=${col}, type=${type}`);
    }

    /**
     * インベーダーを描画
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (!this.alive) return;
        
        const color = GAME_CONFIG.INVADER_COLORS[this.type];
        ctx.fillStyle = color;
        
        // インベーダーの形状を描画（ピクセルアート風）
        const px = 4; // ピクセルサイズ
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        
        // 簡易インベーダー形状
        if (this.animationFrame === 0) {
            // フレーム0: 腕を上げた状態
            this.drawInvaderShape1(ctx, this.x, this.y, color);
        } else {
            // フレーム1: 腕を下げた状態
            this.drawInvaderShape2(ctx, this.x, this.y, color);
        }
    }

    drawInvaderShape1(ctx, x, y, color) {
        ctx.fillStyle = color;
        const px = 4;
        // 頭部
        ctx.fillRect(x + px * 4, y, px * 2, px);
        ctx.fillRect(x + px * 3, y + px, px * 4, px);
        // 目
        ctx.fillRect(x + px * 2, y + px * 2, px * 6, px);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + px * 3, y + px * 2, px, px);
        ctx.fillRect(x + px * 6, y + px * 2, px, px);
        // 体
        ctx.fillStyle = color;
        ctx.fillRect(x + px * 1, y + px * 3, px * 8, px);
        ctx.fillRect(x, y + px * 4, px * 10, px);
        // 足（上げ）
        ctx.fillRect(x, y + px * 5, px * 2, px * 2);
        ctx.fillRect(x + px * 3, y + px * 5, px * 4, px);
        ctx.fillRect(x + px * 8, y + px * 5, px * 2, px * 2);
    }

    drawInvaderShape2(ctx, x, y, color) {
        ctx.fillStyle = color;
        const px = 4;
        // 頭部
        ctx.fillRect(x + px * 4, y, px * 2, px);
        ctx.fillRect(x + px * 3, y + px, px * 4, px);
        // 目
        ctx.fillRect(x + px * 2, y + px * 2, px * 6, px);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + px * 3, y + px * 2, px, px);
        ctx.fillRect(x + px * 6, y + px * 2, px, px);
        // 体
        ctx.fillStyle = color;
        ctx.fillRect(x + px * 1, y + px * 3, px * 8, px);
        ctx.fillRect(x, y + px * 4, px * 10, px);
        // 足（下げ）
        ctx.fillRect(x + px * 1, y + px * 5, px * 2, px * 2);
        ctx.fillRect(x + px * 4, y + px * 5, px * 2, px);
        ctx.fillRect(x + px * 7, y + px * 5, px * 2, px * 2);
    }

    /**
     * アニメーションフレームを切り替え
     */
    toggleAnimation() {
        this.animationFrame = this.animationFrame === 0 ? 1 : 0;
    }
}

/**
 * 自機クラス
 */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.PLAYER_WIDTH;
        this.height = GAME_CONFIG.PLAYER_HEIGHT;
        this.speed = GAME_CONFIG.PLAYER_SPEED;
        this.canShoot = true;
        console.log(`[Player] 作成: x=${x}, y=${y}`);
    }

    /**
     * 自機を描画
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.fillStyle = '#00ff00';
        
        // 砲台の形状
        const px = 5;
        const x = this.x;
        const y = this.y;
        
        // 砲身
        ctx.fillRect(x + this.width / 2 - px / 2, y, px, px * 2);
        // 本体上部
        ctx.fillRect(x + this.width / 2 - px * 2, y + px * 2, px * 4, px);
        // 本体中央
        ctx.fillRect(x + px, y + px * 3, this.width - px * 2, px * 2);
        // 本体下部（キャタピラ）
        ctx.fillRect(x, y + px * 5, this.width, px);
    }

    /**
     * 左へ移動
     * @param {number} deltaTime 
     */
    moveLeft(deltaTime) {
        this.x -= this.speed * deltaTime;
        if (this.x < 0) {
            this.x = 0;
        }
    }

    /**
     * 右へ移動
     * @param {number} deltaTime 
     * @param {number} canvasWidth 
     */
    moveRight(deltaTime, canvasWidth) {
        this.x += this.speed * deltaTime;
        if (this.x + this.width > canvasWidth) {
            this.x = canvasWidth - this.width;
        }
    }
}

/**
 * 弾クラス
 */
class Bullet {
    constructor(x, y, velocityY, isPlayerBullet = true) {
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.BULLET_WIDTH;
        this.height = GAME_CONFIG.BULLET_HEIGHT;
        this.velocityY = velocityY;
        this.isPlayerBullet = isPlayerBullet;
        this.active = true;
        console.log(`[Bullet] 作成: x=${x}, y=${y}, player=${isPlayerBullet}`);
    }

    /**
     * 弾を更新
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        this.y += this.velocityY * deltaTime;
    }

    /**
     * 弾を描画
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (!this.active) return;
        
        if (this.isPlayerBullet) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = '#ff6600';
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

/**
 * バリアクラス
 */
class Barrier {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.BARRIER_WIDTH;
        this.height = GAME_CONFIG.BARRIER_HEIGHT;
        this.health = GAME_CONFIG.BARRIER_HEALTH;
        this.maxHealth = GAME_CONFIG.BARRIER_HEALTH;
        // バリアのピクセルマップ（ダメージ表現用）
        this.pixelSize = 4;
        this.cols = Math.floor(this.width / this.pixelSize);
        this.rows = Math.floor(this.height / this.pixelSize);
        this.pixels = [];
        this.initPixels();
        console.log(`[Barrier] 作成: x=${x}, y=${y}`);
    }

    /**
     * ピクセルマップを初期化
     */
    initPixels() {
        for (let row = 0; row < this.rows; row++) {
            this.pixels[row] = [];
            for (let col = 0; col < this.cols; col++) {
                // バリアの形状（上部が丸みを帯びた形）
                const centerX = this.cols / 2;
                const distFromCenter = Math.abs(col - centerX);
                const threshold = (this.cols / 2) * (1 - row / (this.rows * 2));
                
                if (row < this.rows / 3) {
                    // 上部は丸みを帯びる
                    this.pixels[row][col] = distFromCenter < threshold + 2;
                } else {
                    // 下部は四角
                    this.pixels[row][col] = true;
                }
            }
        }
    }

    /**
     * バリアを描画
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const healthRatio = this.health / this.maxHealth;
        const green = Math.floor(255 * healthRatio);
        ctx.fillStyle = `rgb(0, ${green}, 0)`;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.pixels[row][col]) {
                    ctx.fillRect(
                        this.x + col * this.pixelSize,
                        this.y + row * this.pixelSize,
                        this.pixelSize,
                        this.pixelSize
                    );
                }
            }
        }
    }

    /**
     * ダメージを受ける
     * @param {number} hitX 
     * @param {number} hitY 
     */
    takeDamage(hitX, hitY) {
        this.health--;
        console.log(`[Barrier] ダメージ: 残りHP=${this.health}`);
        
        // 被弾位置周辺のピクセルを削除
        const col = Math.floor((hitX - this.x) / this.pixelSize);
        const row = Math.floor((hitY - this.y) / this.pixelSize);
        
        // 3x3の範囲でピクセルを削除
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = col - 1; c <= col + 1; c++) {
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                    if (Math.random() > 0.3) { // ランダムに削除
                        this.pixels[r][c] = false;
                    }
                }
            }
        }
        
        return this.health <= 0;
    }

    /**
     * 衝突判定
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     */
    checkCollision(x, y, w, h) {
        if (x + w < this.x || x > this.x + this.width) return false;
        if (y + h < this.y || y > this.y + this.height) return false;
        
        // ピクセルレベルでの判定
        const col = Math.floor((x + w / 2 - this.x) / this.pixelSize);
        const row = Math.floor((y + h / 2 - this.y) / this.pixelSize);
        
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            return this.pixels[row][col];
        }
        return false;
    }
}

/**
 * UFOクラス
 */
class UFO {
    constructor(direction) {
        this.width = GAME_CONFIG.UFO_WIDTH;
        this.height = GAME_CONFIG.UFO_HEIGHT;
        this.speed = GAME_CONFIG.UFO_SPEED;
        this.direction = direction; // 1: 左から右, -1: 右から左
        this.x = direction === 1 ? -this.width : GAME_CONFIG.CANVAS_WIDTH;
        this.y = 30;
        this.active = true;
        this.score = GAME_CONFIG.UFO_SCORE;
        console.log(`[UFO] 出現: direction=${direction}`);
    }

    /**
     * UFOを更新
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        this.x += this.speed * this.direction * deltaTime;
        
        // 画面外に出たら非アクティブ化
        if (this.direction === 1 && this.x > GAME_CONFIG.CANVAS_WIDTH) {
            this.active = false;
            console.log('[UFO] 画面外へ退出');
        } else if (this.direction === -1 && this.x + this.width < 0) {
            this.active = false;
            console.log('[UFO] 画面外へ退出');
        }
    }

    /**
     * UFOを描画
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (!this.active) return;
        
        ctx.fillStyle = '#ff00ff';
        const px = 4;
        const x = this.x;
        const y = this.y;
        
        // UFOの形状
        ctx.fillRect(x + px * 4, y, px * 4, px);
        ctx.fillRect(x + px * 2, y + px, px * 8, px);
        ctx.fillRect(x, y + px * 2, px * 12, px);
        ctx.fillRect(x + px * 2, y + px * 3, px * 2, px);
        ctx.fillRect(x + px * 8, y + px * 3, px * 2, px);
    }
}

// ============================================
// メインゲームクラス
// ============================================
class Game {
    constructor() {
        console.log('[Game] 初期化開始');
        
        // キャンバス設定
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // ゲーム状態
        this.gameState = 'waiting'; // waiting, playing, paused, gameover, hit, stageclear
        this.score = 0;
        this.hiScore = this.loadHiScore();
        this.level = 1;
        this.lives = GAME_CONFIG.INITIAL_LIVES;
        
        // ゲームオブジェクト
        this.invaders = [];
        this.player = null;
        this.playerBullet = null;
        this.enemyBullets = [];
        this.barriers = [];
        this.ufo = null;
        
        // インベーダー移動制御
        this.invaderDirection = 1; // 1: 右, -1: 左
        this.invaderMoveTimer = 0;
        this.invaderMoveInterval = 1000; // ミリ秒（サウンド再生間隔の基準）
        this.invaderSubTick = 0; // サブティック（4回の移動で1音）
        this.INVADER_SUB_TICKS = 4; // 1音あたりの移動回数
        
        // UFOタイマー
        this.ufoTimer = 0;
        this.ufoSpawned = false;
        
        // 入力状態
        this.keys = {
            left: false,
            right: false,
            space: false
        };
        
        // タイミング
        this.lastTime = 0;
        this.enemyShootTimer = 0;
        this.enemyShootInterval = 2000; // ミリ秒
        
        // サウンド
        this.sound = new SoundManager();
        
        // UI要素
        this.scoreElement = document.getElementById('score');
        this.hiScoreElement = document.getElementById('hi-score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        this.gameOverPopup = document.getElementById('game-over-popup');
        this.hitPopup = document.getElementById('hit-popup');
        this.stageClearPopup = document.getElementById('stage-clear-popup');
        this.startMessage = document.getElementById('start-message');
        this.hitOverlay = document.getElementById('hit-overlay');
        
        // 初期化
        this.setupCanvas();
        this.setupEventListeners();
        this.updateUI();
        
        console.log('[Game] 初期化完了');
    }

    /**
     * キャンバスをセットアップ
     */
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        console.log('[Game] キャンバスセットアップ完了');
    }

    /**
     * キャンバスをリサイズ（ビューポートの約75%相当）
     * 砲台やUI要素が画面内に収まるようにスケーリングを調整
     */
    resizeCanvas() {
        const container = document.getElementById('game-container');
        const maxWidth = window.innerWidth * 0.7;
        const maxHeight = window.innerHeight * 0.6;
        
        const aspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT;
        
        let width = maxWidth;
        let height = width / aspectRatio;
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
        
        this.scale = width / GAME_CONFIG.CANVAS_WIDTH;
        
        console.log(`[Game] キャンバスリサイズ: ${width}x${height}, scale=${this.scale.toFixed(2)}`);
    }

    /**
     * イベントリスナーをセットアップ
     */
    setupEventListeners() {
        // キーボードイベント
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // ボタンイベント
        document.getElementById('start-btn').addEventListener('click', () => {
            this.sound.init();
            this.startGame();
        });
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('popup-reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('continue-btn').addEventListener('click', () => this.continueAfterHit());
        document.getElementById('next-stage-btn').addEventListener('click', () => this.nextStage());
        
        console.log('[Game] イベントリスナーセットアップ完了');
    }

    /**
     * キー押下ハンドラ
     * @param {KeyboardEvent} e 
     */
    handleKeyDown(e) {
        console.log(`[Game] キー押下: ${e.code}`);
        
        switch (e.code) {
            case 'ArrowLeft':
                this.keys.left = true;
                e.preventDefault();
                break;
            case 'ArrowRight':
                this.keys.right = true;
                e.preventDefault();
                break;
            case 'Space':
                if (this.gameState === 'playing' && !this.keys.space) {
                    this.shoot();
                }
                this.keys.space = true;
                e.preventDefault();
                break;
            case 'KeyS':
                this.sound.init();
                this.startGame();
                e.preventDefault();
                break;
            case 'KeyP':
                this.togglePause();
                e.preventDefault();
                break;
            case 'KeyR':
                this.resetGame();
                e.preventDefault();
                break;
        }
    }

    /**
     * キー解放ハンドラ
     * @param {KeyboardEvent} e 
     */
    handleKeyUp(e) {
        switch (e.code) {
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.space = false;
                break;
        }
    }

    /**
     * ゲームを開始
     */
    startGame() {
        if (this.gameState === 'playing') return;
        
        console.log('[Game] ゲーム開始');
        this.gameState = 'playing';
        this.startMessage.classList.add('hidden');
        this.gameOverPopup.classList.add('hidden');
        
        if (this.invaders.length === 0) {
            this.initGameObjects();
        }
        
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * ゲームオブジェクトを初期化
     */
    initGameObjects() {
        console.log('[Game] ゲームオブジェクト初期化');
        
        // インベーダー
        this.invaders = [];
        for (let row = 0; row < GAME_CONFIG.INVADER_ROWS; row++) {
            for (let col = 0; col < GAME_CONFIG.INVADER_COLS; col++) {
                const x = col * (GAME_CONFIG.INVADER_WIDTH + GAME_CONFIG.INVADER_PADDING) + 50;
                const y = row * (GAME_CONFIG.INVADER_HEIGHT + GAME_CONFIG.INVADER_PADDING) + GAME_CONFIG.INVADER_TOP_OFFSET;
                this.invaders.push(new Invader(x, y, row, col, row));
            }
        }
        
        // 自機
        this.player = new Player(
            GAME_CONFIG.CANVAS_WIDTH / 2 - GAME_CONFIG.PLAYER_WIDTH / 2,
            GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PLAYER_HEIGHT - GAME_CONFIG.PLAYER_BOTTOM_MARGIN
        );
        
        // バリア
        this.barriers = [];
        const barrierSpacing = GAME_CONFIG.CANVAS_WIDTH / (GAME_CONFIG.BARRIER_COUNT + 1);
        for (let i = 0; i < GAME_CONFIG.BARRIER_COUNT; i++) {
            const x = barrierSpacing * (i + 1) - GAME_CONFIG.BARRIER_WIDTH / 2;
            const y = GAME_CONFIG.CANVAS_HEIGHT - 150;
            this.barriers.push(new Barrier(x, y));
        }
        
        // 弾のリセット
        this.playerBullet = null;
        this.enemyBullets = [];
        
        // UFOリセット
        this.ufo = null;
        this.ufoTimer = 0;
        this.ufoSpawned = false;
        
        // 移動制御リセット
        this.invaderDirection = 1;
        this.invaderMoveTimer = 0;
        this.invaderSubTick = 0;
        this.calculateInvaderSpeed();
        
        console.log(`[Game] 初期化完了: インベーダー=${this.invaders.length}, バリア=${this.barriers.length}`);
    }

    /**
     * インベーダーの移動速度を計算
     */
    calculateInvaderSpeed() {
        const aliveCount = this.invaders.filter(inv => inv.alive).length;
        const totalCount = GAME_CONFIG.INVADER_ROWS * GAME_CONFIG.INVADER_COLS;
        
        // 残りインベーダー数に応じて指数的に速度上昇
        const speedMultiplier = 1 + (1 - aliveCount / totalCount) * (GAME_CONFIG.MAX_SPEED_MULTIPLIER - 1);
        this.invaderMoveInterval = 1000 / speedMultiplier;
        
        console.log(`[Game] インベーダー速度更新: 残り=${aliveCount}, 間隔=${this.invaderMoveInterval.toFixed(0)}ms`);
    }

    /**
     * 一時停止を切り替え
     */
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            console.log('[Game] 一時停止');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.lastTime = performance.now();
            requestAnimationFrame((time) => this.gameLoop(time));
            console.log('[Game] 再開');
        }
    }

    /**
     * ゲームをリセット
     */
    resetGame() {
        console.log('[Game] ゲームリセット');
        
        this.gameState = 'waiting';
        this.score = 0;
        this.level = 1;
        this.lives = GAME_CONFIG.INITIAL_LIVES;
        
        this.invaders = [];
        this.player = null;
        this.playerBullet = null;
        this.enemyBullets = [];
        this.barriers = [];
        this.ufo = null;
        
        this.gameOverPopup.classList.add('hidden');
        this.hitPopup.classList.add('hidden');
        this.stageClearPopup.classList.add('hidden');
        this.startMessage.classList.remove('hidden');
        
        this.updateUI();
        this.draw();
    }

    /**
     * 被弾後に続行
     */
    continueAfterHit() {
        console.log('[Game] 被弾後続行');
        
        this.lives--;
        this.hitPopup.classList.add('hidden');
        
        if (this.lives <= 0) {
            this.gameOver();
            return;
        }
        
        // 自機をリセット
        this.player = new Player(
            GAME_CONFIG.CANVAS_WIDTH / 2 - GAME_CONFIG.PLAYER_WIDTH / 2,
            GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PLAYER_HEIGHT - GAME_CONFIG.PLAYER_BOTTOM_MARGIN
        );
        
        // 弾をクリア
        this.playerBullet = null;
        this.enemyBullets = [];
        
        this.updateUI();
        this.gameState = 'playing';
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * 次のステージへ
     */
    nextStage() {
        console.log(`[Game] ステージ${this.level + 1}へ`);
        
        this.level++;
        this.stageClearPopup.classList.add('hidden');
        
        // 難易度調整
        this.enemyShootInterval = Math.max(500, 2000 - (this.level - 1) * 200);
        
        this.initGameObjects();
        this.updateUI();
        this.gameState = 'playing';
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * 弾を発射
     */
    shoot() {
        if (this.playerBullet !== null) return;
        
        this.playerBullet = new Bullet(
            this.player.x + this.player.width / 2 - GAME_CONFIG.BULLET_WIDTH / 2,
            this.player.y,
            -GAME_CONFIG.PLAYER_BULLET_SPEED,
            true
        );
        
        this.sound.playPlayerShoot();
        console.log('[Game] 自機弾発射');
    }

    /**
     * 敵が弾を発射
     */
    enemyShoot() {
        const aliveInvaders = this.invaders.filter(inv => inv.alive);
        if (aliveInvaders.length === 0) return;
        
        // レベルに応じて発射する敵の数を決定
        const shootCount = Math.min(this.level, Math.ceil(aliveInvaders.length / GAME_CONFIG.ENEMY_SHOOT_DIVISOR));
        
        for (let i = 0; i < shootCount; i++) {
            const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
            
            this.enemyBullets.push(new Bullet(
                shooter.x + shooter.width / 2 - GAME_CONFIG.BULLET_WIDTH / 2,
                shooter.y + shooter.height,
                GAME_CONFIG.ENEMY_BULLET_SPEED,
                false
            ));
        }
        
        console.log(`[Game] 敵弾発射: ${shootCount}発`);
    }

    /**
     * UFOを出現させる
     */
    spawnUFO() {
        if (this.ufo !== null && this.ufo.active) return;
        
        const direction = Math.random() > 0.5 ? 1 : -1;
        this.ufo = new UFO(direction);
        this.sound.playUFO();
        console.log('[Game] UFO出現');
    }

    /**
     * ゲームオーバー処理
     */
    gameOver() {
        console.log('[Game] ゲームオーバー');
        
        this.gameState = 'gameover';
        this.sound.playGameOver();
        
        // ハイスコア更新
        if (this.score > this.hiScore) {
            this.hiScore = this.score;
            this.saveHiScore();
        }
        
        // ポップアップ表示
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-hi-score').textContent = this.hiScore;
        this.gameOverPopup.classList.remove('hidden');
    }

    /**
     * ステージクリア処理
     */
    stageClear() {
        console.log('[Game] ステージクリア');
        
        this.gameState = 'stageclear';
        document.getElementById('next-level').textContent = this.level + 1;
        this.stageClearPopup.classList.remove('hidden');
    }

    /**
     * 自機被弾処理
     */
    playerHit() {
        console.log('[Game] 自機被弾');
        
        this.gameState = 'hit';
        this.sound.playPlayerHit();
        
        // 赤い演出
        this.hitOverlay.classList.add('active');
        this.hitOverlay.style.opacity = '0.8';
        
        setTimeout(() => {
            this.hitOverlay.style.opacity = '0';
            this.hitOverlay.classList.remove('active');
        }, 500);
        
        // ポップアップ表示
        document.getElementById('remaining-lives').textContent = this.lives - 1;
        this.hitPopup.classList.remove('hidden');
    }

    /**
     * ゲームループ
     * @param {number} currentTime 
     */
    gameLoop(currentTime) {
        if (this.gameState !== 'playing') {
            this.draw();
            return;
        }
        
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * ゲーム状態を更新
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        // 自機移動
        if (this.keys.left) {
            this.player.moveLeft(deltaTime);
        }
        if (this.keys.right) {
            this.player.moveRight(deltaTime, GAME_CONFIG.CANVAS_WIDTH);
        }
        
        // インベーダー移動（サブティックシステム: 4回移動で1音）
        this.invaderMoveTimer += deltaTime * 1000;
        // 移動間隔を1/4にして細かく移動
        const subTickInterval = this.invaderMoveInterval / this.INVADER_SUB_TICKS;
        if (this.invaderMoveTimer >= subTickInterval) {
            this.moveInvaders();
            this.invaderMoveTimer = 0;
        }
        
        // 弾の更新
        this.updateBullets(deltaTime);
        
        // 衝突判定
        this.checkCollisions();
        
        // 敵の発射
        this.enemyShootTimer += deltaTime * 1000;
        if (this.enemyShootTimer >= this.enemyShootInterval) {
            this.enemyShoot();
            this.enemyShootTimer = 0;
        }
        
        // UFO
        this.ufoTimer += deltaTime * 1000;
        if (this.ufoTimer >= GAME_CONFIG.UFO_SPAWN_INTERVAL && !this.ufoSpawned) {
            this.spawnUFO();
            this.ufoSpawned = true;
        }
        
        if (this.ufo && this.ufo.active) {
            this.ufo.update(deltaTime);
        } else if (!this.ufo || !this.ufo.active) {
            if (this.ufoSpawned) {
                this.ufoTimer = 0;
                this.ufoSpawned = false;
            }
        }
        
        // ステージクリアチェック
        const aliveCount = this.invaders.filter(inv => inv.alive).length;
        if (aliveCount === 0) {
            this.stageClear();
        }
    }

    /**
     * インベーダーを移動
     * サブティックシステム: 4回の移動で1音を鳴らし、各移動は1/4の距離
     */
    moveInvaders() {
        const aliveInvaders = this.invaders.filter(inv => inv.alive);
        if (aliveInvaders.length === 0) return;
        
        // サブティックをインクリメント
        this.invaderSubTick++;
        
        // 4回目のサブティックで音を鳴らしてアニメーションを切り替え
        const shouldPlaySound = this.invaderSubTick >= this.INVADER_SUB_TICKS;
        if (shouldPlaySound) {
            this.invaderSubTick = 0;
            this.sound.playInvaderMove();
            // 4回に1回アニメーションを切り替え（元のタイミングを維持）
            for (const inv of aliveInvaders) {
                inv.toggleAnimation();
            }
        }
        
        // 端に到達したかチェック
        let hitEdge = false;
        for (const inv of aliveInvaders) {
            if (this.invaderDirection === 1 && inv.x + inv.width >= GAME_CONFIG.CANVAS_WIDTH - 10) {
                hitEdge = true;
                break;
            }
            if (this.invaderDirection === -1 && inv.x <= 10) {
                hitEdge = true;
                break;
            }
        }
        
        if (hitEdge) {
            // 一段下がって方向転換（サブティック分割により1/4の距離で4回移動 = 元の落下距離を維持）
            for (const inv of aliveInvaders) {
                inv.y += GAME_CONFIG.INVADER_DROP_DISTANCE / this.INVADER_SUB_TICKS;
            }
            this.invaderDirection *= -1;
            
            // 画面下部到達チェック
            for (const inv of aliveInvaders) {
                if (inv.y + inv.height >= this.player.y) {
                    this.gameOver();
                    return;
                }
            }
        } else {
            // 横移動（移動量を1/4にしてスムーズな動きに）
            const baseMove = GAME_CONFIG.INVADER_BASE_SPEED * (1000 / this.invaderMoveInterval) * 0.5;
            const moveAmount = baseMove / this.INVADER_SUB_TICKS;
            for (const inv of aliveInvaders) {
                inv.x += moveAmount * this.invaderDirection;
            }
        }
    }

    /**
     * 弾を更新
     * @param {number} deltaTime 
     */
    updateBullets(deltaTime) {
        // 自機弾
        if (this.playerBullet) {
            this.playerBullet.update(deltaTime);
            
            // 画面外判定
            if (this.playerBullet.y + this.playerBullet.height < 0) {
                this.playerBullet = null;
                console.log('[Game] 自機弾が画面外へ');
            }
        }
        
        // 敵弾
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.update(deltaTime);
            
            if (bullet.y > GAME_CONFIG.CANVAS_HEIGHT) {
                this.enemyBullets.splice(i, 1);
            }
        }
    }

    /**
     * 衝突判定
     */
    checkCollisions() {
        // 自機弾とインベーダー
        if (this.playerBullet) {
            // 当たり判定拡大マージン
            const hitboxMargin = GAME_CONFIG.INVADER_HITBOX_MARGIN;
            
            for (const inv of this.invaders) {
                if (!inv.alive) continue;
                
                // インベーダーの当たり判定を拡大（マージン分だけ大きくする）
                if (this.checkRectCollision(
                    this.playerBullet.x, this.playerBullet.y,
                    this.playerBullet.width, this.playerBullet.height,
                    inv.x - hitboxMargin, inv.y - hitboxMargin,
                    inv.width + hitboxMargin * 2, inv.height + hitboxMargin * 2
                )) {
                    inv.alive = false;
                    this.playerBullet = null;
                    this.score += GAME_CONFIG.INVADER_SCORES[inv.type];
                    this.calculateInvaderSpeed();
                    this.sound.playInvaderHit();
                    this.updateUI();
                    console.log(`[Game] インベーダー撃破: type=${inv.type}, score=${GAME_CONFIG.INVADER_SCORES[inv.type]}`);
                    break;
                }
            }
        }
        
        // 自機弾とUFO
        if (this.playerBullet && this.ufo && this.ufo.active) {
            if (this.checkRectCollision(
                this.playerBullet.x, this.playerBullet.y,
                this.playerBullet.width, this.playerBullet.height,
                this.ufo.x, this.ufo.y, this.ufo.width, this.ufo.height
            )) {
                this.ufo.active = false;
                this.playerBullet = null;
                this.score += this.ufo.score;
                this.sound.playUFOHit();
                this.updateUI();
                console.log(`[Game] UFO撃破: score=${this.ufo.score}`);
            }
        }
        
        // 自機弾とバリア
        if (this.playerBullet) {
            for (const barrier of this.barriers) {
                if (barrier.health <= 0) continue;
                
                if (barrier.checkCollision(
                    this.playerBullet.x, this.playerBullet.y,
                    this.playerBullet.width, this.playerBullet.height
                )) {
                    barrier.takeDamage(this.playerBullet.x, this.playerBullet.y);
                    this.playerBullet = null;
                    console.log('[Game] 自機弾がバリアに命中');
                    break;
                }
            }
        }
        
        // 敵弾と自機
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            
            if (this.checkRectCollision(
                bullet.x, bullet.y, bullet.width, bullet.height,
                this.player.x, this.player.y, this.player.width, this.player.height
            )) {
                this.enemyBullets.splice(i, 1);
                this.playerHit();
                return;
            }
        }
        
        // 敵弾とバリア
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            let hit = false;
            
            for (const barrier of this.barriers) {
                if (barrier.health <= 0) continue;
                
                if (barrier.checkCollision(
                    bullet.x, bullet.y, bullet.width, bullet.height
                )) {
                    barrier.takeDamage(bullet.x, bullet.y);
                    hit = true;
                    console.log('[Game] 敵弾がバリアに命中');
                    break;
                }
            }
            
            if (hit) {
                this.enemyBullets.splice(i, 1);
            }
        }
        
        // インベーダーとバリア
        for (const inv of this.invaders) {
            if (!inv.alive) continue;
            
            for (const barrier of this.barriers) {
                if (barrier.health <= 0) continue;
                
                if (this.checkRectCollision(
                    inv.x, inv.y, inv.width, inv.height,
                    barrier.x, barrier.y, barrier.width, barrier.height
                )) {
                    barrier.health = 0;
                    console.log('[Game] インベーダーがバリアを破壊');
                }
            }
        }
    }

    /**
     * 矩形同士の衝突判定
     */
    checkRectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    /**
     * 画面を描画
     */
    draw() {
        // 背景クリア
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        // バリア描画
        for (const barrier of this.barriers) {
            if (barrier.health > 0) {
                barrier.draw(this.ctx);
            }
        }
        
        // インベーダー描画
        for (const inv of this.invaders) {
            inv.draw(this.ctx);
        }
        
        // 自機描画
        if (this.player) {
            this.player.draw(this.ctx);
        }
        
        // 弾描画
        if (this.playerBullet) {
            this.playerBullet.draw(this.ctx);
        }
        
        for (const bullet of this.enemyBullets) {
            bullet.draw(this.ctx);
        }
        
        // UFO描画
        if (this.ufo && this.ufo.active) {
            this.ufo.draw(this.ctx);
        }
    }

    /**
     * UIを更新
     */
    updateUI() {
        this.scoreElement.textContent = this.score;
        this.hiScoreElement.textContent = this.hiScore;
        this.levelElement.textContent = this.level;
        
        // 残機表示
        this.livesElement.innerHTML = '';
        for (let i = 0; i < this.lives; i++) {
            const life = document.createElement('span');
            life.className = 'life';
            life.textContent = '▲';
            this.livesElement.appendChild(life);
        }
    }

    /**
     * ハイスコアをロード
     */
    loadHiScore() {
        const saved = localStorage.getItem('spaceInvadersHiScore');
        const score = saved ? parseInt(saved, 10) : 0;
        console.log(`[Game] ハイスコアロード: ${score}`);
        return score;
    }

    /**
     * ハイスコアを保存
     */
    saveHiScore() {
        localStorage.setItem('spaceInvadersHiScore', this.hiScore.toString());
        console.log(`[Game] ハイスコア保存: ${this.hiScore}`);
    }
}

// ============================================
// ゲーム起動
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Main] DOM読み込み完了、ゲーム初期化');
    const game = new Game();
    
    // 初回描画
    game.draw();
});
