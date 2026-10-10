const tabs = Array.from(document.querySelectorAll(".nav-tab"));
const panels = Array.from(document.querySelectorAll(".tab-panel"));
const themeToggle = document.querySelector("#theme-toggle");
const currentYear = document.querySelector("#current-year");
const trackingForm = document.querySelector("#tracking-form");
const trackingInput = document.querySelector("#order-code");
const trackingButton = trackingForm.querySelector('[type="submit"]');
const trackingResult = document.querySelector("#tracking-result");

function activateTab(tab, moveFocus = false) {
  const selectedTab = tab.dataset.tab;

  for (const item of tabs) {
    const isActive = item === tab;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", String(isActive));
    item.tabIndex = isActive ? 0 : -1;
  }

  for (const panel of panels) {
    panel.hidden = panel.dataset.panel !== selectedTab;
  }

  if (moveFocus) {
    tab.focus();
  }
}

for (const tab of tabs) {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (event) => {
    const currentIndex = tabs.indexOf(tab);
    let nextIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    activateTab(tabs[nextIndex], true);
  });
}

for (const link of document.querySelectorAll("[data-tab-link]")) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const destination = link.dataset.tabLink;
    const tab = tabs.find((item) => item.dataset.tab === destination);

    if (tab) {
      activateTab(tab);
      document.querySelector("#panel-" + destination).focus();
    }
  });
}

function setDarkMode(enabled) {
  document.body.classList.toggle("dark-mode", enabled);
  themeToggle.setAttribute("aria-pressed", String(enabled));
  themeToggle.setAttribute(
    "aria-label",
    enabled ? "Activar modo claro" : "Activar modo oscuro",
  );
  themeToggle.querySelector(".theme-icon").textContent = enabled ? "☀" : "☾";
  themeToggle.querySelector(".theme-label").textContent = enabled
    ? "Modo claro"
    : "Modo oscuro";
}

let savedTheme = null;
try {
  savedTheme = window.localStorage.getItem("ji-express-theme");
} catch (error) {
  console.warn("No se pudo leer la preferencia del tema guardada.", error);
}

setDarkMode(savedTheme === "dark");

themeToggle.addEventListener("click", () => {
  const enabled = !document.body.classList.contains("dark-mode");
  setDarkMode(enabled);

  try {
    window.localStorage.setItem("ji-express-theme", enabled ? "dark" : "light");
  } catch (error) {
    console.warn("No se pudo guardar la preferencia del tema.", error);
  }
});

currentYear.textContent = String(new Date().getFullYear());

function formatTrackingDate(value) {
  if (!value) return "No disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("es-CR");
}

function appendTrackingField(list, label, value) {
  const item = document.createElement("div");
  item.className = "tracking-detail";
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value === true ? "Sí" : value === false ? "No" : String(value || "No disponible");
  item.append(term, description);
  list.append(item);
}

const trackingStages = ["Empaquetando", "En tránsito", "Listo para recoger"];
const trackingStageTypes = ["packaging", "transit", "ready"];

function normalizeTrackingStatus(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function renderTrackingOrder(order) {
  trackingResult.replaceChildren();
  trackingResult.classList.add("has-order");

  const normalizedStatus = normalizeTrackingStatus(order.estado_envio);
  const currentStageIndex = trackingStages.findIndex((stage) =>
    normalizedStatus.includes(normalizeTrackingStatus(stage))
  );

  const heading = document.createElement("div");
  heading.className = "tracking-status-heading";
  const caption = document.createElement("span");
  caption.className = "tracking-status-caption";
  caption.textContent = "Estado del envío";
  const status = document.createElement("strong");
  status.className = "tracking-status-value";
  status.textContent = order.estado_envio || "Pendiente de actualización";
  heading.append(caption, status);

  const steps = document.createElement("ol");
  steps.className = "tracking-steps";
  steps.setAttribute("aria-label", "Progreso del envío");
  trackingStages.forEach((stage, index) => {
    const item = document.createElement("li");
    item.className = "tracking-step";
    if (index < currentStageIndex) item.classList.add("is-complete");
    if (index === currentStageIndex) {
      item.classList.add("is-current");
      item.setAttribute("aria-current", "step");
    }

    const marker = document.createElement("span");
    marker.className = `tracking-step-marker tracking-step-marker--${trackingStageTypes[index]}`;
    marker.setAttribute("aria-hidden", "true");
    const parcel = document.createElement("span");
    parcel.className = "tracking-parcel-icon";
    parcel.textContent = "📦";
    marker.append(parcel);

    if (index === 0) {
      const tape = document.createElement("span");
      tape.className = "tracking-tape-mark";
      marker.append(tape);
    } else if (index === 1) {
      const truck = document.createElement("span");
      truck.className = "tracking-truck-icon";
      truck.textContent = "🚚";
      marker.append(truck);
    } else {
      const readyMark = document.createElement("span");
      readyMark.className = "tracking-ready-mark";
      readyMark.textContent = "✓";
      marker.append(readyMark);
    }

    const label = document.createElement("span");
    label.className = "tracking-step-label";
    label.textContent = stage;
    item.append(marker, label);
    steps.append(item);
  });

  const details = document.createElement("dl");
  details.className = "tracking-details";
  appendTrackingField(details, "Tracking code", order.tracking_code);
  appendTrackingField(details, "Última actualización", formatTrackingDate(order.ultima_actualizacion));

  trackingResult.append(heading, steps, details);
}

trackingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const trackingCode = trackingInput.value.trim();
  if (!trackingCode) return;

  trackingButton.disabled = true;
  trackingButton.textContent = "Buscando…";
  trackingResult.classList.remove("has-order", "is-error");
  trackingResult.textContent = "Consultando el estado de tu pedido…";

  try {
    if (!window.supabaseClient) {
      throw new Error("No se pudo conectar con el servicio. Inténtalo más tarde.");
    }

    const { data, error } = await window.supabaseClient.rpc("consultar_envio", {
      p_tracking_code: trackingCode,
    });
    if (error) throw error;
    if (!data) {
      trackingResult.textContent = "No encontramos un pedido con ese código. Verifica los datos e inténtalo de nuevo.";
      return;
    }

    renderTrackingOrder(data);
  } catch (error) {
    trackingResult.classList.add("is-error");
    trackingResult.textContent = error.message || "No se pudo consultar el pedido. Inténtalo de nuevo.";
  } finally {
    trackingButton.disabled = false;
    trackingButton.textContent = "Buscar pedido";
  }
});
