/* ==========================================================================
   CampuShare - Landing page interactions (basic JavaScript)
   1. Mobile navigation toggle
   2. Catalog preview: search, category chips and campus select
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- 1. Mobile navigation ---------- */
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.getElementById("site-nav");

  function closeMenu() {
    siteNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú de navegación");
    menuToggle.querySelector("use").setAttribute("href", "#i-menu");
  }

  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", function () {
      const isOpen = siteNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación");
      menuToggle.querySelector("use").setAttribute("href", isOpen ? "#i-close" : "#i-menu");
    });

    siteNav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
        closeMenu();
        menuToggle.focus();
      }
    });
  }

  /* ---------- 2. Catalog preview ---------- */
  const data = window.CampuShareData;
  const grid = document.getElementById("preview-grid");
  const form = document.getElementById("preview-search");
  const queryInput = document.getElementById("preview-query");
  const campusSelect = document.getElementById("preview-campus");
  const status = document.getElementById("preview-status");
  const chips = document.querySelectorAll("[data-category]");

  if (!data || !grid) {
    return;
  }

  const filters = { query: "", category: "all", campus: campusSelect ? campusSelect.value : "all" };

  function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function cardTemplate(material) {
    const available = material.status === "available";
    const owner = data.users[material.ownerId];
    return (
      '<li class="material-card">' +
        '<div class="material-card__media"><svg class="icon" aria-hidden="true"><use href="#i-book"></use></svg></div>' +
        '<div class="material-card__body">' +
          '<div class="material-card__top">' +
            '<span class="badge ' + (available ? "badge--ok" : "badge--warn") + '">' + data.statusLabel[material.status] + "</span>" +
            '<span class="rating" aria-label="Calificación ' + owner.rating + ' de 5"><svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg>' + owner.rating + "</span>" +
          "</div>" +
          '<h3 class="material-card__title">' + escapeHtml(material.title) + "</h3>" +
          '<p class="material-card__meta"><svg class="icon" aria-hidden="true"><use href="#i-book"></use></svg>' + escapeHtml(material.course) + "</p>" +
          '<p class="material-card__meta"><svg class="icon" aria-hidden="true"><use href="#i-pin"></use></svg>Sede ' + escapeHtml(material.campus) + "</p>" +
          '<div class="material-card__actions">' +
            (available
              ? '<a class="btn btn--primary btn--sm btn--block" href="login.html">Solicitar préstamo</a>'
              : '<a class="btn btn--secondary btn--sm btn--block" href="login.html">Avisarme si se libera</a>') +
          "</div>" +
        "</div>" +
      "</li>"
    );
  }

  function render() {
    const query = normalize(filters.query.trim());
    const results = data.materials.filter(function (material) {
      if (material.ownerId === "me" || (material.status !== "available" && material.status !== "reserved")) {
        return false;
      }
      const text = normalize([material.title, material.course, material.code, material.campus, material.category].join(" "));
      const matchesQuery = !query || text.indexOf(query) !== -1;
      const matchesCategory = filters.category === "all" || material.category === filters.category;
      const matchesCampus = filters.campus === "all" || material.campus === filters.campus;
      return matchesQuery && matchesCategory && matchesCampus;
    }).slice(0, 4);

    if (results.length === 0) {
      grid.innerHTML = '<li class="empty-state">No encontramos materiales con esos filtros. Prueba con otro curso o sede.</li>';
    } else {
      grid.innerHTML = results.map(cardTemplate).join("");
    }
    status.textContent = results.length + (results.length === 1 ? " material encontrado" : " materiales encontrados");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    filters.query = queryInput.value;
    render();
  });

  queryInput.addEventListener("input", function () {
    filters.query = queryInput.value;
    render();
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (other) {
        other.setAttribute("aria-pressed", "false");
      });
      chip.setAttribute("aria-pressed", "true");
      filters.category = chip.dataset.category;
      render();
    });
  });

  if (campusSelect) {
    campusSelect.addEventListener("change", function () {
      filters.campus = campusSelect.value;
      render();
    });
  }

  render();
})();
