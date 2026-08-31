document.getElementById("year").textContent = new Date().getFullYear();

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

toggle?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  nav.setAttribute("aria-hidden", String(!isOpen));
});

nav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    nav.setAttribute("aria-hidden", "true");
  });
});

function handleSubmit(event){
  event.preventDefault();
  document.getElementById("form-note").textContent =
    "Bedankt! Het formulier is klaar om aan je eigen e-mail of webshop te koppelen.";
}
