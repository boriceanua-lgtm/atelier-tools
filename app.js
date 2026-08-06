const state = {
  mode: "frequency",
  installPrompt: null
};

const defaults = {
  diameter: 200,
  frequency: 9,
  targetSpeed: 300,
  motorRpm: 1320,
  nominalFrequency: 50,
  ratioOne: 20,
  ratioTwo: 25
};

const elements = {
  diameter: document.getElementById("diameter"),
  frequency: document.getElementById("frequency"),
  targetSpeed: document.getElementById("targetSpeed"),
  motorRpm: document.getElementById("motorRpm"),
  nominalFrequency: document.getElementById("nominalFrequency"),
  ratioOne: document.getElementById("ratioOne"),
  ratioTwo: document.getElementById("ratioTwo"),
  frequencyField: document.getElementById("frequencyField"),
  targetSpeedField: document.getElementById("targetSpeedField"),
  mainResultLabel: document.getElementById("mainResultLabel"),
  mainResult: document.getElementById("mainResult"),
  outputRpm: document.getElementById("outputRpm"),
  secondsPerTurn: document.getElementById("secondsPerTurn"),
  totalRatio: document.getElementById("totalRatio"),
  warningBox: document.getElementById("warningBox"),
  modeFromFrequency: document.getElementById("modeFromFrequency"),
  modeFromSpeed: document.getElementById("modeFromSpeed"),
  installButton: document.getElementById("installButton"),
  resetSettings: document.getElementById("resetSettings"),
  rotatorModule: document.getElementById("rotatorModule"),
  comingSoonModule: document.getElementById("comingSoonModule"),
  offlineStatus: document.getElementById("offlineStatus")
};

function readNumber(element) {
  const value = Number(element.value);
  return Number.isFinite(value) ? value : 0;
}

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0
  }).format(value);
}

function saveState() {
  const saved = {
    mode: state.mode,
    diameter: elements.diameter.value,
    frequency: elements.frequency.value,
    targetSpeed: elements.targetSpeed.value,
    motorRpm: elements.motorRpm.value,
    nominalFrequency: elements.nominalFrequency.value,
    ratioOne: elements.ratioOne.value,
    ratioTwo: elements.ratioTwo.value
  };

  localStorage.setItem("atelierTools.rotator", JSON.stringify(saved));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("atelierTools.rotator"));
    if (!saved) return;

    Object.keys(defaults).forEach((key) => {
      if (saved[key] !== undefined && elements[key]) {
        elements[key].value = saved[key];
      }
    });

    state.mode = saved.mode === "speed" ? "speed" : "frequency";
  } catch {
    localStorage.removeItem("atelierTools.rotator");
  }
}

function updateModeUi() {
  const fromFrequency = state.mode === "frequency";

  elements.frequencyField.hidden = !fromFrequency;
  elements.targetSpeedField.hidden = fromFrequency;
  elements.modeFromFrequency.classList.toggle("active", fromFrequency);
  elements.modeFromSpeed.classList.toggle("active", !fromFrequency);
}

function showWarning(message = "") {
  elements.warningBox.hidden = !message;
  elements.warningBox.textContent = message;
}

function calculate() {
  const diameter = readNumber(elements.diameter);
  const motorRpm = readNumber(elements.motorRpm);
  const nominalFrequency = readNumber(elements.nominalFrequency);
  const ratioOne = readNumber(elements.ratioOne);
  const ratioTwo = readNumber(elements.ratioTwo);
  const totalRatio = ratioOne * ratioTwo;

  elements.totalRatio.textContent = totalRatio > 0
    ? `${formatNumber(totalRatio, 2)} : 1`
    : "—";

  if (
    diameter <= 0 ||
    motorRpm <= 0 ||
    nominalFrequency <= 0 ||
    ratioOne <= 0 ||
    ratioTwo <= 0
  ) {
    elements.mainResult.textContent = "Date invalide";
    elements.outputRpm.textContent = "—";
    elements.secondsPerTurn.textContent = "—";
    showWarning("Verifică valorile introduse.");
    return;
  }

  let outputRpm = 0;
  let frequency = 0;

  if (state.mode === "frequency") {
    frequency = readNumber(elements.frequency);
    outputRpm = (motorRpm * frequency / nominalFrequency) / totalRatio;
    const peripheralSpeed = Math.PI * diameter * outputRpm;

    elements.mainResultLabel.textContent = "Viteza periferică";
    elements.mainResult.textContent = `${formatNumber(peripheralSpeed, 1)} mm/min`;
  } else {
    const targetSpeed = readNumber(elements.targetSpeed);
    outputRpm = targetSpeed / (Math.PI * diameter);
    frequency = outputRpm * totalRatio * nominalFrequency / motorRpm;

    elements.mainResultLabel.textContent = "Frecvența recomandată";
    elements.mainResult.textContent = `${formatNumber(frequency, 2)} Hz`;
  }

  elements.outputRpm.textContent = `${formatNumber(outputRpm, 3)} rpm`;
  elements.secondsPerTurn.textContent = outputRpm > 0
    ? `${formatNumber(60 / outputRpm, 1)} s`
    : "—";

  if (frequency > nominalFrequency) {
    showWarning(
      `Rezultatul depășește frecvența nominală de ${formatNumber(nominalFrequency, 0)} Hz. Verifică limita admisă pentru motor și mecanism.`
    );
  } else if (frequency > 0 && frequency < 5) {
    showWarning(
      "Sub 5 Hz, motorul poate avea răcire și cuplu reduse. Verifică temperatura în utilizare continuă."
    );
  } else {
    showWarning();
  }

  saveState();
}

function resetToDefaults() {
  Object.entries(defaults).forEach(([key, value]) => {
    elements[key].value = value;
  });
  state.mode = "frequency";
  updateModeUi();
  calculate();
}

elements.modeFromFrequency.addEventListener("click", () => {
  state.mode = "frequency";
  updateModeUi();
  calculate();
});

elements.modeFromSpeed.addEventListener("click", () => {
  state.mode = "speed";
  updateModeUi();
  calculate();
});

Object.keys(defaults).forEach((key) => {
  elements[key].addEventListener("input", calculate);
});

elements.resetSettings.addEventListener("click", resetToDefaults);

document.querySelectorAll(".module-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".module-tab").forEach((item) => {
      item.classList.remove("active");
    });
    button.classList.add("active");

    const showRotator = button.dataset.module === "rotator";
    elements.rotatorModule.hidden = !showRotator;
    elements.comingSoonModule.hidden = showRotator;
  });
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.installPrompt = event;
  elements.installButton.hidden = false;
});

elements.installButton.addEventListener("click", async () => {
  if (!state.installPrompt) return;

  state.installPrompt.prompt();
  await state.installPrompt.userChoice;
  state.installPrompt = null;
  elements.installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  elements.installButton.hidden = true;
});

window.addEventListener("online", () => {
  elements.offlineStatus.textContent = "Conexiune activă. Aplicația funcționează și offline.";
});

window.addEventListener("offline", () => {
  elements.offlineStatus.textContent = "Mod offline activ.";
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  });
}

loadState();
updateModeUi();
calculate();
