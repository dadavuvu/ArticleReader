document.addEventListener('DOMContentLoaded', async function () {
  function setTheme() {
    document.body.className = ""
    document.body.classList.add(window.localStorage.getItem("theme") || "white")
  }

  document.querySelector('#setting').addEventListener('click', function () {
    window.localStorage.setItem("theme", window.localStorage.getItem("theme") == "white" && "black" || "white");
    setTheme()
  });

  setTheme()

  document.querySelector('#prev-web').addEventListener('click', function () {
    history.back();
  });

  document.querySelector('#next-web').addEventListener('click', function () {
    history.forward();
  });

  document.querySelector('#go-root').addEventListener('click', function () {
    location.href = "/"
  });

  document.querySelector('#refresh').addEventListener('click', function () {
    location.reload()
  });

  const toggleButton = document.querySelector("#toggleButton");
  const navbar = document.querySelector("#navbar");
  const closeNavbar = document.querySelector("#untoggleButton");

  toggleButton.addEventListener("click", () => {
    navbar.classList.toggle("show");
    closeNavbar.classList.toggle("unshow");
  });
});