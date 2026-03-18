// Local storage keys keep the freemium demo simple on the client side.
const storageKeys = {
  premium: "studyai-premium",
  usageDate: "studyai-usage-date",
  usageCount: "studyai-usage-count",
  cookieConsent: "studyai-cookie-consent",
};

// Shared state for the current browser session.
const state = {
  selectedMode: "summary",
  isPremium: localStorage.getItem(storageKeys.premium) === "true",
  usageDate: localStorage.getItem(storageKeys.usageDate) || "",
  usageCount: Number(localStorage.getItem(storageKeys.usageCount) || 0),
  cookieConsent: localStorage.getItem(storageKeys.cookieConsent),
};

const freeLimit = Number(document.body.dataset.freeLimit || 3);

const elements = {
  textInput: document.getElementById("textInput"),
  generateButton: document.getElementById("generateButton"),
  modeButtons: document.querySelectorAll(".mode-button"),
  resultsGrid: document.getElementById("resultsGrid"),
  emptyState: document.getElementById("emptyState"),
  loadingState: document.getElementById("loadingState"),
  errorBanner: document.getElementById("errorBanner"),
  resultMeta: document.getElementById("resultMeta"),
  usageText: document.getElementById("usageText"),
  planName: document.getElementById("planName"),
  planToggleButton: document.getElementById("planToggleButton"),
  upgradeButton: document.getElementById("upgradeButton"),
  planStatusDot: document.getElementById("planStatusDot"),
  topAdSlot: document.getElementById("topAdSlot"),
  middleAdSlot: document.getElementById("middleAdSlot"),
  cookieBanner: document.getElementById("cookieBanner"),
  acceptCookiesButton: document.getElementById("acceptCookiesButton"),
  rejectCookiesButton: document.getElementById("rejectCookiesButton"),
  contactLink: document.getElementById("contactLink"),
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Reset the free usage counter when a new day starts.
function syncUsageForToday() {
  if (state.usageDate !== todayKey()) {
    state.usageDate = todayKey();
    state.usageCount = 0;
    localStorage.setItem(storageKeys.usageDate, state.usageDate);
    localStorage.setItem(storageKeys.usageCount, String(state.usageCount));
  }
}

// Ads are only visible for free users who accepted cookies.
function updateAdsVisibility() {
  const shouldShowAds = !state.isPremium && state.cookieConsent === "accepted";
  elements.topAdSlot.classList.toggle("hidden", !shouldShowAds);
  elements.middleAdSlot.classList.toggle("hidden", !shouldShowAds);
}

function updateCookieBanner() {
  const hasChoice = state.cookieConsent === "accepted" || state.cookieConsent === "rejected";
  elements.cookieBanner.classList.toggle("hidden", hasChoice);
}

// Update plan labels and remaining usage.
function updatePlanUi() {
  syncUsageForToday();

  if (state.isPremium) {
    elements.planName.textContent = "Premium";
    elements.usageText.textContent = "Obegransad anvandning. Inga annonser visas for Premium.";
    elements.upgradeButton.textContent = "Premium aktivt";
    elements.planToggleButton.textContent = "Vaxla till Free";
    elements.planStatusDot.classList.add("premium");
  } else {
    const remaining = Math.max(freeLimit - state.usageCount, 0);
    elements.planName.textContent = "Free";
    elements.usageText.textContent = `${remaining} av ${freeLimit} gratis anvandningar kvar idag. Annonser visas bara efter godkanda cookies.`;
    elements.upgradeButton.textContent = "Upgrade to Premium";
    elements.planToggleButton.textContent = "Aktivera Premium";
    elements.planStatusDot.classList.remove("premium");
  }

  updateAdsVisibility();
}

function setError(message = "") {
  elements.errorBanner.textContent = message;
  elements.errorBanner.classList.toggle("hidden", !message);
}

function setLoading(isLoading) {
  elements.loadingState.classList.toggle("hidden", !isLoading);
  elements.generateButton.disabled = isLoading;
  elements.generateButton.textContent = isLoading ? "Bearbetar..." : "Generera med AI";
}

function renderMeta(data) {
  const details = [`${data.title}`, data.subtitle];

  if (data.plan === "premium") {
    details.push("Premium-lage aktivt");
  } else if (typeof data.usage?.remaining === "number") {
    details.push(`${data.usage.remaining} gratis korningar kvar idag`);
  }

  elements.resultMeta.textContent = details.join(" | ");
  elements.resultMeta.classList.remove("hidden");
}

// Render cards for summary, quiz or flashcards.
function renderResults(data) {
  elements.resultsGrid.innerHTML = "";
  elements.emptyState.classList.add("hidden");

  data.items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-card";

    let inner = `<p class="card-kicker">${data.mode}</p><h4>${item.heading}</h4>`;

    if (item.type === "summary") {
      inner += `<p>${item.content}</p>`;
    }

    if (item.type === "quiz") {
      inner += `<p>${item.content}</p>`;
      inner += `<p class="answer"><strong>Exempelsvar:</strong> ${item.answer}</p>`;
    }

    if (item.type === "flashcard") {
      inner += `<p><strong>Framsida:</strong> ${item.front}</p>`;
      inner += `<p class="answer"><strong>Baksida:</strong> ${item.back}</p>`;
    }

    card.innerHTML = inner;
    elements.resultsGrid.appendChild(card);
  });
}

async function submitText() {
  syncUsageForToday();
  setError("");

  const text = elements.textInput.value.trim();
  if (!text) {
    setError("Klistra in text innan du genererar innehall.");
    return;
  }

  if (!state.isPremium && state.usageCount >= freeLimit) {
    setError("Du har natt 3 gratis anvandningar idag. Aktivera Premium for obegransad anvandning.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        mode: state.selectedMode,
        isPremium: state.isPremium,
        usageCount: state.usageCount,
        usageDate: state.usageDate,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Nagot gick fel vid bearbetningen.");
    }

    if (!state.isPremium) {
      state.usageDate = data.usage.todayKey;
      state.usageCount += 1;
      localStorage.setItem(storageKeys.usageDate, state.usageDate);
      localStorage.setItem(storageKeys.usageCount, String(state.usageCount));
    }

    updatePlanUi();
    renderMeta(data);
    renderResults(data);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
}

function selectMode(mode) {
  state.selectedMode = mode;
  elements.modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
}

// Fake premium toggle used only for UI demonstration.
function togglePremium() {
  state.isPremium = !state.isPremium;
  localStorage.setItem(storageKeys.premium, String(state.isPremium));
  updatePlanUi();

  if (state.isPremium) {
    setError("");
  }
}

function setCookieConsent(value) {
  state.cookieConsent = value;
  localStorage.setItem(storageKeys.cookieConsent, value);
  updateCookieBanner();
  updateAdsVisibility();
}

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => selectMode(button.dataset.mode));
});

elements.generateButton.addEventListener("click", submitText);
elements.upgradeButton.addEventListener("click", togglePremium);
elements.planToggleButton.addEventListener("click", togglePremium);
elements.acceptCookiesButton.addEventListener("click", () => setCookieConsent("accepted"));
elements.rejectCookiesButton.addEventListener("click", () => setCookieConsent("rejected"));
elements.contactLink.addEventListener("click", (event) => {
  event.preventDefault();
  alert("Kontakt: support@studyturbo-ai.example");
});

updatePlanUi();
updateCookieBanner();
selectMode(state.selectedMode);
