const tabs = Array.from(document.querySelectorAll(".nav-tab"));
const panels = Array.from(document.querySelectorAll(".tab-panel"));
const themeToggle = document.querySelector("#theme-toggle");
const currentYear = document.querySelector("#current-year");

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
