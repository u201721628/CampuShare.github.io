/* ==========================================================================
   CampuShare - Demo app (basic JavaScript, in-memory state)
   Implements the 30 core user stories designed in Figma
   ("Landing – Vistas demo (30 HU)"). There is no backend or database:
   all data lives in memory and is reset when the page is reloaded.

   Sections
   1. Helpers            6. V2 Detail + V3 Request
   2. State              7. V4 Publish
   3. Routing            8. V5 Loans
   4. Header & dialogs   9. V6 Chat
   5. V1 Catalog        10. V7 Rate & report + init
   ========================================================================== */
(function () {
  "use strict";

  const DATA = window.CampuShareData;
  const HOUR = 3600000;
  const DAY = 24 * HOUR;
  const NOW = new Date();

  /* ======================================================================
     1. Helpers
     ====================================================================== */
  const $ = function (selector, root) {
    return (root || document).querySelector(selector);
  };
  const $$ = function (selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  };

  function escapeHtml(text) {
    return String(text === undefined || text === null ? "" : text).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function icon(name, extraClass) {
    return '<svg class="icon' + (extraClass ? " " + extraClass : "") + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  function normalize(text) {
    return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function formatDate(date) {
    return WEEKDAYS[date.getDay()] + " " + pad(date.getDate()) + "/" + pad(date.getMonth() + 1);
  }

  function formatTime(date) {
    return pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function formatShortDate(date) {
    return pad(date.getDate()) + "/" + pad(date.getMonth() + 1) + "/" + date.getFullYear();
  }

  function relativeTime(date) {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) {
      return "Ahora";
    }
    if (diff < HOUR) {
      return "Hace " + Math.round(diff / 60000) + " min";
    }
    if (diff < DAY && date.getDate() === new Date().getDate()) {
      return formatTime(date);
    }
    if (diff < 2 * DAY) {
      return "Ayer";
    }
    return formatDate(date);
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * DAY);
  }

  function toInputDate(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function fromInputDate(value) {
    const parts = value.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  }

  function daysBetween(from, to) {
    return Math.round((startOfDay(to) - startOfDay(from)) / DAY);
  }

  function uid(prefix) {
    uid.counter = (uid.counter || 0) + 1;
    return prefix + Date.now().toString(36) + uid.counter;
  }

  function randomCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function plural(count, singular, pluralForm) {
    return count + " " + (count === 1 ? singular : pluralForm);
  }

  function showToast(message, type) {
    const region = $("#toast-region");
    const toast = document.createElement("div");
    toast.className = "toast" + (type === "error" ? " toast--error" : "");
    toast.innerHTML = icon(type === "error" ? "alert" : type === "info" ? "info" : "check") + "<span></span>";
    toast.querySelector("span").textContent = message;
    region.appendChild(toast);
    while (region.children.length > 2) {
      region.firstElementChild.remove();
    }
    setTimeout(function () {
      toast.remove();
    }, 4500);
  }

  /* ======================================================================
     2. State (seed data, in memory)
     ====================================================================== */
  function readSessionEmail() {
    try {
      return sessionStorage.getItem("campushare.email");
    } catch (error) {
      return null;
    }
  }

  function nameFromEmail(email) {
    const local = email.split("@")[0];
    if (/^[a-z]+[._][a-z]+/i.test(local)) {
      return local.split(/[._]/).slice(0, 2).map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }).join(" ");
    }
    return "Lucas Arias";
  }

  const myEmail = readSessionEmail() || "u202312345@upc.edu.pe";
  const myName = nameFromEmail(myEmail);

  const users = JSON.parse(JSON.stringify(DATA.users));
  users.me = {
    id: "me", name: myName, initials: myName.split(" ").map(function (p) { return p.charAt(0); }).join("").slice(0, 2).toUpperCase(),
    career: "Ing. de Sistemas", cycle: "6.º ciclo", rating: 4.9, ratings: 18, deals: 20, onTime: 20, incidents: 0
  };

  const REVIEWS = {
    u1: [["Diego G.", 5, "Muy puntual y la calculadora estaba impecable."], ["Lucía P.", 5, "Excelente comunicación por el chat."]],
    u2: [["Andrea R.", 5, "Devolvió el libro antes de la fecha."], ["Kevin M.", 4, "Todo bien, solo llegó 10 minutos tarde."]],
    u3: [["Sofía L.", 5, "La guía me salvó el parcial, ¡gracias!"]],
    u4: [["Andrea R.", 4, "Buen trato."], ["Renato Q.", 3, "La calculadora no traía cable."]],
    u5: [["Lucas A.", 5, "Cuidó mucho el libro."], ["Diego G.", 5, "Puntual en la entrega."]],
    u6: [["Marco T.", 5, "Muy amable."]],
    u7: [["Andrea R.", 2, "Devolvió la calculadora 5 días tarde."], ["Sofía L.", 3, "No respondía el chat."]],
    me: [["Lucía P.", 5, "Me prestó el libro de Química sin problemas."], ["Kevin M.", 5, "Muy organizado con la entrega."]]
  };

  const state = {
    campus: "Monterrico",
    materials: JSON.parse(JSON.stringify(DATA.materials)),
    blocked: {},
    filters: { query: "", onlyAvailable: true, faculty: [], category: [], campus: [], sort: "near" },
    notifications: [],
    requestsSent: [
      { id: "s1", materialId: "m2", from: NOW, to: addDays(NOW, 35), point: "Biblioteca – Sede Monterrico", slot: "Mar 18:00–19:00", status: "pending", createdAt: new Date(NOW - 3 * HOUR) },
      { id: "s2", materialId: "m3", from: addDays(NOW, 1), to: addDays(NOW, 1), point: "Cafetería – Sede San Isidro", slot: "Mié 10:00–11:00", status: "accepted", code: "735104", createdAt: new Date(NOW - 26 * HOUR) },
      { id: "s3", materialId: "m4", from: NOW, to: addDays(NOW, 20), point: "Biblioteca – Sede Villa", slot: "Jue 12:00–13:00", status: "rejected", createdAt: new Date(NOW - 50 * HOUR) }
    ],
    requestsReceived: [
      { id: "r1", materialId: "m7", requesterId: "u5", from: addDays(NOW, 1), to: addDays(NOW, 15), status: "pending", createdAt: new Date(NOW - 2 * HOUR) },
      { id: "r2", materialId: "m7", requesterId: "u7", from: addDays(NOW, 2), to: addDays(NOW, 20), status: "pending", createdAt: new Date(NOW - 5 * HOUR) }
    ],
    deals: [
      { id: "d1", materialId: "m13", role: "lender", otherId: "u5", status: "pending-delivery", point: "Biblioteca – Sede Monterrico", slot: "Hoy 18:00–19:00", code: "482915", days: 30 },
      { id: "d2", materialId: "m15", role: "lender", otherId: "u3", status: "on-loan", point: "Biblioteca – Sede Monterrico", slot: "Lun 12:00–13:00", deliveredAt: addDays(NOW, -25), dueDate: addDays(NOW, 5) },
      { id: "d3", materialId: "m16", role: "borrower", otherId: "u1", status: "on-loan", point: "Biblioteca – Sede Monterrico", slot: "Jue 12:00–13:00", deliveredAt: addDays(NOW, -28), dueDate: new Date(NOW.getTime() + 44 * HOUR) },
      { id: "d4", materialId: "m17", role: "borrower", otherId: "u2", status: "on-loan", point: "Biblioteca – Sede San Isidro", slot: "Mar 18:00–19:00", deliveredAt: addDays(NOW, -12), dueDate: addDays(NOW, 18) }
    ],
    history: [
      { id: "h1", title: "Juego de reglas técnicas", role: "lender", otherId: "u6", closedAt: addDays(NOW, -20), rating: 5, condition: "Buen estado" },
      { id: "h2", title: "Atlas de anatomía Netter", role: "borrower", otherId: "u3", closedAt: addDays(NOW, -45), rating: 5, condition: "Buen estado" }
    ],
    conversations: [
      { id: "c1", userId: "u1", materialId: "m16", unread: 2, messages: [
        { from: "them", text: "Hola, ¿cómo te va con la calculadora?", time: new Date(NOW - 26 * HOUR) },
        { from: "me", text: "¡Hola Andrea! Muy bien, la necesito hasta el jueves para el parcial.", time: new Date(NOW - 25 * HOUR) },
        { from: "them", text: "Perfecto. Recuerda que la devolución es en la biblioteca de Monterrico.", time: new Date(NOW - 40 * 60000) },
        { from: "them", text: "Si necesitas más tiempo me avisas por aquí 😊", time: new Date(NOW - 38 * 60000) }
      ] },
      { id: "c2", userId: "u5", materialId: "m13", unread: 1, messages: [
        { from: "me", text: "Hola Kevin, te entrego el Stewart hoy a las 6 pm en la biblioteca.", time: new Date(NOW - 3 * HOUR) },
        { from: "them", text: "¡Genial! Ahí estaré. ¿Te muestro el código en la app?", time: new Date(NOW - 70 * 60000) }
      ] },
      { id: "c3", userId: "u2", materialId: "m17", unread: 0, messages: [
        { from: "me", text: "Gracias por prestarme el Serway, lo cuido mucho.", time: new Date(NOW - 30 * HOUR) },
        { from: "them", text: "Gracias por avisar 🙌", time: new Date(NOW - 29 * HOUR) }
      ] },
      { id: "c4", userId: "u3", materialId: "m3", unread: 0, messages: [
        { from: "them", text: "Acepté tu solicitud de la guía. Nos vemos en la cafetería de San Isidro.", time: new Date(NOW - 50 * HOUR) },
        { from: "me", text: "¡Gracias Lucía! Te confirmo mañana.", time: new Date(NOW - 49 * HOUR) }
      ] }
    ],
    activeConversation: null,
    publishStep: 1,
    publishPhoto: null
  };

  function material(id) {
    return state.materials.find(function (item) {
      return item.id === id;
    });
  }

  function proximityOf(item) {
    return DATA.campusDistance[state.campus][item.campus] || "far";
  }

  function addNotification(text, kind, iconName) {
    state.notifications.unshift({ id: uid("n"), text: text, kind: kind || "info", icon: iconName || "bell", time: new Date(), read: false });
    renderNotifications();
  }

  /* ======================================================================
     3. Routing (hash based: #catalog, #publish, #loans, #chat)
     ====================================================================== */
  const VIEWS = { catalog: "Catálogo", publish: "Publicar", loans: "Mis préstamos", chat: "Chat" };
  let firstRoute = true;

  function currentView() {
    const hash = window.location.hash.replace("#", "");
    return VIEWS[hash] ? hash : "catalog";
  }

  function route() {
    const view = currentView();
    $$(".view").forEach(function (section) {
      section.hidden = section.dataset.view !== view;
    });
    $$("[data-nav]").forEach(function (link) {
      if (link.dataset.nav === view) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    document.title = VIEWS[view] + " | Demo CampuShare";
    if (view === "loans") {
      renderLoans();
    }
    if (view === "chat") {
      if (!state.activeConversation && window.matchMedia("(min-width: 48.01rem)").matches && state.conversations.length) {
        openConversation(state.conversations[0].id);
      }
      renderConversations();
      renderThread();
    }
    if (view === "publish") {
      renderPublications();
    }
    if (!firstRoute) {
      window.scrollTo(0, 0);
      const heading = $("#view-" + view + " h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
    firstRoute = false;
  }

  function go(view) {
    if (window.location.hash === "#" + view) {
      route();
    } else {
      window.location.hash = view;
    }
  }

  /* ======================================================================
     4. Header (notifications, profile) and dialog helpers
     ====================================================================== */
  function renderNotifications() {
    const list = $("#notification-list");
    const unread = state.notifications.filter(function (n) {
      return !n.read;
    }).length;
    $("#bell-dot").hidden = unread === 0;
    $("#bell-label").textContent = unread ? "Notificaciones, " + plural(unread, "sin leer", "sin leer") : "Notificaciones";
    if (state.notifications.length === 0) {
      list.innerHTML = '<li class="notification">No tienes notificaciones.</li>';
      return;
    }
    list.innerHTML = state.notifications.map(function (n) {
      return '<li class="notification' + (n.read ? "" : " notification--unread") + '">' +
        '<span class="notification__icon notification__icon--' + n.kind + '">' + icon(n.icon) + "</span>" +
        "<div><p>" + escapeHtml(n.text) + "</p><time>" + relativeTime(n.time) + "</time></div></li>";
    }).join("");
  }

  function setupPopover(buttonId, popoverId) {
    const button = document.getElementById(buttonId);
    const popover = document.getElementById(popoverId);
    function close() {
      popover.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      const willOpen = popover.hidden;
      $$(".popover").forEach(function (other) {
        other.hidden = true;
      });
      $$("[aria-haspopup]").forEach(function (other) {
        other.setAttribute("aria-expanded", "false");
      });
      popover.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));
      if (willOpen && popoverId === "notifications") {
        renderNotifications();
      }
    });
    popover.addEventListener("click", function (event) {
      event.stopPropagation();
    });
    document.addEventListener("click", close);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !popover.hidden) {
        close();
        button.focus();
      }
    });
  }

  const dialogOpeners = new WeakMap();

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog.open) {
      dialogOpeners.set(dialog, document.activeElement);
      dialog.showModal();
    }
    const focusTarget = dialog.querySelector("[autofocus]") || dialog.querySelector(".modal__body input, .modal__body button, .modal__body textarea, .modal__body a");
    if (focusTarget) {
      focusTarget.focus();
    }
    return dialog;
  }

  function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog.open) {
      dialog.close();
    }
  }

  function setupDialogs() {
    $$("dialog.modal").forEach(function (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) {
          dialog.close();
        }
        if (event.target.closest("[data-close]")) {
          dialog.close();
        }
      });
      dialog.addEventListener("close", function () {
        const opener = dialogOpeners.get(dialog);
        if (opener && document.body.contains(opener) && typeof opener.focus === "function") {
          opener.focus();
        }
      });
    });
  }

  let confirmAction = null;

  function confirmDialog(title, text, okLabel, onConfirm) {
    $("#confirm-title").textContent = title;
    $("#confirm-text").textContent = text;
    $("#confirm-ok").textContent = okLabel || "Confirmar";
    confirmAction = onConfirm;
    openDialog("confirm-dialog");
    $("#confirm-ok").focus();
  }

  /* ======================================================================
     5. V1 Catalog (HU010, HU011, HU013, HU029, HU030, HU032)
     ====================================================================== */
  function visibleInCatalog(item) {
    if (state.blocked[item.ownerId]) {
      return false;
    }
    if (item.status === "paused" || item.status === "withdrawn") {
      return false;
    }
    // HU013: materials with a confirmed delivery are hidden while "only available" is on
    if (state.filters.onlyAvailable && item.status !== "available") {
      return false;
    }
    return true;
  }

  function matchesQuery(item, query) {
    if (!query) {
      return true;
    }
    const text = normalize([item.title, item.course, item.code, item.category, item.faculty, item.campus, item.point].join(" "));
    return normalize(query).split(/\s+/).every(function (token) {
      return text.indexOf(token) !== -1;
    });
  }

  function filteredMaterials() {
    const f = state.filters;
    const order = { near: 0, mid: 1, far: 2 };
    return state.materials.filter(function (item) {
      return visibleInCatalog(item) &&
        matchesQuery(item, f.query) &&
        (f.faculty.length === 0 || f.faculty.indexOf(item.faculty) !== -1) &&
        (f.category.length === 0 || f.category.indexOf(item.category) !== -1) &&
        (f.campus.length === 0 || f.campus.indexOf(item.campus) !== -1);
    }).sort(function (a, b) {
      const mine = (a.ownerId === "me") - (b.ownerId === "me");
      if (mine) {
        return mine;
      }
      if (f.sort === "rating") {
        return users[b.ownerId].rating - users[a.ownerId].rating;
      }
      if (f.sort === "title") {
        return a.title.localeCompare(b.title, "es");
      }
      return (order[proximityOf(a)] - order[proximityOf(b)]) || (users[b.ownerId].rating - users[a.ownerId].rating);
    });
  }

  function statusBadge(item) {
    const kind = { available: "ok", reserved: "warn", "on-loan": "info", paused: "mute", withdrawn: "mute" }[item.status];
    return '<span class="badge badge--' + kind + '">' + DATA.statusLabel[item.status] + "</span>";
  }

  function materialMedia(item, size) {
    if (item.photo) {
      return '<img src="' + item.photo + '" alt="Foto de ' + escapeHtml(item.title) + '">';
    }
    return icon("book", size);
  }

  function materialCard(item) {
    const owner = users[item.ownerId];
    const proximity = proximityOf(item);
    const mine = item.ownerId === "me";
    let action;
    if (mine) {
      action = '<a class="btn btn--secondary btn--sm btn--block" href="#publish">Tu publicación</a>';
    } else if (item.status === "available") {
      action = '<button class="btn btn--primary btn--sm btn--block" type="button" data-request="' + item.id + '">' +
        (item.modality === "donation" ? "Pedir donación" : item.modality === "exchange" ? "Proponer intercambio" : "Solicitar préstamo") + "</button>";
    } else {
      action = '<button class="btn btn--secondary btn--sm btn--block" type="button" data-notify="' + item.id + '">Avisarme si se libera</button>';
    }
    return '<li class="material-card">' +
      '<div class="material-card__media">' + materialMedia(item) + "</div>" +
      '<div class="material-card__body">' +
        '<div class="material-card__top">' + statusBadge(item) +
          '<span class="rating" aria-label="Calificación del dueño: ' + owner.rating.toFixed(1) + ' de 5">' + icon("star") + owner.rating.toFixed(1) + "</span></div>" +
        '<button class="material-card__button" type="button" data-detail="' + item.id + '"><h3 class="material-card__title">' + escapeHtml(item.title) + "</h3></button>" +
        '<p class="material-card__meta">' + icon("book") + escapeHtml(item.course) + " · " + escapeHtml(item.category) + "</p>" +
        '<p class="material-card__meta' + (proximity === "near" ? " material-card__point--same" : "") + '">' + icon("pin") + escapeHtml(item.point) + "</p>" +
        '<div class="material-card__footer"><span class="proximity proximity--' + proximity + '">' + DATA.proximityLabel[proximity] + "</span>" +
          "<span>" + DATA.modalityLabel[item.modality] + " · " + escapeHtml(owner.name.split(" ")[0] + " " + owner.name.split(" ")[1].charAt(0) + ".") + "</span></div>" +
        '<div class="material-card__actions">' + action + "</div>" +
      "</div></li>";
  }

  function renderCatalog() {
    const results = filteredMaterials();
    const grid = $("#results-grid");
    const query = state.filters.query.trim();
    $("#results-title").textContent = query ? "Resultados para “" + query + "”" : "Todos los materiales";
    $("#results-count").textContent = plural(results.length, "material encontrado", "materiales encontrados");

    if (results.length === 0) {
      grid.innerHTML = '<li class="empty-state"><p class="empty-state__title">No hay materiales disponibles' +
        (query ? " para “" + escapeHtml(query) + "”" : " con estos filtros") + "</p>" +
        "<p>Prueba con otro curso o código, quita algunos filtros o desactiva “Solo disponibles”.</p>" +
        '<button class="btn btn--secondary btn--sm" type="button" data-action="reset-filters">Limpiar búsqueda y filtros</button></li>';
    } else {
      grid.innerHTML = results.map(materialCard).join("");
    }

    const active = state.filters.faculty.length + state.filters.category.length + state.filters.campus.length + (state.filters.onlyAvailable ? 0 : 1);
    const badge = $("#filters-count");
    badge.textContent = active ? String(active) : "";
    badge.hidden = active === 0;
    const total = state.materials.filter(function (item) {
      return item.status === "available" && !state.blocked[item.ownerId];
    }).length;
    $("#catalog-subtitle").textContent = total + " materiales disponibles publicados por estudiantes de tu universidad";
  }

  function renderFilterOptions() {
    const groups = { faculty: "#filter-faculty", category: "#filter-category", campus: "#filter-campus" };
    Object.keys(groups).forEach(function (key) {
      const values = [];
      state.materials.forEach(function (item) {
        if (values.indexOf(item[key]) === -1) {
          values.push(item[key]);
        }
      });
      values.sort(function (a, b) {
        return a.localeCompare(b, "es");
      });
      $(groups[key]).innerHTML = values.map(function (value) {
        return '<label class="checkbox"><input type="checkbox" data-filter="' + key + '" value="' + escapeHtml(value) + '"' +
          (state.filters[key].indexOf(value) !== -1 ? " checked" : "") + "><span>" + escapeHtml(value) + "</span></label>";
      }).join("");
    });
  }

  function resetFilters() {
    state.filters.query = "";
    state.filters.faculty = [];
    state.filters.category = [];
    state.filters.campus = [];
    state.filters.onlyAvailable = true;
    $("#catalog-query").value = "";
    $("#only-available").checked = true;
    renderFilterOptions();
    renderCatalog();
  }

  /* --- HU032: suggestions while typing --- */
  let activeSuggestion = -1;
  let currentSuggestions = [];

  function buildSuggestions(query) {
    const q = normalize(query);
    const found = [];
    function add(label, type, value) {
      if (found.length < 6 && !found.some(function (s) { return s.label === label; }) && normalize(label).indexOf(q) !== -1) {
        found.push({ label: label, type: type, value: value || label });
      }
    }
    const available = state.materials.filter(function (item) {
      return item.status === "available" && !state.blocked[item.ownerId];
    });
    available.forEach(function (item) {
      const count = available.filter(function (other) { return other.course === item.course; }).length;
      add(item.course, "Curso · " + item.code + " · " + plural(count, "material", "materiales"), item.course);
      if (normalize(item.code).indexOf(q) !== -1) {
        add(item.code + " – " + item.course, "Código de curso", item.code);
      }
    });
    available.forEach(function (item) {
      add(item.category, "Categoría");
    });
    available.forEach(function (item) {
      add(item.title, "Material");
    });
    available.forEach(function (item) {
      add(item.point, "Punto de recojo");
    });
    return found;
  }

  function highlight(label, query) {
    const index = normalize(label).indexOf(normalize(query));
    if (index === -1) {
      return escapeHtml(label);
    }
    return escapeHtml(label.slice(0, index)) + "<mark>" + escapeHtml(label.slice(index, index + query.length)) + "</mark>" + escapeHtml(label.slice(index + query.length));
  }

  function renderSuggestions() {
    const input = $("#catalog-query");
    const list = $("#suggestions");
    const query = input.value.trim();
    if (query.length < 2) {
      closeSuggestions();
      return;
    }
    currentSuggestions = buildSuggestions(query);
    activeSuggestion = -1;
    if (currentSuggestions.length === 0) {
      list.innerHTML = '<li class="suggestion" role="option" aria-disabled="true"><span class="suggestion__text">Sin sugerencias para “' + escapeHtml(query) + '”</span></li>';
    } else {
      list.innerHTML = currentSuggestions.map(function (s, index) {
        return '<li class="suggestion" role="option" id="suggestion-' + index + '" data-index="' + index + '" aria-selected="false">' +
          icon("search") + '<span class="suggestion__text">' + highlight(s.label, query) + "</span>" +
          '<span class="suggestion__type">' + escapeHtml(s.type) + "</span></li>";
      }).join("");
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function closeSuggestions() {
    $("#suggestions").hidden = true;
    $("#catalog-query").setAttribute("aria-expanded", "false");
    $("#catalog-query").removeAttribute("aria-activedescendant");
    activeSuggestion = -1;
  }

  function moveSuggestion(step) {
    if ($("#suggestions").hidden || currentSuggestions.length === 0) {
      return;
    }
    activeSuggestion = (activeSuggestion + step + currentSuggestions.length) % currentSuggestions.length;
    $$("#suggestions .suggestion").forEach(function (option, index) {
      option.setAttribute("aria-selected", String(index === activeSuggestion));
    });
    $("#catalog-query").setAttribute("aria-activedescendant", "suggestion-" + activeSuggestion);
  }

  function chooseSuggestion(index) {
    const suggestion = currentSuggestions[index];
    if (!suggestion) {
      return;
    }
    $("#catalog-query").value = suggestion.value;
    runSearch();
  }

  function runSearch() {
    state.filters.query = $("#catalog-query").value;
    closeSuggestions();
    renderCatalog();
  }

  function setupCatalog() {
    const input = $("#catalog-query");
    $("#catalog-search").addEventListener("submit", function (event) {
      event.preventDefault();
      if (activeSuggestion >= 0) {
        chooseSuggestion(activeSuggestion);
      } else {
        runSearch();
      }
    });
    input.addEventListener("input", function () {
      renderSuggestions();
      if (input.value.trim() === "" && state.filters.query) {
        state.filters.query = "";
        renderCatalog();
      }
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSuggestion(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSuggestion(-1);
      } else if (event.key === "Escape") {
        closeSuggestions();
      }
    });
    input.addEventListener("blur", function () {
      setTimeout(closeSuggestions, 150);
    });
    $("#suggestions").addEventListener("mousedown", function (event) {
      const option = event.target.closest("[data-index]");
      if (option) {
        event.preventDefault();
        chooseSuggestion(Number(option.dataset.index));
      }
    });

    $("#filters-panel").addEventListener("change", function (event) {
      const target = event.target;
      if (target.id === "only-available") {
        state.filters.onlyAvailable = target.checked;
      } else if (target.dataset.filter) {
        const list = state.filters[target.dataset.filter];
        const position = list.indexOf(target.value);
        if (target.checked && position === -1) {
          list.push(target.value);
        } else if (!target.checked && position !== -1) {
          list.splice(position, 1);
        }
      }
      renderCatalog();
    });
    $("#filters-reset").addEventListener("click", resetFilters);
    $("#filters-toggle").addEventListener("click", function () {
      const panel = $("#filters-panel");
      const open = panel.classList.toggle("is-open");
      this.setAttribute("aria-expanded", String(open));
    });
    $("#sort-select").addEventListener("change", function () {
      state.filters.sort = this.value;
      renderCatalog();
    });
    $("#my-campus").addEventListener("change", function () {
      state.campus = this.value;
      renderCatalog();
      showToast("Ahora la cercanía se calcula desde la sede " + state.campus + ".", "info");
    });

    $("#results-grid").addEventListener("click", function (event) {
      const detail = event.target.closest("[data-detail]");
      const request = event.target.closest("[data-request]");
      const notify = event.target.closest("[data-notify]");
      if (detail) {
        openDetail(detail.dataset.detail);
      } else if (request) {
        openRequest(request.dataset.request);
      } else if (notify) {
        const item = material(notify.dataset.notify);
        addNotification("Te avisaremos cuando “" + item.title + "” vuelva a estar disponible.", "info", "bell");
        showToast("Listo, te avisaremos cuando “" + item.title + "” se libere.");
      } else if (event.target.closest("[data-action='reset-filters']")) {
        resetFilters();
      }
    });
  }

  /* ======================================================================
     6. V2 Detail (HU012, HU022, HU038, HU044, HU050) + V3 Request (HU014, HU016, HU017)
     ====================================================================== */
  const SAFETY_TIPS = [
    "Entrega solo en puntos seguros y señalizados del campus.",
    "Verifica el código de entrega antes de soltar el material.",
    "Revisa el estado del material frente al otro estudiante.",
    "No compartas tu número ni hagas pagos fuera de la app."
  ];

  function safetyNotice(withReport, userId) {
    return '<div class="notice notice--warn">' + icon("shield", "notice__icon") +
      "<div><strong>Consejos para una entrega segura</strong><ul class=\"notice__list\">" +
      SAFETY_TIPS.map(function (tip) { return "<li>" + tip + "</li>"; }).join("") + "</ul>" +
      (withReport ? '<button class="link-btn" type="button" data-report-user="' + userId + '">Reportar un problema</button>' : "") +
      "</div></div>";
  }

  function ownerCard(user, withLink) {
    const onTimePct = user.deals ? Math.round((user.onTime / user.deals) * 100) : 100;
    return '<div class="owner-card">' +
      '<div class="owner-card__head"><span class="avatar avatar--lg" aria-hidden="true">' + user.initials + "</span>" +
        "<div><p class=\"owner-card__name\">" + escapeHtml(user.name) + "</p>" +
        '<p class="owner-card__meta">' + escapeHtml(user.career) + " · " + escapeHtml(user.cycle) + "</p>" +
        '<span class="verified">' + icon("shield") + "Correo institucional verificado</span></div></div>" +
      '<div class="owner-card__stats">' +
        '<div class="owner-card__stat"><strong>' + user.rating.toFixed(1) + " ★</strong><span>Calificación (" + user.ratings + ")</span></div>" +
        '<div class="owner-card__stat"><strong>' + user.deals + "</strong><span>Tratos</span></div>" +
        '<div class="owner-card__stat owner-card__stat--ok"><strong>' + onTimePct + "%</strong><span>Devoluciones a tiempo</span></div>" +
        '<div class="owner-card__stat' + (user.incidents ? " owner-card__stat--alert" : " owner-card__stat--ok") + '"><strong>' + user.incidents + "</strong><span>Incidencias</span></div>" +
      "</div>" +
      (withLink ? '<button class="link-btn owner-card__link" type="button" data-profile="' + user.id + '">Ver reputación e historial</button>' : "") +
      "</div>";
  }

  function openDetail(id) {
    const item = material(id);
    const owner = users[item.ownerId];
    const proximity = proximityOf(item);
    const mine = item.ownerId === "me";
    let modalityInfo = "";
    if (item.modality === "loan") {
      modalityInfo = "Préstamo · plazo máximo de " + item.maxDays + " días";
    } else if (item.modality === "exchange") {
      modalityInfo = "Intercambio · a cambio de " + escapeHtml(item.wanted || "otro material");
    } else {
      modalityInfo = "Donación · no requiere devolución";
    }
    let actions;
    if (mine) {
      actions = '<p class="notice notice--info">' + icon("info", "notice__icon") + 'Es tu publicación. Puedes editarla o pausarla desde “Publicar”.</p>' +
        '<div class="detail__actions"><a class="btn btn--secondary" href="#publish" data-close>Gestionar publicación</a></div>';
    } else {
      const canRequest = item.status === "available";
      actions = '<div class="detail__actions">' +
        (canRequest
          ? '<button class="btn btn--primary" type="button" data-request="' + item.id + '">Solicitar ' + (item.modality === "loan" ? "préstamo" : item.modality === "donation" ? "donación" : "intercambio") + "</button>"
          : '<button class="btn btn--primary" type="button" disabled>No disponible por ahora</button>') +
        '<button class="btn btn--secondary" type="button" data-chat-owner="' + item.id + '">' + icon("chat") + "Escribir al dueño</button>" +
        "</div>" +
        '<button class="link-btn link-btn--muted" type="button" data-report-post="' + item.id + '">' + icon("flag", "icon--sm") + " Reportar esta publicación</button>";
    }
    $("#detail-title").textContent = item.title;
    $("#detail-body").innerHTML =
      '<div class="detail">' +
        '<div class="detail__gallery">' +
          '<div class="detail__photo">' + materialMedia(item) + "</div>" +
          '<div class="detail__thumbs" aria-hidden="true"><span class="detail__thumb detail__thumb--active">' + icon("book") + '</span><span class="detail__thumb">' + icon("photo") + '</span><span class="detail__thumb">' + icon("photo") + "</span></div>" +
          safetyNotice(false) +
        "</div>" +
        '<div class="detail__info">' +
          '<div class="detail__badges">' + statusBadge(item) + '<span class="badge badge--info">' + DATA.modalityLabel[item.modality] + "</span>" +
            (item.flagged ? '<span class="badge badge--err">En revisión</span>' : "") + "</div>" +
          '<h3 class="detail__title">' + escapeHtml(item.title) + "</h3>" +
          '<p class="detail__course">' + escapeHtml(item.course) + " (" + escapeHtml(item.code) + ") · " + escapeHtml(item.faculty) + " · " + escapeHtml(item.category) + "</p>" +
          '<ul class="info-list">' +
            "<li>" + icon("info") + "<span><strong>Estado:</strong>" + escapeHtml(item.condition) + "</span></li>" +
            "<li>" + icon("clock") + "<span><strong>Modalidad:</strong>" + modalityInfo + "</span></li>" +
            "<li>" + icon("pin") + "<span><strong>Punto de recojo:</strong>" + escapeHtml(item.point) + ' · <span class="proximity proximity--' + proximity + '">' + DATA.proximityLabel[proximity] + "</span></span></li>" +
            "<li>" + icon("calendar") + "<span><strong>Disponible hasta:</strong>" + escapeHtml(item.until) + "</span></li>" +
          "</ul>" +
          '<p class="detail__description">' + escapeHtml(item.description) + "</p>" +
          ownerCard(owner, !mine) +
          actions +
        "</div>" +
      "</div>";
    openDialog("detail-dialog");
  }

  let requestMaterialId = null;

  function openRequest(id) {
    const item = material(id);
    requestMaterialId = id;
    const owner = users[item.ownerId];
    const points = DATA.safePoints[item.campus];
    const mySlots = DATA.freeSlots.me;
    const shared = (DATA.freeSlots[item.ownerId] || []).filter(function (slot) {
      return mySlots.indexOf(slot) !== -1;
    });
    const isLoan = item.modality === "loan";
    const today = toInputDate(NOW);
    const maxDate = toInputDate(addDays(NOW, isLoan ? item.maxDays : 30));
    $("#request-title").textContent = isLoan ? "Solicitar préstamo" : item.modality === "donation" ? "Pedir donación" : "Proponer intercambio";
    $("#request-body").innerHTML =
      '<div class="material-summary"><span class="material-summary__thumb">' + icon("book") + "</span>" +
        "<div><strong>" + escapeHtml(item.title) + "</strong><span>" + escapeHtml(owner.name) + " · " + escapeHtml(item.point) + "</span></div></div>" +
      '<p class="notice notice--error" id="request-error" hidden></p>' +
      "<section><h3 class=\"modal__section-title\">1. " + (isLoan ? "¿Hasta cuándo lo necesitas?" : "¿Cuándo puedes recogerlo?") + "</h3>" +
        '<div class="date-row">' +
          '<div class="form-field"><label for="req-from">' + (isLoan ? "Desde" : "Fecha de recojo") + '</label><input type="date" id="req-from" min="' + today + '" max="' + maxDate + '" value="' + today + '" required></div>' +
          (isLoan ? '<div class="form-field"><label for="req-to">Hasta (fecha de devolución)</label><input type="date" id="req-to" min="' + today + '" max="' + maxDate + '" value="' + toInputDate(addDays(NOW, Math.min(14, item.maxDays))) + '" required aria-describedby="req-duration"></div>' : "") +
        "</div>" +
        (isLoan ? '<p class="duration-note" id="req-duration" aria-live="polite"></p>' : "") +
        (item.modality === "exchange" ? '<p class="duration-note">El dueño quiere a cambio: ' + escapeHtml(item.wanted) + "</p>" : "") +
      "</section>" +
      "<section><h3 class=\"modal__section-title\">2. Punto seguro de entrega</h3>" +
        '<p class="modal__help">Puntos señalizados que ' + escapeHtml(owner.name.split(" ")[0]) + " habilitó en la sede " + escapeHtml(item.campus) + ".</p>" +
        '<div class="radio-list">' + points.map(function (point, index) {
          return '<label class="radio-row"><input type="radio" name="req-point" value="' + escapeHtml(point) + '"' + ((point === item.point || (index === 0 && points.indexOf(item.point) === -1)) ? " checked" : "") + "><span><strong>" + escapeHtml(point) + "</strong><small>" + (index === 0 ? "Primer piso, módulo de informes" : "Zona con cámaras y personal de seguridad") + "</small></span></label>";
        }).join("") + "</div>" +
      "</section>" +
      "<section><h3 class=\"modal__section-title\">3. Franja horaria para la entrega</h3>" +
        (shared.length
          ? '<p class="modal__help">Coinciden ' + plural(shared.length, "franja", "franjas") + " según el horario de clases de ambos.</p>" +
            '<div class="chip-group" role="radiogroup" aria-label="Franja horaria">' + shared.map(function (slot, index) {
              return '<label class="chip-radio"><input type="radio" name="req-slot" value="' + slot + '"' + (index === 0 ? " checked" : "") + "><span>" + slot + "</span></label>";
            }).join("") + "</div>"
          : '<p class="notice notice--warn">' + icon("info", "notice__icon") + "No tienen franjas en común. Podrán coordinar la hora por chat.</p>") +
      "</section>" +
      '<p class="notice notice--neutral">' + icon("info", "notice__icon") + escapeHtml(owner.name.split(" ")[0]) + " tiene 24 horas para aceptar tu solicitud. Te avisaremos por notificación y podrás coordinar los detalles por chat.</p>";

    if (isLoan) {
      const update = function () {
        updateDuration(item);
      };
      $("#req-from").addEventListener("change", update);
      $("#req-to").addEventListener("change", update);
      update();
    }
    closeDialog("detail-dialog");
    openDialog("request-dialog");
  }

  function updateDuration(item) {
    const from = $("#req-from").value;
    const to = $("#req-to").value;
    const note = $("#req-duration");
    if (!from || !to) {
      return false;
    }
    const days = daysBetween(fromInputDate(from), fromInputDate(to));
    note.classList.remove("duration-note--error");
    if (days < 1) {
      note.textContent = "La fecha de devolución debe ser posterior a la de inicio.";
      note.classList.add("duration-note--error");
      return false;
    }
    if (days > item.maxDays) {
      note.textContent = "Elegiste " + days + " días, pero el dueño permite máximo " + item.maxDays + " días.";
      note.classList.add("duration-note--error");
      return false;
    }
    note.textContent = "Duración: " + plural(days, "día", "días") + " · Máximo permitido por el dueño: " + item.maxDays + " días";
    return true;
  }

  function submitRequest(event) {
    event.preventDefault();
    const item = material(requestMaterialId);
    const error = $("#request-error");
    const owner = users[item.ownerId];
    error.hidden = true;
    // HU014 (alternative scenario): the material is no longer available
    if (item.status !== "available") {
      error.innerHTML = icon("alert", "notice__icon") + "Este material ya no está disponible: otro estudiante confirmó una entrega. Activa “Avisarme si se libera”.";
      error.hidden = false;
      return;
    }
    const duplicated = state.requestsSent.some(function (r) {
      return r.materialId === item.id && (r.status === "pending" || r.status === "accepted");
    });
    if (duplicated) {
      error.innerHTML = icon("alert", "notice__icon") + "Ya tienes una solicitud activa para este material. Revísala en “Mis préstamos”.";
      error.hidden = false;
      return;
    }
    if (item.modality === "loan" && !updateDuration(item)) {
      $("#req-to").focus();
      return;
    }
    const from = fromInputDate($("#req-from").value);
    const to = item.modality === "loan" ? fromInputDate($("#req-to").value) : from;
    const pointInput = $("input[name='req-point']:checked");
    const slotInput = $("input[name='req-slot']:checked");
    const request = {
      id: uid("s"), materialId: item.id, from: from, to: to,
      point: pointInput ? pointInput.value : item.point,
      slot: slotInput ? slotInput.value : "Por coordinar",
      status: "pending", createdAt: new Date()
    };
    state.requestsSent.unshift(request);
    closeDialog("request-dialog");
    showToast("Solicitud enviada a " + owner.name + ". Te avisaremos cuando responda.");
    addNotification("Enviaste una solicitud de “" + item.title + "” a " + owner.name + ".", "info", "send");
    renderLoans();

    // Simulated answer of the owner (HU014: notify when accepted)
    setTimeout(function () {
      if (request.status !== "pending") {
        return;
      }
      if (item.status !== "available") {
        request.status = "rejected";
        addNotification(owner.name + " no pudo aceptar tu solicitud de “" + item.title + "”: ya no está disponible.", "warn", "alert");
      } else {
        request.status = "accepted";
        request.code = randomCode();
        item.status = "reserved";
        addNotification(owner.name + " aceptó tu solicitud de “" + item.title + "”. Entrega en " + request.point + " (" + request.slot + "). Programamos un recordatorio.", "ok", "check");
        showToast(owner.name.split(" ")[0] + " aceptó tu solicitud de “" + item.title + "”.");
      }
      renderCatalog();
      renderLoans();
    }, 7000);
  }

  function openProfile(userId) {
    const user = users[userId];
    const reviews = REVIEWS[userId] || [];
    const incidents = userId === "u7"
      ? "<li>Devolución con 5 días de retraso · ago. 2026</li><li>No se presentó a una entrega · set. 2026</li>"
      : userId === "u4" ? "<li>Devolución con 2 días de retraso · jul. 2026</li>" : "";
    $("#profile-title").textContent = userId === "me" ? "Mi reputación" : "Reputación de " + user.name.split(" ")[0];
    $("#profile-body").innerHTML = ownerCard(user, false) +
      (user.incidents
        ? '<div class="notice notice--error">' + icon("alert", "notice__icon") + "<div><strong>" + plural(user.incidents, "incidencia reportada", "incidencias reportadas") + "</strong><ul class=\"notice__list\">" + (incidents || "<li>Reporte reciente en revisión por moderación</li>") + "</ul></div></div>"
        : '<p class="notice notice--ok">' + icon("check", "notice__icon") + "Sin incidencias reportadas.</p>") +
      "<section><h3 class=\"modal__section-title\">Últimas calificaciones</h3><ul class=\"review-list\">" +
      reviews.map(function (review) {
        return '<li class="review"><div class="review__head"><span>' + escapeHtml(review[0]) + "</span><span>" + "★".repeat(review[1]) + "☆".repeat(5 - review[1]) + "</span></div><p>" + escapeHtml(review[2]) + "</p></li>";
      }).join("") + "</ul></section>";
    openDialog("profile-dialog");
  }

  function setupDetailAndRequest() {
    document.addEventListener("click", function (event) {
      const request = event.target.closest("#detail-dialog [data-request]");
      const chatOwner = event.target.closest("[data-chat-owner]");
      const reportPost = event.target.closest("[data-report-post]");
      const profile = event.target.closest("[data-profile]");
      const reportUser = event.target.closest("[data-report-user]");
      if (request) {
        openRequest(request.dataset.request);
      } else if (chatOwner) {
        closeDialog("detail-dialog");
        startConversation(chatOwner.dataset.chatOwner);
      } else if (reportPost) {
        openReport("post", reportPost.dataset.reportPost);
      } else if (profile) {
        openProfile(profile.dataset.profile);
      } else if (reportUser) {
        openReport("user", reportUser.dataset.reportUser);
      }
    });
    $("#request-form").addEventListener("submit", submitRequest);
    $("#my-profile-button").addEventListener("click", function () {
      $("#profile-menu").hidden = true;
      openProfile("me");
    });
    $("#logout-link").addEventListener("click", function () {
      try {
        sessionStorage.removeItem("campushare.email");
      } catch (error) {
        // ignore
      }
    });
  }

  /* ======================================================================
     7. V4 Publish (HU006, HU007, HU008, HU009)
     ====================================================================== */
  const COURSES = {};
  DATA.materials.forEach(function (item) {
    COURSES[item.course] = { code: item.code, faculty: item.faculty };
  });

  function setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(inputId + "-error");
    if (input) {
      input.setAttribute("aria-invalid", message ? "true" : "false");
    }
    if (error) {
      error.textContent = message || "";
    }
    return !message;
  }

  function validateStep(step) {
    let ok = true;
    if (step === 1) {
      ok = setFieldError("pub-photo", state.publishPhoto ? "" : "Sube al menos una foto: sirve como referencia en la devolución.") && ok;
      ok = setFieldError("pub-title", $("#pub-title").value.trim().length >= 3 ? "" : "Escribe el nombre del material (mínimo 3 caracteres).") && ok;
      ok = setFieldError("pub-course", $("#pub-course").value.trim() ? "" : "Indica el curso para que te encuentren al buscarlo.") && ok;
    }
    if (step === 2) {
      const modality = $("input[name='modality']:checked").value;
      if (modality === "exchange") {
        ok = setFieldError("pub-wanted", $("#pub-wanted").value.trim() ? "" : "Cuéntanos qué material te gustaría recibir.") && ok;
      }
    }
    if (step === 3) {
      const points = $$("#pub-points input:checked");
      $("#pub-points-error").textContent = points.length ? "" : "Elige al menos un punto seguro de entrega.";
      ok = points.length > 0 && ok;
      const until = $("#pub-until").value;
      ok = setFieldError("pub-until", until && fromInputDate(until) > NOW ? "" : "Elige una fecha futura.") && ok;
    }
    if (!ok) {
      const firstError = $(".publish-step:not([hidden]) [aria-invalid='true']") || $(".publish-step:not([hidden]) input");
      if (firstError && firstError.type !== "file") {
        firstError.focus();
      } else {
        $("label[for='pub-photo']").scrollIntoView({ block: "center" });
      }
    }
    return ok;
  }

  function renderPublishStep() {
    const step = state.publishStep;
    $$(".publish-step").forEach(function (fieldset) {
      fieldset.hidden = Number(fieldset.dataset.step) !== step;
    });
    $$("[data-step-indicator]").forEach(function (indicator) {
      const n = Number(indicator.dataset.stepIndicator);
      indicator.classList.toggle("stepper__step--done", n < step);
      indicator.classList.toggle("stepper__step--current", n === step);
      if (n === step) {
        indicator.setAttribute("aria-current", "step");
      } else {
        indicator.removeAttribute("aria-current");
      }
    });
    $("#pub-back").style.visibility = step === 1 ? "hidden" : "visible";
    $("#pub-next").hidden = step === 3;
    $("#pub-submit").hidden = step !== 3;
    if (step === 3) {
      renderPublishSummary();
    }
  }

  function renderPublishPoints() {
    $("#pub-points").innerHTML = DATA.safePoints[state.campus].map(function (point, index) {
      return '<label class="check-row"><input type="checkbox" value="' + escapeHtml(point) + '"' + (index === 0 ? " checked" : "") + "><span><strong>" + escapeHtml(point) + "</strong><small>Punto señalizado · Sede " + escapeHtml(state.campus) + "</small></span></label>";
    }).join("");
  }

  function renderPublishSummary() {
    const modality = $("input[name='modality']:checked").value;
    const condition = $("input[name='condition']:checked").value;
    const extra = modality === "loan" ? "Plazo máximo: " + $("#pub-max-days").value + " días" : modality === "exchange" ? "A cambio de: " + $("#pub-wanted").value : "Sin devolución";
    $("#pub-summary").innerHTML = "<strong>Resumen de tu publicación</strong><dl>" +
      "<dt>Material</dt><dd>" + escapeHtml($("#pub-title").value) + "</dd>" +
      "<dt>Curso</dt><dd>" + escapeHtml($("#pub-course").value) + "</dd>" +
      "<dt>Modalidad</dt><dd>" + DATA.modalityLabel[modality] + " · " + escapeHtml(extra) + "</dd>" +
      "<dt>Estado</dt><dd>" + escapeHtml(condition) + "</dd></dl>";
  }

  function updateModalityFields() {
    const modality = $("input[name='modality']:checked").value;
    $$("[data-modality-field]").forEach(function (block) {
      block.hidden = block.dataset.modalityField !== modality;
    });
  }

  function resetPublishForm() {
    $("#publish-form").reset();
    state.publishPhoto = null;
    $("#pub-photo-preview").hidden = true;
    $("#pub-photo-placeholder").hidden = false;
    $$("#publish-form [aria-invalid]").forEach(function (input) {
      input.setAttribute("aria-invalid", "false");
    });
    $$("#publish-form .field__error").forEach(function (error) {
      error.textContent = "";
    });
    state.publishStep = 1;
    $("#pub-until").value = toInputDate(addDays(NOW, 45));
    renderPublishPoints();
    updateModalityFields();
    renderPublishStep();
  }

  function submitPublication(event) {
    event.preventDefault();
    if (!validateStep(3)) {
      return;
    }
    const course = $("#pub-course").value.trim();
    const info = COURSES[course] || { code: "—", faculty: "General" };
    const modality = $("input[name='modality']:checked").value;
    const points = $$("#pub-points input:checked").map(function (input) {
      return input.value;
    });
    const item = {
      id: uid("m"), title: $("#pub-title").value.trim(), course: course, code: info.code, faculty: info.faculty,
      category: $("#pub-category").value, campus: state.campus, point: points[0], points: points,
      status: "available", modality: modality, condition: $("input[name='condition']:checked").value,
      ownerId: "me", maxDays: modality === "loan" ? Number($("#pub-max-days").value) : 0,
      wanted: $("#pub-wanted").value.trim(), until: formatShortDate(fromInputDate($("#pub-until").value)),
      description: $("#pub-description").value.trim() || "Sin descripción adicional.", photo: state.publishPhoto
    };
    state.materials.unshift(item);
    showToast("¡Publicado! “" + item.title + "” ya aparece en el catálogo como disponible.");
    addNotification("Publicaste “" + item.title + "” (" + DATA.modalityLabel[modality] + ").", "ok", "check");
    resetPublishForm();
    renderFilterOptions();
    renderCatalog();
    renderPublications();
    $("#pub-list").firstElementChild.querySelector("h3").setAttribute("tabindex", "-1");
    $("#pub-list").firstElementChild.querySelector("h3").focus();
  }

  function hasPendingDeal(item) {
    return item.status === "reserved" || item.status === "on-loan";
  }

  function publicationStatus(item) {
    const map = {
      available: ["Activa", "ok"], reserved: ["Entrega pendiente", "warn"], "on-loan": ["Prestado", "info"],
      paused: ["Pausada", "mute"], withdrawn: ["Retirada", "mute"]
    };
    return '<span class="badge badge--' + map[item.status][1] + '">' + map[item.status][0] + "</span>";
  }

  function renderPublications() {
    const mine = state.materials.filter(function (item) {
      return item.ownerId === "me";
    }).sort(function (a, b) {
      return (a.status === "withdrawn") - (b.status === "withdrawn");
    });
    $("#pub-list").innerHTML = mine.map(function (item) {
      const withdrawn = item.status === "withdrawn";
      return '<li class="pub-item">' +
        '<div class="pub-item__head"><span class="pub-item__thumb">' + materialMedia(item) + "</span>" +
          "<div><h3 class=\"pub-item__title\">" + escapeHtml(item.title) + "</h3>" +
          '<div class="pub-item__meta">' + publicationStatus(item) + '<span class="badge badge--info">' + DATA.modalityLabel[item.modality] + "</span></div></div></div>" +
        (withdrawn ? "" :
          '<div class="pub-item__actions">' +
            '<button class="pill-btn" type="button" data-pub-action="edit" data-id="' + item.id + '">' + icon("edit") + "Editar</button>" +
            '<button class="pill-btn" type="button" data-pub-action="pause" data-id="' + item.id + '">' + icon(item.status === "paused" ? "play" : "pause") + (item.status === "paused" ? "Reanudar" : "Pausar") + "</button>" +
            '<button class="pill-btn pill-btn--danger" type="button" data-pub-action="withdraw" data-id="' + item.id + '">' + icon("trash") + "Retirar</button>" +
          "</div>") +
        "</li>";
    }).join("");
  }

  let editingId = null;

  function openEdit(item) {
    editingId = item.id;
    $("#edit-body").innerHTML =
      '<div class="form-field"><label for="edit-title-input">Nombre del material</label><input id="edit-title-input" type="text" value="' + escapeHtml(item.title) + '" required aria-describedby="edit-title-input-error"><p class="field__error" id="edit-title-input-error"></p></div>' +
      '<div class="form-field"><label for="edit-description">Descripción</label><textarea id="edit-description" rows="3">' + escapeHtml(item.description) + "</textarea></div>" +
      (item.modality === "loan"
        ? '<div class="form-field"><label for="edit-days">Plazo máximo de préstamo</label><select id="edit-days" class="input-select">' +
          [15, 30, 45, 60].map(function (days) { return "<option value=\"" + days + "\"" + (days === item.maxDays ? " selected" : "") + ">" + days + " días</option>"; }).join("") + "</select></div>"
        : "") +
      '<div class="form-field"><label for="edit-condition">Estado</label><select id="edit-condition" class="input-select">' +
        ["Nuevo", "Buen estado", "Con desgaste"].map(function (c) { return "<option" + (c === item.condition ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>";
    openDialog("edit-dialog");
  }

  function setupPublish() {
    $("#course-options").innerHTML = Object.keys(COURSES).map(function (course) {
      return '<option value="' + escapeHtml(course) + '">' + COURSES[course].code + "</option>";
    }).join("");

    $("#pub-photo").addEventListener("change", function () {
      const file = this.files && this.files[0];
      if (!file) {
        return;
      }
      if (!/^image\//.test(file.type)) {
        setFieldError("pub-photo", "El archivo debe ser una imagen (JPG o PNG).");
        return;
      }
      if (state.publishPhoto) {
        URL.revokeObjectURL(state.publishPhoto);
      }
      state.publishPhoto = URL.createObjectURL(file);
      const preview = $("#pub-photo-preview");
      preview.src = state.publishPhoto;
      preview.hidden = false;
      $("#pub-photo-placeholder").hidden = true;
      setFieldError("pub-photo", "");
    });

    $$("input[name='modality']").forEach(function (radio) {
      radio.addEventListener("change", updateModalityFields);
    });
    $("#pub-next").addEventListener("click", function () {
      if (validateStep(state.publishStep)) {
        state.publishStep += 1;
        renderPublishStep();
        $(".publish-step:not([hidden]) legend").scrollIntoView({ block: "nearest" });
      }
    });
    $("#pub-back").addEventListener("click", function () {
      state.publishStep = Math.max(1, state.publishStep - 1);
      renderPublishStep();
    });
    $("#publish-form").addEventListener("submit", submitPublication);

    $("#pub-list").addEventListener("click", function (event) {
      const button = event.target.closest("[data-pub-action]");
      if (!button) {
        return;
      }
      const item = material(button.dataset.id);
      const action = button.dataset.pubAction;
      if (hasPendingDeal(item)) {
        showToast("No puedes " + (action === "edit" ? "editar" : action === "pause" ? "pausar" : "retirar") + " “" + item.title + "”: tiene una entrega o devolución pendiente.", "error");
        return;
      }
      if (action === "edit") {
        openEdit(item);
      } else if (action === "pause") {
        item.status = item.status === "paused" ? "available" : "paused";
        showToast(item.status === "paused" ? "Pausaste “" + item.title + "”. Ya no aparece en el catálogo." : "“" + item.title + "” vuelve a estar disponible en el catálogo.");
        renderPublications();
        renderCatalog();
      } else if (action === "withdraw") {
        confirmDialog("¿Retirar publicación?", "“" + item.title + "” dejará de aparecer en el catálogo. Quedará en tu historial como retirada.", "Retirar", function () {
          item.status = "withdrawn";
          state.requestsReceived.forEach(function (r) {
            if (r.materialId === item.id && r.status === "pending") {
              r.status = "rejected";
            }
          });
          showToast("Retiraste “" + item.title + "” del catálogo.");
          renderPublications();
          renderCatalog();
        });
      }
    });

    $("#edit-form").addEventListener("submit", function (event) {
      event.preventDefault();
      const item = material(editingId);
      const title = $("#edit-title-input").value.trim();
      if (!setFieldError("edit-title-input", title.length >= 3 ? "" : "Escribe un nombre de al menos 3 caracteres.")) {
        $("#edit-title-input").focus();
        return;
      }
      item.title = title;
      item.description = $("#edit-description").value.trim();
      item.condition = $("#edit-condition").value;
      if ($("#edit-days")) {
        item.maxDays = Number($("#edit-days").value);
      }
      closeDialog("edit-dialog");
      showToast("Guardamos los cambios de “" + item.title + "”.");
      renderPublications();
      renderCatalog();
    });

    resetPublishForm();
  }

  /* ======================================================================
     8. V5 Loans (HU015, HU018, HU019, HU020, HU024, HU041, HU042, HU043)
     ====================================================================== */
  function countdown(dueDate) {
    const diff = dueDate.getTime() - Date.now();
    const abs = Math.abs(diff);
    const days = Math.floor(abs / DAY);
    const hours = Math.floor((abs % DAY) / HOUR);
    const text = days ? plural(days, "día", "días") + (days < 3 && hours ? " " + hours + " h" : "") : plural(hours, "hora", "horas");
    if (diff < 0) {
      return { text: "Venció hace " + text, level: "danger" };
    }
    if (diff < 48 * HOUR) {
      return { text: "Devuelve en " + text + " (" + formatDate(dueDate) + ")", level: "warn" };
    }
    return { text: "Devuelve en " + text + " (" + formatDate(dueDate) + ")", level: "ok" };
  }

  function dealThumb(item) {
    return '<span class="deal__thumb">' + materialMedia(item) + "</span>";
  }

  function renderCounters() {
    const published = state.materials.filter(function (item) {
      return item.ownerId === "me" && item.status !== "withdrawn";
    }).length;
    const lent = state.deals.filter(function (d) { return d.role === "lender"; }).length;
    const borrowed = state.deals.filter(function (d) { return d.role === "borrower"; }).length;
    const totalLent = lent + state.history.filter(function (h) { return h.role === "lender"; }).length + 12;
    const totalBorrowed = borrowed + state.history.filter(function (h) { return h.role === "borrower"; }).length + 6;
    $("#counters").innerHTML = [
      ["book", published, "Publicados"],
      ["swap", lent, "Prestados ahora"],
      ["calendar", borrowed, "Recibidos ahora"],
      ["star", users.me.rating.toFixed(1) + " ★", "Mi calificación"]
    ].map(function (c) {
      return '<li class="counter"><span class="counter__icon">' + icon(c[0]) + '</span><span><strong class="counter__value">' + c[1] + '</strong><span class="counter__label">' + c[2] + "</span></span></li>";
    }).join("");
    $("#loans-summary").textContent = "Has prestado " + totalLent + " y recibido " + totalBorrowed + " materiales en la comunidad CampuShare.";
  }

  function renderReminder() {
    const urgent = state.deals.filter(function (d) {
      return d.role === "borrower" && d.status === "on-loan" && d.dueDate.getTime() - Date.now() < 48 * HOUR;
    });
    const box = $("#reminder");
    if (!urgent.length) {
      box.hidden = true;
      return;
    }
    const deal = urgent[0];
    const item = material(deal.materialId);
    box.innerHTML = icon("bell") + "<div><strong>Recordatorio: devuelve “" + escapeHtml(item.title) + "” el " + formatDate(deal.dueDate) + ".</strong>" +
      "<p>Te enviaremos un segundo aviso el día del vencimiento. ¿Necesitas más tiempo? " +
      '<button class="link-btn" type="button" data-extend="' + deal.id + '">Pide una ampliación por chat</button></p></div>';
    box.hidden = false;
  }

  function renderActive() {
    const borrowed = state.deals.filter(function (d) { return d.role === "borrower"; });
    const lent = state.deals.filter(function (d) { return d.role === "lender"; });
    const accepted = state.requestsSent.filter(function (r) { return r.status === "accepted"; });

    const borrowedHtml = borrowed.map(function (deal) {
      const item = material(deal.materialId);
      const other = users[deal.otherId];
      const time = countdown(deal.dueDate);
      return '<li class="deal' + (time.level === "warn" ? " deal--warn" : time.level === "danger" ? " deal--danger" : "") + '">' + dealThumb(item) +
        '<div class="deal__body"><h3 class="deal__title">' + escapeHtml(item.title) + "</h3>" +
        '<p class="deal__meta">Recibido de ' + escapeHtml(other.name) + " · " + escapeHtml(deal.point) + "</p>" +
        '<p class="deal__status deal__status--' + time.level + '">' + icon("clock") + time.text + "</p></div>" +
        '<div class="deal__actions"><button class="btn btn--secondary btn--sm" type="button" data-deal="' + deal.id + '">Ver trato</button>' +
        '<button class="btn btn--ghost btn--sm" type="button" data-chat-user="' + deal.otherId + '" data-material="' + item.id + '">' + icon("chat", "icon--sm") + "Escribir</button></div></li>";
    }).concat(accepted.map(function (request) {
      const item = material(request.materialId);
      const owner = users[item.ownerId];
      return '<li class="deal">' + dealThumb(item) +
        '<div class="deal__body"><h3 class="deal__title">' + escapeHtml(item.title) + "</h3>" +
        '<p class="deal__meta">Solicitud aceptada por ' + escapeHtml(owner.name) + " · " + escapeHtml(request.point) + " · " + escapeHtml(request.slot) + "</p>" +
        '<p class="deal__status deal__status--info">' + icon("key") + "Pendiente de recojo: muestra tu código " + request.code + "</p></div>" +
        '<div class="deal__actions"><button class="btn btn--primary btn--sm" type="button" data-request-deal="' + request.id + '">Ver trato y código</button></div></li>';
    }));
    $("#borrowed-list").innerHTML = borrowedHtml.length ? borrowedHtml.join("") : '<li class="empty-state">No tienes materiales prestados. <a href="#catalog">Busca en el catálogo</a>.</li>';

    $("#lent-list").innerHTML = lent.length ? lent.map(function (deal) {
      const item = material(deal.materialId);
      const other = users[deal.otherId];
      if (deal.status === "pending-delivery") {
        return '<li class="deal">' + dealThumb(item) +
          '<div class="deal__body"><h3 class="deal__title">' + escapeHtml(item.title) + "</h3>" +
          '<p class="deal__meta">Prestado a ' + escapeHtml(other.name) + " · " + escapeHtml(deal.slot) + " · " + escapeHtml(deal.point) + "</p>" +
          '<p class="deal__status deal__status--info">' + icon("clock") + "Pendiente de entrega</p></div>" +
          '<div class="deal__actions"><button class="btn btn--secondary btn--sm" type="button" data-deal="' + deal.id + '">Ver trato</button>' +
          '<button class="btn btn--primary btn--sm" type="button" data-deliver="' + deal.id + '">' + icon("key", "icon--sm") + "Confirmar entrega</button></div></li>";
      }
      const time = countdown(deal.dueDate);
      return '<li class="deal' + (time.level === "danger" ? " deal--danger" : "") + '">' + dealThumb(item) +
        '<div class="deal__body"><h3 class="deal__title">' + escapeHtml(item.title) + "</h3>" +
        '<p class="deal__meta">Prestado a ' + escapeHtml(other.name) + " · entregado el " + formatDate(deal.deliveredAt) + " a las " + formatTime(deal.deliveredAt) + "</p>" +
        '<p class="deal__status deal__status--' + (time.level === "danger" ? "danger" : "ok") + '">' + icon("clock") + time.text.replace("Devuelve en", "Te lo devuelven en") + "</p></div>" +
        '<div class="deal__actions"><button class="btn btn--ghost btn--sm" type="button" data-report-user="' + deal.otherId + '">' + icon("flag", "icon--sm") + "Reportar</button>" +
        '<button class="btn btn--primary btn--sm" type="button" data-return="' + deal.id + '">' + icon("check", "icon--sm") + "Confirmar devolución</button></div></li>";
    }).join("") : '<li class="empty-state">No tienes materiales prestados a otros estudiantes.</li>';
  }

  function requestStatus(status) {
    const map = { pending: ["Pendiente", "warn"], accepted: ["Aceptada", "ok"], rejected: ["Rechazada", "err"], cancelled: ["Cancelada", "mute"] };
    return '<span class="badge badge--' + map[status][1] + '">' + map[status][0] + "</span>";
  }

  function renderSent() {
    $("#sent-list").innerHTML = state.requestsSent.length ? state.requestsSent.map(function (request) {
      const item = material(request.materialId);
      const owner = users[item.ownerId];
      const cancellable = request.status === "pending" || request.status === "accepted";
      return '<li class="deal">' + dealThumb(item) +
        '<div class="deal__body"><h3 class="deal__title">' + escapeHtml(item.title) + " " + requestStatus(request.status) + "</h3>" +
        '<p class="deal__meta">A ' + escapeHtml(owner.name) + " · " + (item.modality === "loan" ? "del " + formatDate(request.from) + " al " + formatDate(request.to) : "recojo el " + formatDate(request.from)) + " · enviada " + relativeTime(request.createdAt).toLowerCase() + "</p>" +
        '<p class="deal__status deal__status--' + (request.status === "accepted" ? "ok" : request.status === "pending" ? "warn" : "danger") + '">' +
          (request.status === "pending" ? icon("clock") + "Esperando respuesta (máximo 24 h)" :
           request.status === "accepted" ? icon("check") + "Entrega en " + escapeHtml(request.point) + " · " + escapeHtml(request.slot) :
           request.status === "rejected" ? icon("info") + "El dueño no pudo prestarlo. Busca otra opción en el catálogo." : icon("info") + "Cancelaste esta solicitud.") + "</p></div>" +
        '<div class="deal__actions">' +
          (request.status === "accepted" ? '<button class="btn btn--secondary btn--sm" type="button" data-request-deal="' + request.id + '">Ver trato</button>' : "") +
          (cancellable ? '<button class="btn btn--ghost btn--sm" type="button" data-cancel-request="' + request.id + '">Cancelar solicitud</button>' : "") +
        "</div></li>";
    }).join("") : '<li class="empty-state">Aún no enviaste solicitudes. <a href="#catalog">Explora el catálogo</a>.</li>';
  }

  function renderReceived() {
    const pending = state.requestsReceived.filter(function (r) {
      return r.status === "pending" && !state.blocked[r.requesterId];
    }).sort(function (a, b) {
      return a.from - b.from;
    });
    $("#received-list").innerHTML = pending.length ? pending.map(function (request) {
      const item = material(request.materialId);
      const requester = users[request.requesterId];
      return '<li class="deal">' + dealThumb(item) +
        '<div class="deal__body"><h3 class="deal__title">' + escapeHtml(item.title) + "</h3>" +
        '<p class="deal__meta">Lo pide del ' + formatDate(request.from) + " al " + formatDate(request.to) + " · recibida " + relativeTime(request.createdAt).toLowerCase() + "</p>" +
        '<div class="deal__requester"><span class="avatar" aria-hidden="true">' + requester.initials + "</span>" +
          "<span><strong>" + escapeHtml(requester.name) + "</strong> · " + requester.rating.toFixed(1) + " ★ · " + plural(requester.deals, "préstamo", "préstamos") + " · " +
          '<span class="' + (requester.incidents ? "deal__status--danger" : "") + '">' + plural(requester.incidents, "incidencia", "incidencias") + "</span></span></div>" +
        '<button class="link-btn" type="button" data-profile="' + requester.id + '">Ver perfil y reputación</button></div>' +
        '<div class="deal__actions"><button class="btn btn--secondary btn--sm" type="button" data-reject="' + request.id + '">Rechazar</button>' +
        '<button class="btn btn--primary btn--sm" type="button" data-accept="' + request.id + '">Aceptar</button></div></li>';
    }).join("") : '<li class="empty-state">No tienes solicitudes pendientes. Te avisaremos cuando alguien pida tus materiales.</li>';
  }

  function renderHistory() {
    $("#history-list").innerHTML = state.history.map(function (h) {
      const other = users[h.otherId];
      return '<li class="deal"><span class="deal__thumb">' + icon("book") + "</span>" +
        '<div class="deal__body"><h3 class="deal__title">' + escapeHtml(h.title) + ' <span class="badge badge--mute">Cerrado</span></h3>' +
        '<p class="deal__meta">' + (h.role === "lender" ? "Prestado a " : "Recibido de ") + escapeHtml(other.name) + " · cerrado el " + formatDate(h.closedAt) + " · " + escapeHtml(h.condition) + "</p>" +
        '<p class="deal__status deal__status--ok">' + icon("star") + (h.rating ? "Calificaste con " + h.rating + " de 5" : "Sin calificar") + "</p></div></li>";
    }).join("");
  }

  function renderLoans() {
    renderCounters();
    renderReminder();
    renderActive();
    renderSent();
    renderReceived();
    renderHistory();
    const activeCount = state.deals.length + state.requestsSent.filter(function (r) { return r.status === "accepted"; }).length;
    $("#count-active").textContent = activeCount || "";
    $("#count-sent").textContent = state.requestsSent.filter(function (r) { return r.status === "pending"; }).length || "";
    $("#count-received").textContent = state.requestsReceived.filter(function (r) { return r.status === "pending" && !state.blocked[r.requesterId]; }).length || "";
  }

  function selectTab(tab) {
    $$(".tabs__tab").forEach(function (other) {
      const selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute("aria-controls")).hidden = !selected;
    });
  }

  /* --- Deal detail (HU050) --- */
  function openDealDetail(options) {
    const item = material(options.materialId);
    const other = users[options.otherId];
    const isBorrower = options.role === "borrower";
    $("#deal-title").textContent = "Trato: " + item.title;
    $("#deal-body").innerHTML =
      '<div class="material-summary"><span class="material-summary__thumb">' + icon("book") + "</span><div><strong>" + escapeHtml(item.title) + "</strong><span>" +
        (isBorrower ? "Te lo presta " : "Lo prestas a ") + escapeHtml(other.name) + "</span></div></div>" +
      '<ul class="info-list">' +
        "<li>" + icon("pin") + "<span><strong>Punto de entrega:</strong>" + escapeHtml(options.point) + " · ubicación referencial: primer piso, junto al módulo de informes</span></li>" +
        "<li>" + icon("clock") + "<span><strong>Franja:</strong>" + escapeHtml(options.slot) + "</span></li>" +
        (options.dueDate ? "<li>" + icon("calendar") + "<span><strong>Devolución:</strong>" + formatDate(options.dueDate) + "</span></li>" : "") +
      "</ul>" +
      (options.code
        ? (isBorrower
          ? '<div><h3 class="modal__section-title">Tu código de entrega</h3><p class="modal__help">Muéstraselo a ' + escapeHtml(other.name.split(" ")[0]) + ' en el punto de entrega. Solo así se confirma que el material llegó a la persona correcta.</p><span class="code-display">' + options.code + "</span></div>"
          : '<p class="notice notice--info">' + icon("key", "notice__icon") + "Al encontrarse, pide a " + escapeHtml(other.name.split(" ")[0]) + " su código de 6 dígitos y confírmalo en “Confirmar entrega”.</p>")
        : "") +
      safetyNotice(true, options.otherId);
    openDialog("deal-dialog");
  }

  /* --- Accept request (HU015, HU016, HU017) --- */
  let acceptingId = null;

  function openAccept(requestId) {
    const request = state.requestsReceived.find(function (r) { return r.id === requestId; });
    const item = material(request.materialId);
    const requester = users[request.requesterId];
    acceptingId = requestId;
    const shared = DATA.freeSlots.me.filter(function (slot) {
      return (DATA.freeSlots[request.requesterId] || []).indexOf(slot) !== -1;
    });
    $("#accept-title").textContent = "Aceptar solicitud de " + requester.name.split(" ")[0];
    $("#accept-body").innerHTML =
      '<div class="material-summary"><span class="material-summary__thumb">' + icon("book") + "</span><div><strong>" + escapeHtml(item.title) + "</strong><span>Del " + formatDate(request.from) + " al " + formatDate(request.to) + "</span></div></div>" +
      ownerCard(requester, true) +
      "<section><h3 class=\"modal__section-title\">1. Elige el punto seguro de entrega</h3>" +
        '<div class="radio-list">' + DATA.safePoints[state.campus].map(function (point, index) {
          return '<label class="radio-row"><input type="radio" name="acc-point" value="' + escapeHtml(point) + '"' + (index === 0 ? " checked" : "") + "><span><strong>" + escapeHtml(point) + "</strong><small>Punto señalizado · Sede " + escapeHtml(state.campus) + "</small></span></label>";
        }).join("") + "</div></section>" +
      "<section><h3 class=\"modal__section-title\">2. Franja en la que ambos coinciden</h3>" +
        (shared.length
          ? '<div class="chip-group" role="radiogroup" aria-label="Franja horaria">' + shared.map(function (slot, index) {
              return '<label class="chip-radio"><input type="radio" name="acc-slot" value="' + slot + '"' + (index === 0 ? " checked" : "") + "><span>" + slot + "</span></label>";
            }).join("") + "</div>"
          : '<p class="notice notice--warn">' + icon("info", "notice__icon") + "No hay franjas en común; coordinarán por chat.</p>") +
      "</section>" +
      '<p class="notice notice--neutral">' + icon("bell", "notice__icon") + "Notificaremos a " + escapeHtml(requester.name.split(" ")[0]) + " el punto y la franja, y programaremos un recordatorio.</p>";
    openDialog("accept-dialog");
  }

  function submitAccept(event) {
    event.preventDefault();
    const request = state.requestsReceived.find(function (r) { return r.id === acceptingId; });
    const item = material(request.materialId);
    const requester = users[request.requesterId];
    const point = $("input[name='acc-point']:checked").value;
    const slotInput = $("input[name='acc-slot']:checked");
    request.status = "accepted";
    item.status = "reserved";
    const days = Math.max(1, daysBetween(request.from, request.to));
    state.deals.unshift({ id: uid("d"), materialId: item.id, role: "lender", otherId: request.requesterId, status: "pending-delivery", point: point, slot: slotInput ? slotInput.value : "Por coordinar", code: randomCode(), days: days });
    // Other pending requests for the same material can no longer be accepted
    state.requestsReceived.forEach(function (other) {
      if (other !== request && other.materialId === item.id && other.status === "pending") {
        other.status = "rejected";
      }
    });
    closeDialog("accept-dialog");
    showToast("Aceptaste la solicitud. Notificamos a " + requester.name + " el punto " + point + ".");
    addNotification("Aceptaste prestar “" + item.title + "” a " + requester.name + ". Entrega en " + point + ".", "ok", "check");
    renderLoans();
    renderCatalog();
    renderPublications();
    selectTab($("#tab-active"));
  }

  /* --- Delivery code (HU018) --- */
  let deliveringId = null;
  let deliveryAttempts = 0;

  function openDelivery(dealId) {
    const deal = state.deals.find(function (d) { return d.id === dealId; });
    const other = users[deal.otherId];
    deliveringId = dealId;
    deliveryAttempts = 0;
    $("#delivery-body").innerHTML =
      "<p>Pide a <strong>" + escapeHtml(other.name) + "</strong> el código de 6 dígitos que ve en su pantalla y escríbelo aquí.</p>" +
      '<div class="form-field"><label for="delivery-code">Código de entrega</label>' +
      '<input class="code-input" id="delivery-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required aria-describedby="delivery-code-error"><p class="field__error" id="delivery-code-error" aria-live="assertive"></p></div>' +
      '<p class="demo-hint"><strong>Demo:</strong> el código de ' + escapeHtml(other.name.split(" ")[0]) + " es <strong>" + deal.code + "</strong>. Prueba también con un código incorrecto.</p>";
    openDialog("delivery-dialog");
  }

  function submitDelivery(event) {
    event.preventDefault();
    const deal = state.deals.find(function (d) { return d.id === deliveringId; });
    const input = $("#delivery-code");
    const value = input.value.replace(/\D/g, "");
    if (value.length !== 6) {
      setFieldError("delivery-code", "El código tiene 6 dígitos.");
      input.focus();
      return;
    }
    if (value !== deal.code) {
      deliveryAttempts += 1;
      setFieldError("delivery-code", "Código inválido o vencido (intento " + deliveryAttempts + "). Verifica el código en la pantalla de " + users[deal.otherId].name.split(" ")[0] + ".");
      input.select();
      return;
    }
    const item = material(deal.materialId);
    deal.status = "on-loan";
    deal.deliveredAt = new Date();
    deal.dueDate = addDays(deal.deliveredAt, deal.days || item.maxDays || 30);
    item.status = "on-loan";
    closeDialog("delivery-dialog");
    showToast("Entrega confirmada a las " + formatTime(deal.deliveredAt) + ". Devolución: " + formatDate(deal.dueDate) + ".");
    addNotification("“" + item.title + "” está en préstamo. Registramos fecha, hora y plazo de devolución.", "ok", "key");
    renderLoans();
    renderCatalog();
    renderPublications();
  }

  /* --- Return (HU020) --- */
  let returningId = null;

  function openReturn(dealId) {
    const deal = state.deals.find(function (d) { return d.id === dealId; });
    const item = material(deal.materialId);
    returningId = dealId;
    $("#return-body").innerHTML =
      '<div class="material-summary"><span class="material-summary__thumb">' + icon("book") + "</span><div><strong>" + escapeHtml(item.title) + "</strong><span>Estado registrado al publicar: " + escapeHtml(item.condition) + "</span></div></div>" +
      "<fieldset class=\"filters__group\"><legend>¿El material volvió en buen estado?</legend>" +
        '<div class="radio-list">' +
          '<label class="radio-row"><input type="radio" name="ret-condition" value="ok" checked><span><strong>Sí, en buen estado</strong></span></label>' +
          '<label class="radio-row radio-row--danger"><input type="radio" name="ret-condition" value="damaged"><span><strong>Volvió con daños</strong><small>Adjunta fotos y describe el daño</small></span></label>' +
        "</div></fieldset>" +
      '<div id="damage-fields" hidden>' +
        '<div class="form-field"><label for="damage-description">Describe el daño</label><textarea id="damage-description" rows="3" aria-describedby="damage-description-error"></textarea><p class="field__error" id="damage-description-error"></p></div>' +
        '<div class="form-field"><label for="damage-photo">Fotos del daño</label><input id="damage-photo" type="file" accept="image/*" multiple aria-describedby="damage-photo-error"><p class="field__error" id="damage-photo-error"></p></div>' +
      "</div>";
    $$("input[name='ret-condition']").forEach(function (radio) {
      radio.addEventListener("change", function () {
        $("#damage-fields").hidden = $("input[name='ret-condition']:checked").value !== "damaged";
      });
    });
    openDialog("return-dialog");
  }

  function submitReturn(event) {
    event.preventDefault();
    const deal = state.deals.find(function (d) { return d.id === returningId; });
    const item = material(deal.materialId);
    const other = users[deal.otherId];
    const damaged = $("input[name='ret-condition']:checked").value === "damaged";
    if (damaged) {
      const okText = setFieldError("damage-description", $("#damage-description").value.trim().length >= 10 ? "" : "Describe el daño (mínimo 10 caracteres).");
      const okPhoto = setFieldError("damage-photo", $("#damage-photo").files.length ? "" : "Adjunta al menos una foto del daño.");
      if (!okText || !okPhoto) {
        return;
      }
      other.incidents += 1;
      item.condition = "Con desgaste";
    }
    state.deals = state.deals.filter(function (d) { return d !== deal; });
    const historyEntry = { id: uid("h"), title: item.title, role: "lender", otherId: deal.otherId, closedAt: new Date(), rating: 0, condition: damaged ? "Con daños reportados" : "Buen estado" };
    state.history.unshift(historyEntry);
    item.status = "available";
    other.deals += 1;
    if (!damaged) {
      other.onTime += 1;
    }
    closeDialog("return-dialog");
    showToast(damaged ? "Registramos el daño con tus fotos. El trato se cerró y el caso pasa a moderación." : "Devolución confirmada. “" + item.title + "” vuelve a estar disponible.");
    renderLoans();
    renderCatalog();
    renderPublications();
    openRate(deal.otherId, item.title, historyEntry.id);
  }

  function setupLoans() {
    $(".tabs").addEventListener("click", function (event) {
      const tab = event.target.closest("[role='tab']");
      if (tab) {
        selectTab(tab);
      }
    });
    $(".tabs").addEventListener("keydown", function (event) {
      const tabs = $$(".tabs__tab");
      const index = tabs.indexOf(document.activeElement);
      if (index === -1) {
        return;
      }
      let next = null;
      if (event.key === "ArrowRight") {
        next = tabs[(index + 1) % tabs.length];
      } else if (event.key === "ArrowLeft") {
        next = tabs[(index - 1 + tabs.length) % tabs.length];
      } else if (event.key === "Home") {
        next = tabs[0];
      } else if (event.key === "End") {
        next = tabs[tabs.length - 1];
      }
      if (next) {
        event.preventDefault();
        selectTab(next);
        next.focus();
      }
    });

    $("#view-loans").addEventListener("click", function (event) {
      const t = event.target;
      const deal = t.closest("[data-deal]");
      const requestDeal = t.closest("[data-request-deal]");
      const deliver = t.closest("[data-deliver]");
      const ret = t.closest("[data-return]");
      const accept = t.closest("[data-accept]");
      const reject = t.closest("[data-reject]");
      const cancel = t.closest("[data-cancel-request]");
      const chatUser = t.closest("[data-chat-user]");
      const extend = t.closest("[data-extend]");
      if (deal) {
        const d = state.deals.find(function (x) { return x.id === deal.dataset.deal; });
        openDealDetail({ materialId: d.materialId, otherId: d.otherId, role: d.role, point: d.point, slot: d.slot, code: d.status === "pending-delivery" ? d.code : null, dueDate: d.dueDate });
      } else if (requestDeal) {
        const r = state.requestsSent.find(function (x) { return x.id === requestDeal.dataset.requestDeal; });
        openDealDetail({ materialId: r.materialId, otherId: material(r.materialId).ownerId, role: "borrower", point: r.point, slot: r.slot, code: r.code, dueDate: material(r.materialId).modality === "loan" ? r.to : null });
      } else if (deliver) {
        openDelivery(deliver.dataset.deliver);
      } else if (ret) {
        openReturn(ret.dataset.return);
      } else if (accept) {
        openAccept(accept.dataset.accept);
      } else if (reject) {
        const r = state.requestsReceived.find(function (x) { return x.id === reject.dataset.reject; });
        confirmDialog("¿Rechazar solicitud?", "Avisaremos a " + users[r.requesterId].name + " que no puedes prestarle “" + material(r.materialId).title + "”.", "Rechazar", function () {
          r.status = "rejected";
          showToast("Rechazaste la solicitud. Notificamos a " + users[r.requesterId].name + ".");
          renderLoans();
        });
      } else if (cancel) {
        const r = state.requestsSent.find(function (x) { return x.id === cancel.dataset.cancelRequest; });
        const item = material(r.materialId);
        confirmDialog("¿Cancelar solicitud?", "Anularemos tu solicitud de “" + item.title + "” y avisaremos a " + users[item.ownerId].name + ". El material volverá a estar disponible.", "Cancelar solicitud", function () {
          if (r.status === "accepted") {
            item.status = "available";
          }
          r.status = "cancelled";
          showToast("Cancelaste la solicitud de “" + item.title + "”.");
          renderLoans();
          renderCatalog();
        });
      } else if (chatUser) {
        startConversation(chatUser.dataset.material, chatUser.dataset.chatUser);
      } else if (extend) {
        const d = state.deals.find(function (x) { return x.id === extend.dataset.extend; });
        startConversation(d.materialId, d.otherId, "Hola, ¿podría quedarme con “" + material(d.materialId).title + "” unos días más? Te lo devuelvo en el mismo punto.");
      }
    });

    $("#accept-form").addEventListener("submit", submitAccept);
    $("#delivery-form").addEventListener("submit", submitDelivery);
    $("#return-form").addEventListener("submit", submitReturn);
  }

  /* ======================================================================
     9. V6 Chat (HU038, HU039, HU040) - in-memory conversation
     ====================================================================== */
  const PHONE_PATTERN = /(\+?51[\s-]?)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}|\d{7,}/;

  function lastMessage(conversation) {
    return conversation.messages[conversation.messages.length - 1];
  }

  function updateUnreadBadges() {
    const total = state.conversations.reduce(function (sum, c) {
      return sum + c.unread;
    }, 0);
    $$("[data-unread-count]").forEach(function (badge) {
      badge.textContent = total ? String(total) : "";
      badge.hidden = total === 0;
    });
  }

  function renderConversations() {
    const filter = normalize($("#conversation-filter").value);
    const list = state.conversations.slice().sort(function (a, b) {
      return lastMessage(b).time - lastMessage(a).time;
    }).filter(function (c) {
      return !filter || normalize(users[c.userId].name + " " + material(c.materialId).title).indexOf(filter) !== -1;
    });
    const container = $("#conversation-list");
    if (state.conversations.length === 0) {
      container.innerHTML = '<li class="empty-state">Aún no tienes conversaciones.<br><a class="btn btn--primary btn--sm" href="#catalog">Buscar material</a></li>';
    } else if (list.length === 0) {
      container.innerHTML = '<li class="empty-state">Ninguna conversación coincide con tu búsqueda.</li>';
    } else {
      container.innerHTML = list.map(function (c) {
        const user = users[c.userId];
        const last = lastMessage(c);
        const blocked = state.blocked[c.userId];
        return "<li><button class=\"conversation" + (c.unread ? " conversation--unread" : "") + (blocked ? " conversation--blocked" : "") + '" type="button" data-conversation="' + c.id + '"' +
          (state.activeConversation === c.id ? ' aria-current="true"' : "") + ">" +
          '<span class="avatar" aria-hidden="true">' + user.initials + "</span>" +
          '<span class="conversation__body"><span class="conversation__top"><span class="conversation__name">' + escapeHtml(user.name) + "</span>" +
          '<span class="conversation__time">' + relativeTime(last.time) + "</span></span>" +
          '<span class="conversation__last"><span>' + (blocked ? "Usuario bloqueado" : (last.from === "me" ? "Tú: " : "") + escapeHtml(last.text)) + "</span>" +
          (c.unread ? '<span class="count-badge" aria-label="' + plural(c.unread, "mensaje sin leer", "mensajes sin leer") + '">' + c.unread + "</span>" : "") + "</span></span></button></li>";
      }).join("");
    }
    updateUnreadBadges();
  }

  function messageHtml(message) {
    if (message.from === "system") {
      return '<p class="message message--system">' + escapeHtml(message.text) + "</p>";
    }
    const me = message.from === "me";
    return '<div class="message message--' + (me ? "me" : "them") + '"><p class="message__bubble">' + escapeHtml(message.text) + "</p>" +
      '<time datetime="' + message.time.toISOString() + '">' + formatTime(message.time) + (me ? " ✓✓" : "") + "</time></div>";
  }

  function renderThread(prefill) {
    const thread = $("#chat-thread");
    const chat = $("#chat");
    const conversation = state.conversations.find(function (c) { return c.id === state.activeConversation; });
    if (!conversation) {
      chat.classList.remove("is-thread-open");
      thread.innerHTML = '<div class="thread-empty"><div>' + icon("chat") + "<p>Elige una conversación para ver los mensajes.</p></div></div>";
      return;
    }
    chat.classList.add("is-thread-open");
    const user = users[conversation.userId];
    const item = material(conversation.materialId);
    const blocked = state.blocked[conversation.userId];
    thread.innerHTML =
      '<header class="thread__header">' +
        '<button class="icon-btn thread__back" type="button" data-back aria-label="Volver a conversaciones">' + icon("back") + "</button>" +
        '<span class="avatar" aria-hidden="true">' + user.initials + "</span>" +
        '<div class="thread__who"><h2 class="thread__name">' + escapeHtml(user.name) + "</h2>" +
        '<p class="thread__context">' + escapeHtml(item.title) + " · " + DATA.statusLabel[item.status] + "</p></div>" +
        '<button class="icon-btn" type="button" data-profile="' + user.id + '" aria-label="Ver reputación de ' + escapeHtml(user.name) + '">' + icon("user") + "</button>" +
        '<button class="icon-btn" type="button" data-report-user="' + user.id + '" aria-label="Reportar o bloquear a ' + escapeHtml(user.name) + '">' + icon("flag") + "</button>" +
      "</header>" +
      '<p class="thread__safety">' + icon("shield") + "Coordina aquí sin compartir tu número. Entrega solo en puntos seguros del campus.</p>" +
      '<div class="thread__messages" id="thread-messages" role="log" aria-live="polite" aria-label="Mensajes con ' + escapeHtml(user.name) + '">' +
        conversation.messages.map(messageHtml).join("") + "</div>" +
      (blocked
        ? '<p class="notice notice--error" style="margin:1rem">' + icon("block", "notice__icon") + "Bloqueaste a este usuario. No puede escribirte ni ver tus publicaciones.</p>"
        : '<form class="composer" id="composer" novalidate>' +
            '<div class="composer__field"><label class="visually-hidden" for="composer-input">Escribe un mensaje para ' + escapeHtml(user.name) + "</label>" +
            '<textarea id="composer-input" rows="1" placeholder="Escribe un mensaje…" maxlength="500" aria-describedby="composer-error"></textarea></div>' +
            '<button class="composer__send" type="submit" aria-label="Enviar mensaje">' + icon("send") + "</button></form>" +
          '<p class="composer__error" id="composer-error" aria-live="assertive"></p>');
    const messages = $("#thread-messages");
    messages.scrollTop = messages.scrollHeight;
    const input = $("#composer-input");
    if (input) {
      if (prefill) {
        conversation.draft = prefill;
      }
      input.value = conversation.draft || "";
      input.addEventListener("input", function () {
        conversation.draft = input.value;
      });
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          $("#composer").requestSubmit();
        }
      });
      $("#composer").addEventListener("submit", function (event) {
        event.preventDefault();
        sendMessage(conversation);
      });
      if (prefill) {
        input.focus();
      }
    }
  }

  function openConversation(id, prefill) {
    state.activeConversation = id;
    const conversation = state.conversations.find(function (c) { return c.id === id; });
    conversation.unread = 0;
    renderConversations();
    renderThread(prefill);
  }

  function autoReply(text, conversation) {
    const t = normalize(text);
    const item = material(conversation.materialId);
    if (/ampliacion|mas tiempo|unos dias|plazo/.test(t)) {
      return "Sí, sin problema. Te doy una semana más, solo avísame cuando lo devuelvas.";
    }
    if (/disponible|sigue/.test(t)) {
      return "¡Hola! Sí, “" + item.title + "” sigue disponible. ¿Para qué fechas lo necesitas?";
    }
    if (/hora|cuando|donde|punto/.test(t)) {
      return "Podemos vernos en " + item.point + " en la franja que acordamos. ¿Te parece?";
    }
    if (/gracias/.test(t)) {
      return "¡De nada! Para eso estamos 🙌";
    }
    if (/codigo|qr/.test(t)) {
      return "Sí, te muestro el código en la app cuando nos veamos.";
    }
    const generic = ["Perfecto, quedamos así.", "¡Genial! Te escribo cuando esté en el campus.", "Dale, cualquier cosa me avisas por aquí."];
    return generic[conversation.messages.length % generic.length];
  }

  function sendMessage(conversation) {
    const input = $("#composer-input");
    const error = $("#composer-error");
    const text = input.value.trim();
    error.textContent = "";
    if (!text) {
      error.textContent = "Escribe un mensaje antes de enviarlo.";
      input.focus();
      return;
    }
    // HU039: never reveal phone numbers
    if (PHONE_PATTERN.test(text)) {
      error.textContent = "Por tu seguridad no compartas números de teléfono. Coordina todo por este chat.";
      input.focus();
      return;
    }
    conversation.messages.push({ from: "me", text: text, time: new Date() });
    input.value = "";
    conversation.draft = "";
    renderConversations();
    $("#thread-messages").insertAdjacentHTML("beforeend", messageHtml(lastMessage(conversation)));
    const messages = $("#thread-messages");
    const typing = document.createElement("div");
    typing.className = "message message--them";
    typing.innerHTML = '<span class="typing" aria-label="' + escapeHtml(users[conversation.userId].name) + ' está escribiendo"><span></span><span></span><span></span></span>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    input.focus();

    setTimeout(function () {
      typing.remove();
      if (state.blocked[conversation.userId]) {
        return;
      }
      conversation.messages.push({ from: "them", text: autoReply(text, conversation), time: new Date() });
      const viewingThread = state.activeConversation === conversation.id && currentView() === "chat";
      if (viewingThread) {
        $("#thread-messages").insertAdjacentHTML("beforeend", messageHtml(lastMessage(conversation)));
        $("#thread-messages").scrollTop = $("#thread-messages").scrollHeight;
      } else {
        conversation.unread += 1;
        addNotification(users[conversation.userId].name + " te respondió: “" + lastMessage(conversation).text + "”", "info", "chat");
      }
      renderConversations();
    }, 1600 + Math.random() * 900);
  }

  // HU038: start (or reuse) a conversation linked to a material
  function startConversation(materialId, userId, prefill) {
    const item = material(materialId);
    const otherId = userId || item.ownerId;
    let conversation = state.conversations.find(function (c) {
      return c.userId === otherId && c.materialId === materialId;
    });
    if (!conversation) {
      conversation = { id: uid("c"), userId: otherId, materialId: materialId, unread: 0, messages: [
        { from: "system", text: "Conversación iniciada desde la ficha de “" + item.title + "”.", time: new Date() }
      ] };
      state.conversations.push(conversation);
    }
    state.activeConversation = conversation.id;
    go("chat");
    openConversation(conversation.id, prefill || (conversation.messages.length === 1 ? "Hola " + users[otherId].name.split(" ")[0] + ", ¿“" + item.title + "” sigue disponible?" : ""));
  }

  function setupChat() {
    $("#conversation-list").addEventListener("click", function (event) {
      const button = event.target.closest("[data-conversation]");
      if (button) {
        openConversation(button.dataset.conversation);
        const input = $("#composer-input");
        if (input && window.matchMedia("(min-width: 48.01rem)").matches) {
          input.focus();
        }
      }
    });
    $("#chat-thread").addEventListener("click", function (event) {
      if (event.target.closest("[data-back]")) {
        state.activeConversation = null;
        renderConversations();
        renderThread();
        const first = $("#conversation-list button");
        if (first) {
          first.focus();
        }
      }
    });
    $("#conversation-filter").addEventListener("input", renderConversations);
  }

  /* ======================================================================
     10. V7 Rate (HU021) and Report (HU023 user / HU044 publication)
     ====================================================================== */
  const RATE_LABELS = ["", "Muy malo", "Malo", "Regular", "Muy bueno", "Excelente"];
  let ratingTarget = null;

  function openRate(userId, materialTitle, historyId) {
    const user = users[userId];
    ratingTarget = { userId: userId, historyId: historyId };
    $("#rate-title").textContent = "Calificar a " + user.name.split(" ")[0];
    $("#rate-body").innerHTML =
      '<div class="rate-head"><span class="avatar avatar--xl" aria-hidden="true">' + user.initials + "</span>" +
        "<h3>¿Cómo te fue con " + escapeHtml(user.name.split(" ")[0]) + "?</h3><p>Préstamo de “" + escapeHtml(materialTitle) + "”</p></div>" +
      '<fieldset class="stars"><legend class="visually-hidden">Calificación de 1 a 5 estrellas</legend>' +
        [5, 4, 3, 2, 1].map(function (n) {
          return '<input type="radio" name="stars" id="star-' + n + '" value="' + n + '"><label for="star-' + n + '"><span class="visually-hidden">' + plural(n, "estrella", "estrellas") + " – " + RATE_LABELS[n] + "</span>" + icon("star") + "</label>";
        }).join("") + "</fieldset>" +
      '<p class="rate-label" id="rate-label" aria-live="polite">Elige de 1 a 5 estrellas</p>' +
      "<fieldset class=\"filters__group\"><legend>¿Qué destacas? (opcional)</legend><div class=\"chip-group\">" +
        ["Puntual", "Cuidó el material", "Buena comunicación"].map(function (tag) {
          return '<label class="chip-check"><input type="checkbox" value="' + tag + '"><span>' + tag + "</span></label>";
        }).join("") + "</div></fieldset>" +
      '<div class="form-field"><label for="rate-comment">Comentario (opcional)</label><textarea id="rate-comment" rows="3" maxlength="300" placeholder="Cuéntale a la comunidad cómo fue el préstamo."></textarea></div>' +
      '<p class="modal__help">Puedes editar tu calificación durante 48 horas.</p>';
    $$("input[name='stars']").forEach(function (radio) {
      radio.addEventListener("change", function () {
        $("#rate-label").textContent = radio.value + " de 5 · " + RATE_LABELS[radio.value];
      });
    });
    openDialog("rate-dialog");
  }

  function submitRate(event) {
    event.preventDefault();
    const checked = $("input[name='stars']:checked");
    if (!checked) {
      $("#rate-label").textContent = "Elige al menos una estrella para enviar tu calificación.";
      $("#star-5").focus();
      return;
    }
    const stars = Number(checked.value);
    const user = users[ratingTarget.userId];
    user.rating = (user.rating * user.ratings + stars) / (user.ratings + 1);
    user.ratings += 1;
    const comment = $("#rate-comment").value.trim();
    REVIEWS[user.id] = REVIEWS[user.id] || [];
    REVIEWS[user.id].unshift([users.me.name.split(" ")[0] + " " + users.me.name.split(" ")[1].charAt(0) + ".", stars, comment || "Sin comentario."]);
    const entry = state.history.find(function (h) { return h.id === ratingTarget.historyId; });
    if (entry) {
      entry.rating = stars;
    }
    closeDialog("rate-dialog");
    showToast("Calificación enviada. Nuevo promedio de " + user.name.split(" ")[0] + ": " + user.rating.toFixed(1) + " ★");
    renderLoans();
    renderCatalog();
  }

  let reportTarget = null;

  function openReport(type, id) {
    reportTarget = { type: type, id: id };
    const isUser = type === "user";
    const name = isUser ? users[id].name : material(id).title;
    const reasons = isUser
      ? ["No devolvió el material a tiempo", "Devolvió el material con daños", "No se presentó a la entrega", "Trato inadecuado", "Otro motivo"]
      : ["Información falsa o engañosa", "Material sospechoso o prohibido", "Las fotos no corresponden", "Pide pagos fuera de la app", "Otro motivo"];
    $("#report-title").textContent = isUser ? "Reportar a un usuario" : "Reportar publicación";
    $("#report-submit").textContent = isUser ? "Enviar reporte" : "Reportar publicación";
    $("#report-body").innerHTML =
      '<p class="notice notice--error">' + icon("flag", "notice__icon") + "<span>Vas a reportar " + (isUser ? "a " : "") + "<strong>" + escapeHtml(name) + "</strong>. El equipo de moderación lo revisará.</span></p>" +
      '<fieldset class="filters__group"><legend>¿Qué pasó?</legend><div class="radio-list">' + reasons.map(function (reason, index) {
        return '<label class="radio-row radio-row--danger"><input type="radio" name="report-reason" value="' + reason + '"' + (index === 0 ? " checked" : "") + "><span>" + reason + "</span></label>";
      }).join("") + "</div></fieldset>" +
      '<div class="form-field"><label for="report-detail">Detalle' + (isUser ? "" : " (opcional)") + '</label><textarea id="report-detail" rows="3" maxlength="500" aria-describedby="report-detail-error" placeholder="' + (isUser ? "Ej. Quedamos el 20/10 y hasta hoy no responde ni devuelve la calculadora." : "Cuéntanos qué viste.") + '"></textarea><p class="field__error" id="report-detail-error"></p></div>' +
      (isUser ? '<label class="checkbox"><input type="checkbox" id="report-block" checked><span><strong>Bloquear a este usuario</strong><br><small>No podrá ver tus publicaciones ni escribirte.</small></span></label>' : "");
    closeDialog("detail-dialog");
    closeDialog("deal-dialog");
    openDialog("report-dialog");
  }

  function submitReport(event) {
    event.preventDefault();
    const detail = $("#report-detail").value.trim();
    if (reportTarget.type === "user") {
      if (!setFieldError("report-detail", detail.length >= 10 ? "" : "Describe brevemente lo ocurrido (mínimo 10 caracteres).")) {
        $("#report-detail").focus();
        return;
      }
      const user = users[reportTarget.id];
      user.incidents += 1;
      const block = $("#report-block").checked;
      if (block) {
        state.blocked[user.id] = true;
      }
      closeDialog("report-dialog");
      showToast("Reporte enviado" + (block ? " y usuario bloqueado" : "") + ". Moderación lo atenderá en menos de 24 horas.");
      addNotification("Registramos tu reporte sobre " + user.name + ". Caso derivado a moderación (respuesta en menos de 24 h).", "warn", "flag");
      renderCatalog();
      renderConversations();
      if (currentView() === "chat") {
        renderThread();
      }
      renderLoans();
    } else {
      const item = material(reportTarget.id);
      item.flagged = true;
      closeDialog("report-dialog");
      showToast("Gracias. El equipo de moderación revisará “" + item.title + "”.");
      addNotification("Reportaste la publicación “" + item.title + "”. La revisaremos pronto.", "warn", "flag");
    }
  }

  /* ======================================================================
     Init
     ====================================================================== */
  function init() {
    $("#my-initials").textContent = users.me.initials;
    $("#my-name").textContent = users.me.name;
    $("#my-email").textContent = myEmail;

    // HU019: reminders for loans that expire in less than 48 hours
    state.deals.forEach(function (deal) {
      if (deal.role === "borrower" && deal.dueDate.getTime() - Date.now() < 48 * HOUR) {
        const item = material(deal.materialId);
        state.notifications.push({ id: uid("n"), text: "Recordatorio: faltan menos de 48 h para devolver “" + item.title + "” (" + formatDate(deal.dueDate) + ").", kind: "warn", icon: "clock", time: new Date(NOW - 10 * 60000), read: false });
      }
    });
    state.notifications.push(
      { id: uid("n"), text: "Kevin Mendoza y Renato Quispe pidieron tu “Kit de disección”.", kind: "info", icon: "swap", time: new Date(NOW - 2 * HOUR), read: false },
      { id: uid("n"), text: "Lucía Paredes aceptó tu solicitud de “Guía de ejercicios Cálculo”. Entrega en Cafetería – Sede San Isidro.", kind: "ok", icon: "check", time: new Date(NOW - 26 * HOUR), read: true }
    );

    setupDialogs();
    setupPopover("bell-button", "notifications");
    setupPopover("profile-button", "profile-menu");
    $("#notifications-clear").addEventListener("click", function () {
      state.notifications.forEach(function (n) { n.read = true; });
      renderNotifications();
    });
    $("#confirm-form").addEventListener("submit", function (event) {
      event.preventDefault();
      closeDialog("confirm-dialog");
      if (confirmAction) {
        confirmAction();
        confirmAction = null;
      }
    });
    $("#rate-form").addEventListener("submit", submitRate);
    $("#report-form").addEventListener("submit", submitReport);

    setupCatalog();
    setupDetailAndRequest();
    setupPublish();
    setupLoans();
    setupChat();

    renderFilterOptions();
    renderCatalog();
    renderNotifications();
    renderLoans();
    renderConversations();
    renderPublications();
    window.addEventListener("hashchange", route);
    route();
  }

  init();
})();
