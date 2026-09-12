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
