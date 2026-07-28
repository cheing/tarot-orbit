const POSITIONS = ["过去", "现在", "未来"];
const POSITION_EN = ["PAST", "PRESENT", "FUTURE"];

const els = {
  intro: document.getElementById("intro"),
  startBtn: document.getElementById("startBtn"),
  questionInput: document.getElementById("questionInput"),
  orbitScene: document.getElementById("orbitScene"),
  orbitWrap: document.getElementById("orbitWrap"),
  cardOrbit: document.getElementById("cardOrbit"),
  wheelWrap: document.getElementById("wheelWrap"),
  gestureStatus: document.getElementById("gestureStatus"),
  cameraPanel: document.getElementById("cameraPanel"),
  video: document.getElementById("gestureVideo"),
  canvas: document.getElementById("gestureCanvas"),
  resultStage: document.getElementById("resultStage"),
  finalCards: document.getElementById("finalCards"),
  questionEcho: document.getElementById("questionEcho"),
  readingPanel: document.getElementById("readingPanel"),
  readingLoading: document.getElementById("readingLoading"),
  readingContent: document.getElementById("readingContent"),
  readingError: document.getElementById("readingError"),
  retryReadingBtn: document.getElementById("retryReadingBtn"),
  restartBtn: document.getElementById("restartBtn"),
};

const API_URL = getReadingApiUrl();

let deck = [];
let selected = [];
let rotation = 0;
let velocity = 0.16;
let isDragging = false;
let dragX = 0;
let finished = false;
let gesture = null;
let rafId = 0;
let isReading = false;

function init() {
  deck = shuffledCards();
  buildOrbit();
  bindEvents();
  animate();
}

function bindEvents() {
  els.startBtn.addEventListener("click", startGame);
  els.restartBtn.addEventListener("click", restartGame);
  els.retryReadingBtn.addEventListener("click", requestReading);

  els.orbitWrap.addEventListener("pointerdown", (event) => {
    if (finished) return;
    isDragging = true;
    dragX = event.clientX;
    els.orbitWrap.setPointerCapture(event.pointerId);
  });

  els.orbitWrap.addEventListener("pointermove", (event) => {
    if (!isDragging || finished) return;
    const dx = event.clientX - dragX;
    dragX = event.clientX;
    rotation += dx * 0.42;
    velocity = dx * 0.025;
    renderOrbit();
  });

  els.orbitWrap.addEventListener("pointerup", (event) => {
    isDragging = false;
    els.orbitWrap.releasePointerCapture(event.pointerId);
  });
}

async function startGame() {
  els.intro.classList.add("is-leaving");
  await gsap.to(els.intro, { opacity: 0, duration: 0.55, ease: "power2.in" });
  els.intro.hidden = true;
  els.orbitScene.classList.add("is-active");
  gsap.fromTo(
    ".top-bar, .chosen-strip, .orbit-wrap, .wheel-wrap",
    {
      opacity: 0,
      y: 24,
    },
    {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.08,
      ease: "power2.out",
    },
  );

  startGesture();
}

async function startGesture() {
  gesture = new OrbitGesture({
    video: els.video,
    canvas: els.canvas,
    onMove: (amount) => {
      if (!finished) {
        rotation += amount;
        velocity = amount * 0.02;
        renderOrbit();
      }
    },
    onPoint: (point) => selectByPoint(point),
    onStatus: (text) => {
      els.gestureStatus.textContent = text;
    },
  });

  const ok = await gesture.start();
  els.cameraPanel.classList.toggle("is-visible", ok);
}

function buildOrbit() {
  els.cardOrbit.innerHTML = "";
  deck.forEach((card, index) => {
    const button = document.createElement("button");
    button.className = "tarot-card";
    button.type = "button";
    button.dataset.index = index;
    button.setAttribute("aria-label", `é€‰æ‹©å¡”ç½—ç‰Œ ${index + 1}`);
    button.innerHTML = `
      <span class="card-back">
        <img class="card-back-img" src="assets/images/card.webp" alt="" />
      </span>
    `;
    button.addEventListener("click", () => selectCard(index));
    els.cardOrbit.appendChild(button);
  });
  renderOrbit();
}

function renderOrbit() {
  const cards = [...els.cardOrbit.children];
  const count = cards.length;
  if (!count) return;
  const cardWidth = cards[0].offsetWidth || 108;
  const minRadius = (cardWidth / (2 * Math.sin(Math.PI / count))) * 1.18;
  const radius = Math.max(minRadius, Math.min(window.innerWidth * 0.42, 640));
  const centerBoost = Math.max(70, window.innerWidth * 0.04);

  cards.forEach((el, index) => {
    const angle = ((index / count) * 360 + rotation) % 360;
    const rad = (angle * Math.PI) / 180;
    const x = Math.sin(rad) * radius;
    const z = Math.cos(rad) * radius;
    const y = Math.cos(rad) * 18;
    const depth = (z + radius) / (radius * 2);
    const scale = 0.72 + depth * 0.44;
    const opacity = el.classList.contains("is-picked")
      ? 0
      : 0.45 + depth * 0.55;
    const liftT = Math.max(0, Math.min(1, (depth - 0.55) / 0.3));
    const lift = centerBoost * liftT * liftT * (3 - 2 * liftT);

    el.style.transform = `translate3d(${x}px, ${y - lift}px, ${z}px) rotateY(${angle}deg) scale(${scale})`;
    el.style.zIndex = String(Math.round(z + radius));
    el.style.opacity = opacity.toFixed(2);
    el.classList.toggle(
      "is-front",
      z > radius * 0.7 && !el.classList.contains("is-picked"),
    );
  });
}

function animate() {
  if (!finished && !isDragging) {
    rotation += velocity;
    velocity *= 0.985;
    if (Math.abs(velocity) < 0.08) velocity = velocity < 0 ? -0.08 : 0.08;
    renderOrbit();
  }
  rafId = requestAnimationFrame(animate);
}

function selectByPoint(point) {
  if (finished) return;
  const target = document.elementFromPoint(point.x, point.y);
  const cardEl = target && target.closest(".tarot-card");
  if (cardEl) {
    selectCard(Number(cardEl.dataset.index));
    return;
  }

  const front = [...els.cardOrbit.children].find((el) =>
    el.classList.contains("is-front"),
  );
  if (front) selectCard(Number(front.dataset.index));
}

function selectCard(index) {
  if (finished || selected.length >= 3) return;
  const card = deck[index];
  if (!card || selected.some((item) => item.id === card.id)) return;

  const cardEl = els.cardOrbit.children[index];
  cardEl.classList.add("is-picked");
  const chosen = { ...card, position: POSITIONS[selected.length] };
  selected.push(chosen);
  flyToSlot(cardEl, chosen, selected.length - 1);

  if (selected.length === 3) {
    finished = true;
    setTimeout(showFinalReading, 850);
  }
}

function flyToSlot(sourceEl, card, slotIndex) {
  const slot = document.querySelector(`[data-slot="${slotIndex}"]`);
  const sourceRect = sourceEl.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  const clone = sourceEl.cloneNode(true);
  clone.className = "tarot-card flying-card is-selected";
  clone.style.left = `${sourceRect.left}px`;
  clone.style.top = `${sourceRect.top}px`;
  clone.style.width = `${sourceRect.width}px`;
  clone.style.height = `${sourceRect.height}px`;
  clone.style.transform = "none";
  document.body.appendChild(clone);

  slot.classList.add("is-filled");
  slot.textContent = card.position;

  gsap.to(clone, {
    left: slotRect.left + slotRect.width / 2 - 28,
    top: slotRect.top + 20,
    width: 56,
    height: 82,
    duration: 0.72,
    ease: "power3.inOut",
    onComplete: () => {
      slot.innerHTML = `<img src="${card.image}" alt="${card.name}"><span>${card.position}</span>`;
      clone.remove();
    },
  });
}

async function showFinalReading() {
  if (gesture) gesture.stop();
  cancelAnimationFrame(rafId);
  els.orbitScene.classList.add("is-reading");
  els.questionEcho.textContent = els.questionInput.value.trim()
    ? `「${els.questionInput.value.trim()}」`
    : "未填写问题，将进行通用三牌解读。";

  await gsap.to([els.orbitWrap, els.wheelWrap], {
    opacity: 0,
    y: 50,
    duration: 0.55,
    ease: "power2.in",
    stagger: 0.04,
  });

  renderFinalCards();
  els.resultStage.classList.add("is-visible");
  gsap.fromTo(
    els.resultStage,
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" },
  );
  gsap.fromTo(
    ".final-card",
    { opacity: 0, y: 40, rotateY: 120 },
    {
      opacity: 1,
      y: 0,
      rotateY: 0,
      duration: 0.9,
      stagger: 0.18,
      ease: "back.out(1.2)",
    },
  );
  requestReading();
}

function renderFinalCards() {
  els.finalCards.innerHTML = selected
    .map((card, index) => {
      const meaning = card.reversed ? card.reversedMeaning : card.upright;
      return `
      <article class="final-card ${card.reversed ? "is-reversed" : ""}">
        <div class="final-position">
          <strong>${card.position}</strong>
          <span>${POSITION_EN[index]}</span>
        </div>
        <div class="final-card-img">
          <img src="${card.image}" alt="${card.name}">
        </div>
        <h3>${card.name}</h3>
        <span>${card.nameEn} · ${card.reversed ? "逆位" : "正位"}</span>
        <small>${meaning}</small>
      </article>
    `;
    })
    .join("");
}
async function requestReading() {
  if (isReading || selected.length !== 3) return;
  isReading = true;
  els.retryReadingBtn.disabled = true;
  els.readingLoading.hidden = false;
  els.readingContent.textContent = "";
  els.readingError.textContent = "";
  els.readingError.classList.remove("is-visible");

  const payload = {
    question: els.questionInput.value.trim(),
    cards: selected.map((card) => ({
      position: card.position,
      name: card.name,
      nameEn: card.nameEn,
      reversed: card.reversed,
      meaning: card.reversed ? card.reversedMeaning : card.upright,
    })),
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const data = parseJsonText(errorText) || { error: stripHtml(errorText) };
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      await readStream(response);
    } else if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      displayReading(data.reading || data.content || "");
    } else {
      displayReading(await response.text());
    }
  } catch (error) {
    els.readingLoading.hidden = true;
    els.readingError.textContent = `解读失败：${error.message}`;
    els.readingError.classList.add("is-visible");
  } finally {
    isReading = false;
    els.retryReadingBtn.disabled = false;
  }
}

function restartGame() {
  if (gesture) gesture.stop();
  cancelAnimationFrame(rafId);
  window.location.href = window.location.pathname + window.location.search;
}
function getReadingApiUrl() {
  if (location.port === "5500") {
    return "http://localhost/tarot_orbit/api/reading.php";
  }

  return "api/reading.php";
}

function displayReading(text) {
  els.readingLoading.hidden = true;
  const cleanText = stripHtml(text || "").trim();
  if (!cleanText) {
    els.readingError.textContent =
      "解读失败：AI 没有返回内容，请检查 API key、余额或 PHP 配置。";
    els.readingError.classList.add("is-visible");
    return;
  }
  els.readingContent.textContent = cleanText;
}

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

function parseJsonText(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readStream(response) {
  els.readingLoading.hidden = true;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") return;
      try {
        const data = JSON.parse(json);
        if (data.error) {
          const message =
            typeof data.error === "string" ? data.error : data.error.message;
          throw new Error(message || "OpenAI API error");
        }
        const text = data.choices?.[0]?.delta?.content || "";
        if (text) els.readingContent.append(document.createTextNode(text));
      } catch (error) {
        if (error.message) throw error;
      }
    }
  }
}

window.addEventListener("resize", renderOrbit);
document.addEventListener("DOMContentLoaded", init);
