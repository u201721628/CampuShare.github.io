/* ==========================================================================
   CampuShare - Simulated login (HU001)
   There is no user system: the form only checks that the email belongs to a
   university domain (*.edu.pe or *.edu) and then opens the demo app.
   The email is kept in sessionStorage only to greet the student in the demo;
   it is removed when the browser tab is closed.
   ========================================================================== */
(function () {
  "use strict";

  const INSTITUTIONAL_EMAIL = /^[^\s@]+@([a-z0-9-]+\.)+(edu\.pe|edu)$/i;

  const form = document.getElementById("login-form");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const emailField = document.getElementById("email-field");
  const passwordField = document.getElementById("password-field");
  const emailHint = document.getElementById("email-hint");
  const passwordHint = document.getElementById("password-hint");
  const togglePassword = document.getElementById("toggle-password");
  const forgotLink = document.getElementById("forgot-link");
  const toastRegion = document.getElementById("toast-region");

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-info"></use></svg><span></span>';
    toast.querySelector("span").textContent = message;
    toastRegion.appendChild(toast);
    setTimeout(function () {
      toast.remove();
    }, 4000);
  }

  function setState(field, input, hint, state, message) {
    field.classList.remove("is-error", "is-valid");
    if (state) {
      field.classList.add(state === "error" ? "is-error" : "is-valid");
    }
    input.setAttribute("aria-invalid", state === "error" ? "true" : "false");
    hint.textContent = message;
  }

  function validateEmail() {
    const value = email.value.trim();
    if (!value) {
      setState(emailField, email, emailHint, "error", "Ingresa tu correo institucional.");
      return false;
    }
    if (!INSTITUTIONAL_EMAIL.test(value)) {
      setState(emailField, email, emailHint, "error",
        "Ese correo no es institucional. Ingresa con el correo de tu universidad (ej. u202312345@upc.edu.pe).");
      return false;
    }
    const domain = value.split("@")[1].toLowerCase();
    const university = domain.indexOf("upc.edu.pe") !== -1 ? "de la UPC" : "universitario";
    setState(emailField, email, emailHint, "valid", "Correo " + university + " reconocido.");
    return true;
  }

  function validatePassword() {
    if (password.value.length < 6) {
      setState(passwordField, password, passwordHint, "error", "La contraseña debe tener al menos 6 caracteres.");
      return false;
    }
    setState(passwordField, password, passwordHint, null, "Mínimo 6 caracteres.");
    return true;
  }

  email.addEventListener("blur", function () {
    if (email.value.trim()) {
      validateEmail();
    }
  });

  email.addEventListener("input", function () {
    if (emailField.classList.contains("is-error")) {
      validateEmail();
    }
  });

  togglePassword.addEventListener("click", function () {
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    togglePassword.setAttribute("aria-pressed", String(!visible));
    togglePassword.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
  });

  forgotLink.addEventListener("click", function (event) {
    event.preventDefault();
    showToast("Te enviaríamos un enlace de recuperación a tu correo institucional (simulado).");
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const emailOk = validateEmail();
    const passwordOk = validatePassword();
    if (!emailOk) {
      email.focus();
      return;
    }
    if (!passwordOk) {
      password.focus();
      return;
    }
    try {
      sessionStorage.setItem("campushare.email", email.value.trim().toLowerCase());
    } catch (error) {
      // Storage may be blocked; the demo still works with a default student.
    }
    window.location.href = "app.html#catalog";
  });
})();
