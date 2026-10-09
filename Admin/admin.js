let orders = [];
let selectedOrderId = null;
let editingOrderId = null;
let toastTimeout;
let databaseStatus = "Conectando con Supabase…";
let loadError = "";

const ordersBody = document.querySelector("#orders-body");
const searchInput = document.querySelector("#order-search");
const viewSelect = document.querySelector("#order-view");
const contextMenu = document.querySelector("#context-menu");
const contextBackdrop = document.querySelector("#context-backdrop");
const orderDialog = document.querySelector("#order-dialog");
const orderForm = document.querySelector("#order-form");
const excelFile = document.querySelector("#excel-file");
const authPanel = document.querySelector("#auth-panel");
const adminWorkspace = document.querySelector("#admin-workspace");
const loginForm = document.querySelector("#login-form");
const authMessage = document.querySelector("#auth-message");
const loginSubmit = document.querySelector("#login-submit");
const signOutButton = document.querySelector("#sign-out");

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function formatCount(count) {
  return `${count} ${count === 1 ? "envío" : "envíos"}`;
}

function createCell(value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value === true ? "Sí" : value === false ? "No" : value ?? "";
  if (className) cell.className = className;
  return cell;
}

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("es-CR");
}

function mapDatabaseOrder(row) {
  return {
    id_excel: String(row.id_excel),
    tracking_code: row.tracking_code ?? "",
    cliente_nombre: row.cliente_nombre ?? "",
    cliente_telefono: row.cliente_telefono ?? "",
    direccion_entrega: row.direccion_entrega ?? "",
    localidad: row.locality ?? "",
    estado: row.estado_envio ?? "",
    es_activo: row.es_activo ?? true,
    fecha_creacion: row.fecha_creacion ?? "",
    ultima_actualizacion: row.ultima_actualizacion ?? "",
    notificacion_pendiente: row.notificacion_pendiente ?? false,
  };
}

function mapFormOrder(formData) {
  return {
    tracking_code: String(formData.get("tracking_code")).trim(),
    cliente_nombre: String(formData.get("cliente_nombre")).trim(),
    cliente_telefono: String(formData.get("cliente_telefono")).trim(),
    direccion_entrega: String(formData.get("direccion_entrega")).trim(),
    locality: String(formData.get("localidad")).trim(),
  };
}

async function loadOrders() {
  databaseStatus = "Conectando con Supabase…";
  loadError = "";
  renderOrders();

  try {
    const { data, error } = await window.supabaseClient
      .from("envios")
      .select("*")
      .order("id_excel", { ascending: false });
    if (error) throw error;
    orders = data.map(mapDatabaseOrder);
    databaseStatus = "Conectado a Supabase";
  } catch (error) {
    databaseStatus = "Error al cargar desde Supabase";
    loadError = error.message || "Error desconocido al cargar los envíos.";
    showToast(`No se pudieron cargar los envíos: ${loadError}`);
  }

  renderOrders();
}

function showLogin(message = "") {
  authPanel.hidden = false;
  adminWorkspace.hidden = true;
  signOutButton.hidden = true;
  authMessage.textContent = message;
  databaseStatus = "Inicia sesión para consultar los envíos";
  orders = [];
  renderOrders();
}

async function startAdminSession(session) {
  if (session?.user?.app_metadata?.role !== "admin") {
    await window.supabaseClient.auth.signOut();
    showLogin("Esta cuenta no tiene permisos de administración.");
    return;
  }

  authMessage.textContent = "";
  authPanel.hidden = true;
  adminWorkspace.hidden = false;
  signOutButton.hidden = false;
  await loadOrders();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginSubmit.disabled = true;
  authMessage.textContent = "";
  const formData = new FormData(loginForm);

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email: String(formData.get("email")).trim(),
      password: String(formData.get("password")),
    });
    if (error) throw error;
    await startAdminSession(data.session);
  } catch (error) {
    authMessage.textContent = error.message || "No se pudo iniciar sesión.";
  } finally {
    loginSubmit.disabled = false;
  }
});

signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;
  try {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw error;
    showLogin("Sesión cerrada.");
    loginForm.reset();
  } catch (error) {
    showToast(`No se pudo cerrar la sesión: ${error.message || "Error desconocido."}`);
  } finally {
    signOutButton.disabled = false;
  }
});

function renderOrders() {
  const query = normalize(searchInput.value.trim());
  const selectedView = viewSelect.value;
  const visibleOrders = orders.filter((order) => {
    const matchesView = (selectedView === "active") === order.es_activo;
    const matchesSearch = !query || Object.values(order).some((value) => normalize(value).includes(query));
    return matchesView && matchesSearch;
  });

  ordersBody.replaceChildren();
  for (const order of visibleOrders) {
    const row = document.createElement("tr");
    row.dataset.orderId = order.id_excel;
    row.tabIndex = 0;
    row.setAttribute("aria-label", `Envío ${order.id_excel}: ${order.tracking_code}`);
    if (order.id_excel === selectedOrderId) row.classList.add("is-selected");
    row.append(
      createCell(order.id_excel),
      createCell(order.tracking_code),
      createCell(order.cliente_nombre),
      createCell(order.cliente_telefono),
      createCell(order.direccion_entrega),
      createCell(order.localidad),
      createCell(order.estado),
      createCell(order.es_activo),
      createCell(formatTimestamp(order.fecha_creacion)),
      createCell(formatTimestamp(order.ultima_actualizacion)),
      createCell(order.notificacion_pendiente),
    );
    ordersBody.append(row);
  }

  document.querySelector("#result-count").textContent = formatCount(visibleOrders.length);
  document.querySelector("#view-label").textContent = selectedView === "active" ? "Envíos activos" : "Historial";
  const emptyState = document.querySelector("#empty-state");
  emptyState.hidden = visibleOrders.length !== 0;
  document.querySelector("#empty-message").textContent = loadError
    ? `No se pudieron cargar los datos: ${loadError}`
    : query
      ? "Intenta con otro nombre, teléfono, tracking code o localidad."
      : "No hay envíos en esta vista.";
  document.querySelector("#table-summary").textContent = databaseStatus;
}

function closeContextMenu() {
  contextMenu.hidden = true;
  contextBackdrop.hidden = true;
}

function openContextMenu(row, x, y) {
  selectedOrderId = row.dataset.orderId;
  renderOrders();
  contextMenu.hidden = false;
  contextBackdrop.hidden = false;
  const menuWidth = 185;
  const menuHeight = 87;
  contextMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8))}px`;
  contextMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8))}px`;
  contextMenu.querySelector("button").focus();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function openOrderDialog(order = null) {
  closeContextMenu();
  editingOrderId = order?.id_excel ?? null;
  orderForm.reset();
  document.querySelector("#dialog-title").textContent = order ? "Editar envío" : "Agregar envío";
  document.querySelector("#field-id").value = order?.id_excel ?? "Se genera al guardar";
  document.querySelector("#field-tracking").value = order?.tracking_code ?? "";
  document.querySelector("#field-name").value = order?.cliente_nombre ?? "";
  document.querySelector("#field-phone").value = order?.cliente_telefono ?? "";
  document.querySelector("#field-address").value = order?.direccion_entrega ?? "";
  document.querySelector("#field-locality").value = order?.localidad ?? "";
  orderDialog.showModal();
  document.querySelector("#field-tracking").focus();
}

document.querySelector("#add-order").addEventListener("click", () => openOrderDialog());
document.querySelector("#close-dialog").addEventListener("click", () => orderDialog.close());
document.querySelector("#cancel-dialog").addEventListener("click", () => orderDialog.close());
searchInput.addEventListener("input", renderOrders);
viewSelect.addEventListener("change", () => {
  selectedOrderId = null;
  renderOrders();
});

ordersBody.addEventListener("contextmenu", (event) => {
  const row = event.target.closest("tr[data-order-id]");
  if (!row) return;
  event.preventDefault();
  openContextMenu(row, event.clientX, event.clientY);
});

ordersBody.addEventListener("keydown", (event) => {
  const row = event.target.closest("tr[data-order-id]");
  if (row && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
    event.preventDefault();
    const bounds = row.getBoundingClientRect();
    openContextMenu(row, bounds.left + 20, bounds.bottom);
  }
});

contextBackdrop.addEventListener("click", closeContextMenu);
contextMenu.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const order = orders.find((item) => item.id_excel === selectedOrderId);
  if (!order) return closeContextMenu();
  if (action === "edit") openOrderDialog(order);
  if (action === "delete") {
    closeContextMenu();
    if (window.confirm(`¿Borrar el envío ${order.tracking_code}?`)) {
      try {
        const { error } = await window.supabaseClient
          .from("envios")
          .delete()
          .eq("id_excel", order.id_excel)
          .select("id_excel")
          .single();
        if (error) throw error;
        orders = orders.filter((item) => item.id_excel !== order.id_excel);
        selectedOrderId = null;
        renderOrders();
        showToast("Envío borrado.");
      } catch (error) {
        showToast(`No se pudo borrar el envío: ${error.message || "Error desconocido."}`);
      }
    }
  }
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(orderForm);
  const existingOrder = orders.find((order) => order.id_excel === editingOrderId);
  const trackingCode = String(formData.get("tracking_code")).trim();
  const duplicateTracking = orders.some((order) =>
    order.tracking_code === trackingCode && order.id_excel !== editingOrderId
  );
  if (duplicateTracking) {
    showToast("Ya existe un envío con ese tracking code.");
    document.querySelector("#field-tracking").focus();
    return;
  }
  const payload = mapFormOrder(formData);
  const saveButton = orderForm.querySelector('[type="submit"]');
  saveButton.disabled = true;
  try {
    let savedOrder;
    if (existingOrder) {
      const { data, error } = await window.supabaseClient
        .from("envios")
        .update(payload)
        .eq("id_excel", existingOrder.id_excel)
        .select("*")
        .single();
      if (error) throw error;
      savedOrder = mapDatabaseOrder(data);
      orders = orders.map((order) => order.id_excel === editingOrderId ? savedOrder : order);
      showToast("Envío actualizado.");
    } else {
      const { data, error } = await window.supabaseClient
        .from("envios")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      savedOrder = mapDatabaseOrder(data);
      orders = [savedOrder, ...orders];
      showToast("Envío agregado.");
    }
    databaseStatus = "Conectado a Supabase";
    loadError = "";
    viewSelect.value = savedOrder.es_activo ? "active" : "history";
    searchInput.value = "";
    selectedOrderId = savedOrder.id_excel;
    orderDialog.close();
    renderOrders();
  } catch (error) {
    showToast(`No se pudo guardar el envío: ${error.message || "Error desconocido."}`);
  } finally {
    saveButton.disabled = false;
  }
});

document.querySelector("#import-orders").addEventListener("click", () => excelFile.click());
excelFile.addEventListener("change", async () => {
  const file = excelFile.files?.[0];
  if (!file) return;
  try {
    if (!window.XLSX) throw new Error("No se pudo cargar el lector de Excel. Revisa tu conexión e inténtalo de nuevo.");
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = window.XLSX.utils.sheet_to_csv(sheet);
    const csvWorkbook = window.XLSX.read(csv, { type: "string" });
    const rows = window.XLSX.utils.sheet_to_json(csvWorkbook.Sheets[csvWorkbook.SheetNames[0]], {
      header: 1,
      defval: "",
      raw: false,
    });
    const fieldNames = [
      "id_excel",
      "tracking_code",
      "cliente_nombre",
      "cliente_telefono",
      "direccion_entrega",
      "localidad",
    ];
    const aliases = [
      ["id", "idexcel"],
      ["trackingcode", "codigo", "codigotracking"],
      ["clientenombre", "nombrecliente", "nombre"],
      ["clientetelefono", "telefonocliente", "telefono"],
      ["direccionentrega", "direccion"],
      ["locality", "localidad"],
    ];
    const firstRow = rows[0] ?? [];
    const normalizedHeaders = firstRow.map((value) =>
      normalize(value).replace(/[^a-z0-9]/g, "")
    );
    const hasHeaders = normalizedHeaders.some((header) =>
      aliases.some((fieldAliases) => fieldAliases.includes(header))
    );
    const columnIndexes = hasHeaders
      ? fieldNames.map((_, index) => {
        const headerIndex = normalizedHeaders.findIndex((header) => aliases[index].includes(header));
        return headerIndex < 0 ? index : headerIndex;
      })
      : fieldNames.map((_, index) => index);
    const dataRows = hasHeaders ? rows.slice(1) : rows;
    const imported = [];
    const usedTrackingCodes = new Set(orders.map((order) => order.tracking_code));
    for (const row of dataRows) {
      if (!row.some((value) => String(value).trim())) continue;
      const values = columnIndexes.map((index) => row[index] ?? "");
      const trackingCode = String(values[1]).trim();
      if (!trackingCode) throw new Error("Hay una fila sin tracking_code; este campo es obligatorio.");
      if (usedTrackingCodes.has(trackingCode)) throw new Error(`El tracking code ${trackingCode} ya existe.`);
      usedTrackingCodes.add(trackingCode);
      imported.push({
        tracking_code: trackingCode,
        cliente_nombre: String(values[2]).trim(),
        cliente_telefono: String(values[3]).trim(),
        direccion_entrega: String(values[4]).trim(),
        locality: String(values[5]).trim(),
      });
    }

    if (!imported.length) {
      showToast("El archivo no contiene envíos. Revisa las columnas A-F; el ID de A se ignora y Supabase lo genera automáticamente.");
    } else {
      const { data, error } = await window.supabaseClient
        .from("envios")
        .insert(imported)
        .select("*");
      if (error) throw error;
      if (data.length !== imported.length) {
        throw new Error("Supabase no confirmó todos los envíos importados. Revisa las políticas de acceso.");
      }
      const importedOrders = data.map(mapDatabaseOrder);
      orders = [...importedOrders, ...orders];
      databaseStatus = "Conectado a Supabase";
      loadError = "";
      viewSelect.value = "active";
      searchInput.value = "";
      renderOrders();
      showToast(`${formatCount(importedOrders.length)} importados correctamente.`);
    }
  } catch (error) {
    showToast(error.message || "No se pudo leer el archivo seleccionado.");
  } finally {
    excelFile.value = "";
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (event.key === "Escape") closeContextMenu();
});

window.addEventListener("resize", closeContextMenu);
window.addEventListener("scroll", closeContextMenu, true);
renderOrders();

async function restoreAdminSession() {
  if (!window.supabaseClient) {
    showLogin("No se pudo cargar Supabase. Revisa la configuración del cliente.");
    loginSubmit.disabled = true;
    return;
  }

  try {
    const { data, error } = await window.supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session) {
      await startAdminSession(data.session);
    } else {
      showLogin();
    }
  } catch (error) {
    showLogin(`No se pudo verificar la sesión: ${error.message || "Error desconocido."}`);
  }
}

restoreAdminSession();