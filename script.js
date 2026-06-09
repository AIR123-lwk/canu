const notesContainer = document.querySelector("#notes");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const distanceEl = document.querySelector("#distance");
const judgeEl = document.querySelector("#judge");
const canoeEl = document.querySelector("#canoe");
const startButton = document.querySelector("#startButton");
const resetButton = document.querySelector("#resetButton");
const riverEl = document.querySelector(".river");
const difficultyButtons = document.querySelectorAll(".difficulty-button");

const difficultySettings = {
  easy: {
    label: "쉬움",
    noteCount: 72,
    beatGap: 520,
    fallTime: 2200,
    perfectWindow: 110,
    goodWindow: 220,
    perfectMeters: 125,
    goodMeters: 85,
  },
  normal: {
    label: "보통",
    noteCount: 88,
    beatGap: 450,
    fallTime: 1900,
    perfectWindow: 85,
    goodWindow: 175,
    perfectMeters: 105,
    goodMeters: 70,
  },
  hard: {
    label: "어려움",
    noteCount: 104,
    beatGap: 380,
    fallTime: 1600,
    perfectWindow: 65,
    goodWindow: 135,
    perfectMeters: 90,
    goodMeters: 55,
  },
};

const hitZone = 110;
const noteTop = -54;
const noteSize = 48;
const finishDistance = 3000;

let notes = [];
let beatMap = [];
let score = 0;
let combo = 0;
let distance = 0;
let startTime = 0;
let animationId = 0;
let spawnTimers = [];
let isPlaying = false;
let selectedDifficulty = "easy";

function getDifficulty() {
  return difficultySettings[selectedDifficulty];
}

function buildBeatMap() {
  const settings = getDifficulty();
  const pattern = ["left", "right", "left", "left", "right", "left", "right", "right"];
  return Array.from({ length: settings.noteCount }, (_, index) => [
    pattern[index % pattern.length],
    900 + index * settings.beatGap,
  ]);
}

function resetGame() {
  cancelAnimationFrame(animationId);
  spawnTimers.forEach((timerId) => clearTimeout(timerId));
  spawnTimers = [];
  notes.forEach((note) => note.element.remove());
  notes = [];
  beatMap = [];
  score = 0;
  combo = 0;
  distance = 0;
  isPlaying = false;
  scoreEl.textContent = score;
  comboEl.textContent = combo;
  distanceEl.textContent = distance;
  judgeEl.textContent = "스페이스바로 시작!";
  judgeEl.style.opacity = "1";
  canoeEl.className = "canoe";
  updateRiverBackground();
}

function startGame() {
  resetGame();
  isPlaying = true;
  startTime = performance.now();
  beatMap = buildBeatMap();
  judgeEl.textContent = `${getDifficulty().label} 준비!`;

  beatMap.forEach(([side, hitAt]) => {
    const timerId = setTimeout(() => createNote(side, startTime + hitAt), Math.max(0, hitAt - getDifficulty().fallTime));
    spawnTimers.push(timerId);
  });

  animationId = requestAnimationFrame(update);
  setTimeout(() => showJudge("출발!", 500), 250);
}

function createNote(side, targetTime) {
  if (!isPlaying) {
    return;
  }

  const element = document.createElement("div");
  element.className = `note ${side}`;
  element.textContent = side === "left" ? "A" : "D";
  notesContainer.appendChild(element);
  notes.push({
    side,
    targetTime,
    element,
    hit: false,
  });
}

function update(now) {
  updateRiverBackground();

  const settings = getDifficulty();
  const riverHeight = riverEl.clientHeight;
  const targetCenterY = riverHeight - hitZone;
  const noteStartCenterY = noteTop + noteSize / 2;
  const hitY = targetCenterY - noteStartCenterY;

  notes.forEach((note) => {
    const progress = 1 - (note.targetTime - now) / settings.fallTime;
    const y = progress * hitY;
    note.element.style.transform = `translateY(${y}px)`;

    if (!note.hit && now - note.targetTime > settings.goodWindow) {
      note.hit = true;
      note.element.remove();
      combo = 0;
      comboEl.textContent = combo;
      showJudge("Miss", 420);
    }
  });

  notes = notes.filter((note) => !note.hit);

  const lastBeatTime = beatMap.length ? beatMap[beatMap.length - 1][1] : 0;
  const isLastBeatPast = now - startTime > lastBeatTime + 1600;
  if (distance >= finishDistance) {
    finishGame("완주 완료!", true);
    return;
  }

  if (isLastBeatPast) {
    finishGame(distance >= 220 ? "도착 가까워요!" : "다시 도전!");
    return;
  }

  animationId = requestAnimationFrame(update);
}

function handleInput(side) {
  if (!isPlaying) {
    return;
  }

  const now = performance.now();
  const note = notes
    .filter((candidate) => candidate.side === side && !candidate.hit)
    .sort((a, b) => Math.abs(a.targetTime - now) - Math.abs(b.targetTime - now))[0];

  if (!note) {
    shakeCanoe(side);
    return;
  }

  const diff = Math.abs(note.targetTime - now);
  const settings = getDifficulty();
  if (diff <= settings.perfectWindow) {
    hitNote(note, "Perfect", 120, settings.perfectMeters, side);
  } else if (diff <= settings.goodWindow) {
    hitNote(note, "Good", 70, settings.goodMeters, side);
  } else {
    combo = 0;
    comboEl.textContent = combo;
    showJudge("Too Early", 380);
    shakeCanoe(side);
  }
}

function hitNote(note, label, points, meters, side) {
  const previousDistance = distance;
  note.hit = true;
  note.element.remove();
  combo += 1;
  score += points + combo * 5;
  distance = Math.min(finishDistance, distance + meters);
  scoreEl.textContent = score;
  comboEl.textContent = combo;
  distanceEl.textContent = distance;
  const passedMilestone = Math.floor(previousDistance / 1000) < Math.floor(distance / 1000);
  showJudge(passedMilestone ? `${Math.floor(distance / 1000) * 1000}m 응원!` : label, passedMilestone ? 720 : 360);
  rowCanoe(side);
}

function showJudge(text, duration) {
  judgeEl.textContent = text;
  judgeEl.style.opacity = "1";
  clearTimeout(showJudge.timerId);
  showJudge.timerId = setTimeout(() => {
    if (isPlaying) {
      judgeEl.style.opacity = "0";
    }
  }, duration);
}

function rowCanoe(side) {
  canoeEl.className = `canoe row-${side}`;
  clearTimeout(rowCanoe.timerId);
  rowCanoe.timerId = setTimeout(() => {
    canoeEl.className = "canoe";
  }, 280);
}

function shakeCanoe(side) {
  canoeEl.className = `canoe miss-${side}`;
  clearTimeout(shakeCanoe.timerId);
  shakeCanoe.timerId = setTimeout(() => {
    canoeEl.className = "canoe";
  }, 90);
}

function finishGame(message, completed = false) {
  isPlaying = false;
  cancelAnimationFrame(animationId);
  spawnTimers.forEach((timerId) => clearTimeout(timerId));
  notes.forEach((note) => note.element.remove());
  notes = [];
  judgeEl.textContent = message;
  judgeEl.style.opacity = "1";
  if (completed) {
    canoeEl.className = "canoe finish";
  }
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === " " && !isPlaying) {
    startGame();
  }
  if (key === "a") {
    handleInput("left");
  }
  if (key === "d") {
    handleInput("right");
  }
});

function updateRiverBackground() {
  const scroll = distance * 0.75 + (isPlaying ? (performance.now() - startTime) * 0.035 : 0);
  const milestoneZone = distance >= 1000 && distance % 1000 < 240;
  riverEl.style.setProperty("--scroll-y", `${scroll}px`);
  riverEl.style.setProperty("--river-bg", "url('assets/clap-bg.png')");
  riverEl.classList.toggle("milestone-zone", milestoneZone);
}

startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);
difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (isPlaying) {
      return;
    }
    selectedDifficulty = button.dataset.difficulty;
    difficultyButtons.forEach((item) => item.classList.toggle("active", item === button));
    judgeEl.textContent = `${getDifficulty().label} 난이도`;
    judgeEl.style.opacity = "1";
  });
});

resetGame();
