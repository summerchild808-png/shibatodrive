// ===============================
//  忠犬しばとのお迎え大作戦（横画面・PNG統一版）
//  game.js  Part 1 (前半)
// ===============================

// --- Canvas 初期化 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 画像素材のロード（PNG統一版） ---
const images = {};
const imageSources = {
  bgSky: 'bg_sky.png',
  bgNightSky: 'bg_night_sky.png',
  bgTown: 'bg_town.png',
  bgPark: 'bg_park.png',
  bgYatai: 'bg_yatai.png',
  bgTower: 'bg_tower.png',

  monsterMentaiko: 'monster_mentaiko.png',
  monsterMomijigon: 'monster_momijigon.png',
  monsterTakoyaki: 'monster_takoyaki.png',

  bgHiroshima: 'bg_hiroshima.png',
  bgDotonbori: 'bg_dotonbori.png',
  bgTsutenkaku: 'bg_tsutenkaku.png',
  bgNagoyaCastle: 'bg_nagoya_castle.png',

  bgHighwayMiyajima: 'bg_highway_miyajima.png',
  bgHighwayFukuyama: 'bg_highway_fukuyama.png',
  bgHighwayMiki: 'bg_highway_miki.png',

  road: 'road.png',

  titleCard: 'title_card.png',
  openingStory: 'opening_story.png',

  endCardFukuoka: 'end_card_fukuoka.png',
  endCardOsaka: 'end_card_osaka.png',
  endCardHighway: 'end_card_highway.png',

  playerDrive: 'player.png',
  playerJumpPrep: 'player_jump_prep.png',
  playerJump: 'player_jump.png',
  playerLand: 'player_land.png',

  hitchhiker: 'hitchihiker.png',
  mechanic: 'mechanic.png',
  truck: 'obstacle_truck.png',
  manhole: 'obstacle_manhole.png',

  heart: 'ui_heart.png',
  bone: 'ui_bone_coin.png',
  selectRoute: 'select_route.png',

  obstacleOrbis: 'obstacle_orbis.png',
  patrolCar: 'patrol_car.png',
  uiPedal: 'ui_pedal.png',

  carSedan: 'car_sedan.png',
  carMinivan: 'car_minivan.png',
  carTruck: 'car_truck.png'
};

let loadedCount = 0;
const totalImages = Object.keys(imageSources).length;
let isGameStarted = false;

// --- 画像読み込み ---
for (let key in imageSources) {
  images[key] = new Image();
  images[key].src = imageSources[key];
  images[key].onload = () => {
    loadedCount++;
    if (loadedCount >= totalImages && !isGameStarted) {
      isGameStarted = true;
      init();
    }
  };
  images[key].onerror = () => {
    console.warn(`画像読み込み失敗: ${imageSources[key]}`);
    loadedCount++;
    if (loadedCount >= totalImages && !isGameStarted) {
      isGameStarted = true;
      init();
    }
  };
}

// ===============================
//  ゲーム変数
// ===============================
let gameState = 'TITLE';
let currentStage = 1;

let isPaused = false;
let isInvincible = false;

let gameSpeed = 5.2;
let scoreMoney = 0;
let life = 3;

let currentDistance = 0;
const TOTAL_STAGE_DISTANCE = 12.0;
const HIGHWAY_STAGE_DISTANCE = 20.0;

let towerX = -200;
let towerPassed = false;
let bgMonsterX = -300;

let skyX = 0;
let townX = 0;
let nightAlpha = 0;

let endCardTimer = 0;
const END_CARD_DELAY = 120;

let tutorialTimer = 0;
const TUTORIAL_DURATION = 240;

let showHighwayTutorial = false;
let pedalHighlightTimer = 0;

let speedKmh = 80;
let isAccelerating = false;
let patrolCarX = -300;
let orbisWarningTimer = 0;

let roadDashOffset = 0;

// 🛣️ 車線位置の調整（奥車線 0: 330 でしっかり持ち上げ）
const LANES = { 0: 330, 1: 395 };

// --- プレイヤー ---
const player = {
  baseX: 100,
  x: 100,
  lane: 1,
  y: LANES[1],
  targetY: LANES[1],
  width: 95,
  height: 48,
  vy: 0,
  gravity: 0.38,
  jumpPower: -18.0,
  isGrounded: true,
  state: 'DRIVE',
  stateTimer: 0
};

let objects = [];
let popups = [];
let spawnTimer = 0;
let lastSpawnLane = -1;

// --- セーブデータ ---
const SAVE_KEY = 'shibato_save_data';

function saveGame() {
  const saveData = { stage: currentStage, money: scoreMoney };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

function loadGameData() {
  const data = localStorage.getItem(SAVE_KEY);
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

function clearSaveData() {
  localStorage.removeItem(SAVE_KEY);
}

// ===============================
//  init() — 入力処理・イベント登録
// ===============================
function init() {
  const container = document.getElementById('gameContainer');

  window.addEventListener('contextmenu', e => e.preventDefault());

  function processInputStart(canvasX, canvasY, buttonNum = 0) {
    if ((gameState === 'PLAYING' || gameState === 'PLAYING_HIGHWAY') &&
        canvasX >= 740 && canvasX <= 810 &&
        canvasY >= 5 && canvasY <= 65) {
      isPaused = !isPaused;
      return;
    }

    if (isPaused) return;

    if (gameState === 'TITLE') {
      const saveData = loadGameData();
      if (saveData) {
        if (canvasX < canvas.width / 2) {
          clearSaveData();
          scoreMoney = 0;
          currentStage = 1;
          gameState = 'STORY';
        } else {
          currentStage = saveData.stage;
          scoreMoney = saveData.money;
          gameState = 'SELECT_ROUTE';
        }
      } else {
        scoreMoney = 0;
        currentStage = 1;
        gameState = 'STORY';
      }
      return;
    }

    if (gameState === 'STORY') {
      resetStage(1);
      gameState = 'PLAYING';
      return;
    }

    if (gameState === 'STAGE_CLEAR' && endCardTimer >= END_CARD_DELAY) {
      saveGame();
      gameState = 'SELECT_ROUTE';
      return;
    }

    if (gameState === 'SELECT_ROUTE') {
      if (buttonNum === 2) {
        selectShitadaRoute();
      } else {
        if (canvasX > canvas.width / 2) selectKosokuRoute();
        else selectShitadaRoute();
      }
      return;
    }

    if (gameState === 'PLAYING') {
      if (canvasX > 740 && canvasY > 260) {
        handleAction();
      } else if (canvasX <= 160 && canvasY >= 260 && canvasY < 355) {
        moveLane(-1);
      } else if (canvasX <= 160 && canvasY >= 355) {
        moveLane(1);
      }
      return;
    }

    if (gameState === 'PLAYING_HIGHWAY') {
      if (showHighwayTutorial) {
        if (canvasX >= 300 && canvasX <= 660 &&
            canvasY >= 310 && canvasY <= 380) {
          showHighwayTutorial = false;
          pedalHighlightTimer = 180;
        }
        return;
      }

      if (canvasX > 740 && canvasY > 260) {
        isAccelerating = true;
        pedalHighlightTimer = 0;
      } else if (canvasX <= 160 && canvasY >= 260 && canvasY < 355) {
        moveLane(-1);
      } else if (canvasX <= 160 && canvasY >= 355) {
        moveLane(1);
      }
      return;
    }

    if (gameState === 'GAMEOVER') {
      if (currentStage === 99) {
        resetHighway();
        gameState = 'PLAYING_HIGHWAY';
      } else {
        resetStage(currentStage);
        gameState = 'PLAYING';
      }
      return;
    }
  }

  function processInputEnd() {
    isAccelerating = false;
  }

  container.addEventListener('touchstart', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (let t of e.touches) {
      const x = (t.clientX - rect.left) * (canvas.width / rect.width);
      const y = (t.clientY - rect.top) * (canvas.height / rect.height);
      processInputStart(x, y);
    }
  }, { passive: false });

  container.addEventListener('touchend', e => {
    e.preventDefault();
    processInputEnd();
  }, { passive: false });

  container.addEventListener('mousedown', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    processInputStart(x, y, e.button);
  });

  container.addEventListener('mouseup', e => {
    e.preventDefault();
    processInputEnd();
  });

  document.addEventListener('keydown', e => {
    if (e.code === 'KeyP') { isPaused = !isPaused; return; }
    if (e.code === 'KeyM') {
      isInvincible = !isInvincible;
      addPopup(isInvincible ? '🛡️ 無敵モード ON' : '⚔️ 通常モード ON', '#00FF7F', canvas.width / 2, 200);
      return;
    }

    if (e.code === 'Digit1') { resetStage(1); gameState = 'PLAYING'; }
    else if (e.code === 'Digit2') { resetStage(2); gameState = 'PLAYING'; }
    else if (e.code === 'Digit3') { resetStage(3); gameState = 'PLAYING'; }
    else if (e.code === 'Digit9') { resetHighway(); gameState = 'PLAYING_HIGHWAY'; }
    else if (e.code === 'Digit0') { gameState = 'SELECT_ROUTE'; }

    if (isPaused) return;

    if (gameState === 'SELECT_ROUTE') {
      if (e.code === 'KeyB') selectKosokuRoute();
      return;
    }

    if (gameState === 'PLAYING_HIGHWAY' && showHighwayTutorial) {
      if (e.code === 'Space' || e.code === 'Enter') {
        showHighwayTutorial = false;
        pedalHighlightTimer = 180;
      }
      return;
    }

    if (e.code === 'ArrowUp' || e.code === 'KeyW') moveLane(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') moveLane(1);
    else if (e.code === 'Space') {
      if (gameState === 'PLAYING') handleAction();
    } else if (e.code === 'KeyShift' || e.code === 'KeyD') {
      isAccelerating = true;
    }
  });

  document.addEventListener('keyup', e => {
    if (e.code === 'KeyShift' || e.code === 'KeyD') {
      isAccelerating = false;
    }
  });

  gameLoop();
}

function moveLane(dir) {
  if ((gameState === 'PLAYING' || gameState === 'PLAYING_HIGHWAY') && !showHighwayTutorial) {
    const newLane = player.lane + dir;
    if (newLane >= 0 && newLane <= 1) {
      player.lane = newLane;
      player.targetY = LANES[newLane];
    }
  }
}

function selectShitadaRoute() {
  let nextStage = 1;
  if (currentStage === 1) nextStage = 2;
  else if (currentStage === 2) nextStage = 3;
  else if (currentStage === 3 || currentStage === 99) nextStage = 1;
  resetStage(nextStage);
  gameState = 'PLAYING';
}

function selectKosokuRoute() {
  if (scoreMoney >= 7000) {
    scoreMoney -= 7000;
    addPopup('通行料 -¥7,000', '#FF4444', canvas.width / 2, 200);
    resetHighway();
    gameState = 'PLAYING_HIGHWAY';
  } else {
    addPopup('所持金不足！ (¥7,000必要)', '#FF0000', canvas.width / 2, 200);
  }
}

function handleAction() {
  if (gameState === 'PLAYING' && player.isGrounded) {
    player.state = 'PREP';
    player.stateTimer = 2;
  }
}

function resetStage(stageNum) {
  currentStage = stageNum;
  currentDistance = 0;
  gameSpeed = 5.2;
  life = 3;
  objects = [];
  popups = [];
  towerX = -200;
  towerPassed = false;
  bgMonsterX = -300;
  nightAlpha = 0;
  endCardTimer = 0;
  tutorialTimer = (stageNum === 1) ? TUTORIAL_DURATION : 0;
  player.lane = 1;
  player.x = 100;
  player.y = LANES[1];
  player.targetY = LANES[1];
  isPaused = false;
}

function resetHighway() {
  currentStage = 99;
  currentDistance = 0;
  speedKmh = 80;
  gameSpeed = 6.0;
  life = 3;
  objects = [];
  popups = [];
  patrolCarX = -300;
  showHighwayTutorial = true;
  pedalHighlightTimer = 0;
  player.lane = 1;
  player.x = 100;
  player.y = LANES[1];
  player.targetY = LANES[1];
  isPaused = false;
}

function addPopup(text, color, x, y) {
  popups.push({ text, color, x, y, alpha: 1.0, life: 90 });
}

function gameLoop() {
  if (!isPaused) update();
  draw();
  requestAnimationFrame(gameLoop);
}

function update() {
  if (gameState === 'STAGE_CLEAR') {
    endCardTimer++;
    return;
  }
  if (gameState === 'PLAYING') {
    updateStageLogic();
  } else if (gameState === 'PLAYING_HIGHWAY') {
    if (!showHighwayTutorial) updateHighway();
  }
}

function updateStageLogic() {
  if (tutorialTimer > 0) tutorialTimer--;
  currentDistance += 0.010;

  if (currentDistance < 3.5) gameSpeed = 5.2;
  else if (currentDistance < 7.0) gameSpeed = 6.8;
  else gameSpeed = 8.2;

  roadDashOffset = (roadDashOffset - gameSpeed * 2) % 60;

  if (currentDistance >= TOTAL_STAGE_DISTANCE) {
    currentDistance = TOTAL_STAGE_DISTANCE;
    gameState = 'STAGE_CLEAR';
    endCardTimer = 0;
    return;
  }

  skyX = (skyX - gameSpeed * 0.15) % canvas.width;
  townX = (townX - gameSpeed * 0.5) % canvas.width;

  if (currentStage === 1) { 
    if (currentDistance >= 5.5) nightAlpha = Math.min(1, nightAlpha + 0.008);
    if (currentDistance >= 1.5 && !towerPassed) {
      if (towerX === -200) towerX = canvas.width;
      towerX -= gameSpeed * 0.9;
      if (towerX < -150) towerPassed = true;
    }
    if (towerPassed && currentDistance >= 3.8 && currentDistance < 7.0) {
      if (bgMonsterX === -300) bgMonsterX = canvas.width;
      bgMonsterX -= gameSpeed * 0.4;
    } else if (currentDistance >= 7.0 && bgMonsterX > -300) {
      bgMonsterX -= gameSpeed * 0.8;
    }
  } else if (currentStage === 2) { 
    if (currentDistance >= 1.5 && currentDistance < 5.0) {
      if (bgMonsterX === -300) bgMonsterX = canvas.width;
      bgMonsterX -= gameSpeed * 0.35;
    } else if (currentDistance >= 5.0 && bgMonsterX > -300) {
      bgMonsterX -= gameSpeed * 0.8;
    }
  } else if (currentStage === 3) { 
    if (currentDistance >= 1.5 && currentDistance < 5.5) {
      if (bgMonsterX === -300) bgMonsterX = canvas.width;
      bgMonsterX -= gameSpeed * 0.35;
    } else if (currentDistance >= 5.5 && bgMonsterX > -300) {
      bgMonsterX -= gameSpeed * 0.8;
    }
  }

  updatePlayerAndObjects();
}

function updateHighway() {
  if (pedalHighlightTimer > 0) pedalHighlightTimer--;

  if (isAccelerating) {
    speedKmh = Math.min(160, speedKmh + 0.9);
  } else {
    speedKmh = Math.max(70, speedKmh - 0.5);
  }

  gameSpeed = speedKmh * 0.09;
  const targetX = 100 + ((speedKmh - 70) / 90) * 160;
  player.x += (targetX - player.x) * 0.1;

  currentDistance += speedKmh * 0.00015;
  roadDashOffset = (roadDashOffset - gameSpeed * 2) % 60;

  if (currentDistance >= HIGHWAY_STAGE_DISTANCE) {
    currentDistance = HIGHWAY_STAGE_DISTANCE;
    gameState = 'STAGE_CLEAR';
    endCardTimer = 0;
    return;
  }

  skyX = (skyX - gameSpeed * 0.3) % canvas.width;

  if (speedKmh < 100) {
    patrolCarX = Math.min(60, patrolCarX + 1.5);
  } else {
    patrolCarX -= 2.0;
  }

  if (patrolCarX > 20 && Math.abs(player.x - patrolCarX) < 80) {
    scoreMoney = Math.max(0, scoreMoney - 3000);
    addPopup('無免許御用！ 罰金 -¥3,000', '#FF0000', player.x, player.y - 20);
    patrolCarX = -300;
  }

  updatePlayerAndObjects();
}

function updatePlayerAndObjects() {
  player.y += (player.targetY - player.y) * 0.35;

  if (player.state === 'PREP') {
    player.stateTimer--;
    if (player.stateTimer <= 0) {
      player.vy = player.jumpPower;
      player.isGrounded = false;
      player.state = 'JUMP';
    }
  }

  if (!player.isGrounded) {
    player.vy += player.gravity;
    player.y += player.vy;
    if (player.y >= player.targetY) {
      player.y = player.targetY;
      player.vy = 0;
      player.isGrounded = true;
      player.state = 'LAND';
      player.stateTimer = 3;
    }
  } else if (player.state === 'LAND') {
    player.stateTimer--;
    if (player.stateTimer <= 0) player.state = 'DRIVE';
  }

  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.y -= 0.6;
    if (p.life < 30) p.alpha -= 0.033;
    p.life--;
    if (p.life <= 0) popups.splice(i, 1);
  }

  spawnTimer++;
  const spawnThreshold = (gameState === 'PLAYING_HIGHWAY') ? 85 : (90 - Math.floor(gameSpeed * 3.0));

  if (spawnTimer > spawnThreshold) {
    spawnTimer = 0;

    if (gameState === 'PLAYING_HIGHWAY') {
      const rand = Math.random() * 100;
      let spawnLane = (lastSpawnLane === 0) ? 1 : 0;
      if (Math.random() < 0.3) spawnLane = lastSpawnLane;
      lastSpawnLane = spawnLane;

      if (rand < 10) {
        objects.push({ type: 'patrol_obstacle', lane: spawnLane, x: canvas.width, y: LANES[spawnLane] - 10, width: 120, height: 55, overtaken: false, speedKmh: 90 });
      } else if (rand < 20) {
        objects.push({ type: 'orbis', x: canvas.width, y: 170, width: 120, height: 200, passed: false });
      } else if (rand < 44) {
        objects.push({ type: 'car_truck', lane: spawnLane, x: canvas.width, y: LANES[spawnLane] - 10, width: 140, height: 60, overtaken: false, speedKmh: 75 });
      } else if (rand < 68) {
        objects.push({ type: 'car_minivan', lane: spawnLane, x: canvas.width, y: LANES[spawnLane] - 10, width: 110, height: 50, overtaken: false, speedKmh: 85 });
      } else {
        objects.push({ type: 'car_sedan', lane: spawnLane, x: canvas.width, y: LANES[spawnLane] - 10, width: 100, height: 45, overtaken: false, speedKmh: 105 });
      }
    } else {
      const spawnLane = Math.floor(Math.random() * 2);
      const rand = Math.random();
      let selectedType = 'hitchhiker';

      if (rand < 0.40) selectedType = 'hitchhiker';
      else if (rand < 0.52) selectedType = 'mechanic';
      else if (rand < 0.68) selectedType = 'truck';
      else if (rand < 0.82) selectedType = 'car_sedan';
      else if (rand < 0.92) selectedType = 'manhole';
      else selectedType = 'monster_block';

      const objData = { type: selectedType, lane: spawnLane, x: canvas.width, y: LANES[spawnLane], width: 40, height: 55 };

      if (selectedType === 'truck') { objData.y = LANES[spawnLane] - 10; objData.width = 120; objData.height = 60; }
      else if (selectedType === 'car_sedan') { objData.y = LANES[spawnLane] - 5; objData.width = 95; objData.height = 45; }
      else if (selectedType === 'manhole') { objData.y = LANES[spawnLane] + 25; objData.width = 50; objData.height = 15; }
      else if (selectedType === 'monster_block') { objData.lane = 'ALL'; objData.y = LANES[0] - 5; objData.width = 70; objData.height = 75; }

      objects.push(objData);
    }
  }

  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    let moveSpeed = gameSpeed;
    if (obj.speedKmh) {
      const relativeSpeed = speedKmh - obj.speedKmh;
      moveSpeed = relativeSpeed * 0.12;
    }
    obj.x -= moveSpeed;

    if (gameState === 'PLAYING_HIGHWAY' && !obj.overtaken && obj.x + obj.width < player.x) {
      obj.overtaken = true;
      scoreMoney += 500;
      addPopup('追い抜き！ +¥500', '#00FF7F', player.x + 20, player.y - 30);
    }

    if (obj.type === 'orbis') {
      const distToOrbis = obj.x - player.x;
      if (distToOrbis > 0 && distToOrbis < 300) orbisWarningTimer = 10;
      if (!obj.passed && obj.x < player.x) {
        obj.passed = true;
        if (speedKmh >= 100) {
          scoreMoney = Math.max(0, scoreMoney - 2000);
          addPopup('📸 速度違反！ -¥2,000', '#FF0000', player.x, player.y - 40);
        } else {
          addPopup('安全運転クリア！', '#00FF7F', player.x, player.y - 40);
        }
      }
    }

    const isSameLane = (player.lane === obj.lane);
    if (isSameLane && player.x < obj.x + obj.width && player.x + player.width > obj.x && (player.isGrounded || obj.type === 'orbis')) {
      if (obj.type === 'hitchhiker') {
        scoreMoney += 500;
        addPopup('乗車完了！ +¥500', '#FFD700', player.x + 10, player.y - 20);
      } else if (obj.type === 'mechanic') {
        scoreMoney += 2000;
        if (life < 3) life++;
        addPopup('車両点検完了！ +¥2,000', '#00FF7F', player.x + 10, player.y - 20);
      } else if (obj.type !== 'orbis') {
        if (!isInvincible) life--;
        addPopup('クラッシュ！', '#FF4444', player.x + 20, player.y - 20);
        if (life <= 0) gameState = 'GAMEOVER';
      }
      if (obj.type !== 'orbis') objects.splice(i, 1);
      continue;
    }

    if (obj.x + obj.width < -150 || obj.x > canvas.width + 300) objects.splice(i, 1);
  }
  if (orbisWarningTimer > 0) orbisWarningTimer--;
}
// ===============================
//  忠犬しばとのお迎え大作戦（横画面・PNG統一版）
//  game.js  Part 2 (後半：背景画像そのまま描画・シンプル版)
// ===============================

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- 安全描画関数 ---
  function safeDraw(img, x, y, w, h, alpha = 1) {
    if (img && img.complete && img.naturalWidth !== 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    }
  }

  // 🏙️ 背景タウンの表示高さ調整（画面上部 Y:0 〜 道路の上端 Y:350 をぴったり覆う）
  const townHeight = 350;
  const townY = 0;

  // ===============================
  //  背景描画（高速道路）
  // ===============================
  if (gameState === 'PLAYING_HIGHWAY') {
    safeDraw(images.bgSky, skyX, 0, canvas.width, canvas.height);
    safeDraw(images.bgSky, skyX + canvas.width, 0, canvas.width, canvas.height);

    let hwBg = images.bgHighwayMiyajima;
    if (currentDistance >= 7.0 && currentDistance < 14.0) hwBg = images.bgHighwayFukuyama;
    else if (currentDistance >= 14.0) hwBg = images.bgHighwayMiki;

    safeDraw(hwBg, skyX, 0, canvas.width, 350);
    safeDraw(hwBg, skyX + canvas.width, 0, canvas.width, 350);

  // ===============================
  //  背景描画（下道：イラストを空ごとそのまま描画）
  // ===============================
  } else {
    if (currentStage === 1) { // 福岡
      safeDraw(images.bgNightSky, skyX, 0, canvas.width, canvas.height);
      safeDraw(images.bgNightSky, skyX + canvas.width, 0, canvas.width, canvas.height);

      safeDraw(images.bgSky, skyX, 0, canvas.width, canvas.height, 1 - nightAlpha);
      safeDraw(images.bgSky, skyX + canvas.width, 0, canvas.width, canvas.height, 1 - nightAlpha);

      if (bgMonsterX > -300 && bgMonsterX < canvas.width) safeDraw(images.monsterMentaiko, bgMonsterX, 90, 180, 220);

      let currentBg = images.bgTown;
      if (currentDistance >= 3.0 && currentDistance < 6.5) currentBg = images.bgPark;
      else if (currentDistance >= 6.5) currentBg = images.bgYatai;

      safeDraw(currentBg, townX, townY, canvas.width, townHeight);
      safeDraw(currentBg, townX + canvas.width, townY, canvas.width, townHeight);

      if (!towerPassed && towerX > -200 && towerX < canvas.width) safeDraw(images.bgTower, towerX, 90, 120, 280);

    } else if (currentStage === 2) { // 広島
      safeDraw(images.bgSky, skyX, 0, canvas.width, canvas.height);
      safeDraw(images.bgSky, skyX + canvas.width, 0, canvas.width, canvas.height);

      if (bgMonsterX > -300 && bgMonsterX < canvas.width) safeDraw(images.monsterMomijigon, bgMonsterX, 110, 200, 200);

      safeDraw(images.bgHiroshima, townX, townY, canvas.width, townHeight);
      safeDraw(images.bgHiroshima, townX + canvas.width, townY, canvas.width, townHeight);

    } else if (currentStage === 3) { // 大阪・名古屋（空切り抜き不要！イラストをそのまま表示）
      
      // 1. 距離に応じて背景イラストをシンプルに切り替え
      let currentBg = images.bgDotonbori;
      if (currentDistance >= 3.0 && currentDistance < 7.0) {
        currentBg = images.bgTsutenkaku;
      } else if (currentDistance >= 7.0) {
        currentBg = images.bgNagoyaCastle;
      }

      // 2. 背景イラストをそのまま画面上部（Y:0）から描画
      safeDraw(currentBg, townX, townY, canvas.width, townHeight);
      safeDraw(currentBg, townX + canvas.width, townY, canvas.width, townHeight);
    }
  }

  // ===============================
  //  🛣️ 道路レイヤー
  // ===============================
  ctx.save();
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 350, canvas.width, 100);

  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 3;
  ctx.setLineDash([25, 25]);
  ctx.lineDashOffset = roadDashOffset;
  ctx.beginPath();
  ctx.moveTo(0, 395);
  ctx.lineTo(canvas.width, 395);
  ctx.stroke();
  ctx.restore();

  if (gameState === 'PLAYING_HIGHWAY') {
    if (patrolCarX > -250) {
      safeDraw(images.patrolCar, patrolCarX, LANES[player.lane] - 10, 130, 55);
    } else if (speedKmh < 100 && (Math.floor(Date.now() / 150) % 2 === 0)) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fillRect(0, 350, 20, 100);
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 16px sans-serif';
      ctx.fillText('🚨 接近中！', 25, 400);
      ctx.restore();
    }
  }

  // ===============================
  //  スプライト（描画ソート）
  // ===============================
  const renderList = [...objects, { isPlayer: true, y: player.y }];
  renderList.sort((a, b) => a.y - b.y);

  renderList.forEach(item => {
    if (item.isPlayer) {
      let img = images.playerDrive;
      if (player.state === 'PREP') img = images.playerJumpPrep;
      else if (player.state === 'JUMP') img = images.playerJump;
      else if (player.state === 'LAND') img = images.playerLand;
      safeDraw(img, player.x, player.y, player.width, player.height);
    } else {
      let img = images.hitchhiker;
      if (item.type === 'mechanic') img = images.mechanic;
      else if (item.type === 'truck') img = images.truck;
      else if (item.type === 'manhole') img = images.manhole;
      else if (item.type === 'monster_block') {
        img = images.monsterMentaiko;
        if (currentStage === 2) img = images.monsterMomijigon;
        else if (currentStage === 3) img = images.monsterTakoyaki;
      } else if (item.type === 'orbis') img = images.obstacleOrbis;
      else if (item.type === 'patrol_obstacle') img = images.patrolCar;
      else if (item.type === 'car_sedan') img = images.carSedan;
      else if (item.type === 'car_minivan') img = images.carMinivan;
      else if (item.type === 'car_truck') img = images.carTruck;

      safeDraw(img, item.x, item.y, item.width, item.height);
    }
  });

  // ===============================
  //  UI描画（所持金・ライフ・ポーズ・操作系）
  // ===============================
  if (gameState === 'PLAYING' || gameState === 'PLAYING_HIGHWAY') {
    // 所持金
    safeDraw(images.bone, 20, 20, 35, 35);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`¥${scoreMoney}`, 65, 47);

    // ライフ
    for (let i = 0; i < life; i++) {
      safeDraw(images.heart, 820 + (i * 35), 20, 30, 30);
    }

    // ⏸️ ポーズボタン
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(750, 10, 50, 45, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(isPaused ? '▶' : '⏸️', 775, 38);
    ctx.restore();

    // 🎨 上下操作ボタン
    ctx.save();
    // ▲ 上ボタン
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(15, 275, 120, 60, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('▲ 上', 75, 312);

    // ▼ 下ボタン
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath(); ctx.roundRect(15, 360, 120, 60, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText('▼ 下', 75, 397);
    ctx.restore();
  }

  // --- 下道：JUMPボタン ---
  if (gameState === 'PLAYING') {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 215, 0, 0.85)';
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(815, 310, 115, 110, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🦘 JUMP', 872, 373);
    ctx.restore();
  }

  // --- 高速：アクセル＆速度計 ---
  if (gameState === 'PLAYING_HIGHWAY') {
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(600, 15, 130, 40);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.strokeRect(600, 15, 130, 40);
    ctx.fillStyle = '#00FF7F'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(speedKmh)} KM/H`, 665, 42);
    ctx.restore();

    safeDraw(images.uiPedal, 815, 310, 115, 110, 0.95);
    const isBlinking = (pedalHighlightTimer > 0 && Math.floor(Date.now() / 150) % 2 === 0);
    if (isAccelerating || isBlinking) {
      ctx.save();
      ctx.strokeStyle = isBlinking ? '#FF0000' : '#FFD700'; ctx.lineWidth = 6;
      ctx.strokeRect(815, 310, 115, 110);
      ctx.restore();
    }

    if (orbisWarningTimer > 0 && (Math.floor(Date.now() / 250) % 2 === 0)) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'; ctx.fillRect(200, 10, 560, 40);
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚠️ 前方に オービス設置エリア！ 100km/h未満に減速せよ！', canvas.width / 2, 36);
      ctx.restore();
    }
  }

  // --- 高速チュートリアル画面 ---
  if (gameState === 'PLAYING_HIGHWAY' && showHighwayTutorial) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1A1A1A'; ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(160, 35, 640, 380, 20); ctx.fill(); ctx.stroke();

    ctx.textAlign = 'center'; ctx.fillStyle = '#FFD700'; ctx.font = 'bold 24px sans-serif';
    ctx.fillText('【 🏎️ 高速道路のルール & 操作説明 】', canvas.width / 2, 75);

    ctx.fillStyle = '#FFF'; ctx.font = '16px sans-serif'; ctx.textAlign = 'left';
    let startX = 200;
    ctx.fillText('① 画面【右下のアクセルペダル】長押しで爆速加速！', startX, 120);
    ctx.fillText('② 画面左の【▲上 ▼下 ボタン】で車線変更！', startX, 158);
    ctx.fillText('③ 前の車を追い抜くと【追い抜きボーナス +¥500】', startX, 196);

    ctx.fillStyle = '#FF6B6B';
    ctx.fillText('⚠️ 【オービス警告】が出たらアクセルを離して減速せよ！', startX, 234);
    ctx.fillText('⚠️ パトカーに追いつかれると【無免許罰金】のペナルティ！', startX, 272);

    ctx.fillStyle = '#00FF7F'; ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(300, 310, 360, 70, 15); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#000'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('OK！発進する', canvas.width / 2, 353);
    ctx.restore();
  }

  // --- ポーズ画面 ---
  if (isPaused) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    ctx.strokeText('⏸️ 一時停止中 (PAUSE)', canvas.width / 2, 210); ctx.fillText('⏸️ 一時停止中 (PAUSE)', canvas.width / 2, 210);
    ctx.fillStyle = '#FFF'; ctx.font = '20px sans-serif';
    ctx.strokeText('スクショ撮影チャンス！ ( [P]キー か ⏸️タップで再開 )', canvas.width / 2, 260);
    ctx.fillText('スクショ撮影チャンス！ ( [P]キー か ⏸️タップで再開 )', canvas.width / 2, 260);
    ctx.restore();
  }

  // --- ポップアップ描画 ---
  popups.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color; ctx.font = 'bold 22px sans-serif';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
    ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  });

  // --- タイトル画面 ---
  if (gameState === 'TITLE') {
    safeDraw(images.titleCard, 0, 0, canvas.width, canvas.height);
    const saveData = loadGameData();

    if (saveData) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(140, 340, 300, 70, 15); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🎮 はじめから', 290, 383);

      ctx.fillStyle = 'rgba(0, 200, 80, 0.85)'; ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(520, 340, 300, 70, 15); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 24px sans-serif';
      ctx.fillText('🚩 つづきから', 670, 383);
      ctx.restore();
    } else {
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
      ctx.strokeText('画面タップでスタート！', canvas.width / 2, 400); ctx.fillText('画面タップでスタート！', canvas.width / 2, 400);
    }
  }

  // --- ストーリー画面 ---
  if (gameState === 'STORY') {
    safeDraw(images.openingStory, 0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 22px sans-serif';
    ctx.globalAlpha = (Math.sin(Date.now() / 200) + 1) / 2;
    ctx.strokeText('タップして出発！', canvas.width / 2, 420); ctx.fillText('タップして出発！', canvas.width / 2, 420);
    ctx.restore();
  }

  // --- ステージクリア画面 ---
  if (gameState === 'STAGE_CLEAR') {
    let clearImg = images.endCardFukuoka;
    if (currentStage === 3) clearImg = images.endCardOsaka;
    else if (currentStage === 99) clearImg = images.endCardHighway;

    safeDraw(clearImg, 0, 0, canvas.width, canvas.height);

    ctx.save();
    let grad = ctx.createLinearGradient(0, 250, 0, canvas.height);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    ctx.fillStyle = grad; ctx.fillRect(0, 250, canvas.width, 200);

    ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    let stageTitle = '🎉 福岡ステージ クリア！';
    if (currentStage === 2) stageTitle = '🎉 広島ステージ クリア！';
    else if (currentStage === 3) stageTitle = '🎉 大阪・名古屋ステージ クリア！';
    else if (currentStage === 99) stageTitle = '🎉 山陽自動車道 ステージクリア！';

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 30px sans-serif';
    ctx.strokeText(stageTitle, canvas.width / 2, 310); ctx.fillText(stageTitle, canvas.width / 2, 310);

    ctx.fillStyle = '#FFF'; ctx.font = 'bold 24px sans-serif'; ctx.lineWidth = 4;
    ctx.strokeText(`現在の所持金: ¥${scoreMoney}`, canvas.width / 2, 355); ctx.fillText(`現在の所持金: ¥${scoreMoney}`, canvas.width / 2, 355);

    if (endCardTimer >= END_CARD_DELAY) {
      ctx.fillStyle = '#00FF7F'; ctx.font = 'bold 18px sans-serif';
      ctx.strokeText('タップして次へ進む ▶', canvas.width / 2, 405); ctx.fillText('タップして次へ進む ▶', canvas.width / 2, 405);
    }
    ctx.restore();
  }

  // --- ルート選択画面 ---
  if (gameState === 'SELECT_ROUTE') {
    safeDraw(images.selectRoute, 0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.textAlign = 'center';

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 26px sans-serif'; ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    ctx.strokeText(`現在の所持金: ¥${scoreMoney}`, canvas.width / 2, 40); ctx.fillText(`現在の所持金: ¥${scoreMoney}`, canvas.width / 2, 40);

    ctx.fillStyle = '#FFF'; ctx.font = 'bold 22px sans-serif';
    ctx.globalAlpha = (Math.sin(Date.now() / 180) + 1) / 2;
    ctx.strokeText('👉 選択ルートをタップ！ 👈', canvas.width / 2, 78); ctx.fillText('👉 選択ルートをタップ！ 👈', canvas.width / 2, 78);
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = '#FFF'; ctx.font = 'bold 36px sans-serif'; ctx.strokeStyle = '#000'; ctx.lineWidth = 8;
    ctx.strokeText('◀ 下道 (無料)', 220, 360); ctx.fillText('◀ 下道 (無料)', 220, 360);

    ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#FFD700'; ctx.lineWidth = 5;
    ctx.strokeText('PC: 右クリック', 220, 405); ctx.fillText('PC: 右クリック', 220, 405);

    let hwColor = scoreMoney >= 7000 ? '#00FF7F' : '#FF4444';
    ctx.fillStyle = hwColor; ctx.font = 'bold 34px sans-serif'; ctx.strokeStyle = '#000'; ctx.lineWidth = 8;
    ctx.strokeText('高速道路 (¥7,000) ▶', 720, 360); ctx.fillText('高速道路 (¥7,000) ▶', 720, 360);

    ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#FFD700'; ctx.lineWidth = 5;
    ctx.strokeText('PC: [ B ] キー', 720, 405); ctx.fillText('PC: [ B ] キー', 720, 405);
    ctx.restore();
  }

  // --- ゲームオーバー画面 ---
  if (gameState === 'GAMEOVER') {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FF4444'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, 200);
    ctx.fillStyle = '#FFF'; ctx.font = '20px sans-serif';
    ctx.fillText('タップでリトライ', canvas.width / 2, 260);
  }
}