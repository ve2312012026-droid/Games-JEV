const games = [
  {
    id: "ruleta",
    name: "Ruleta Clasica",
    description: "4 opciones - Solo 1 correcta"
  },
  {
    id: "cien-hermanos",
    name: "Cien Hermanos Dijeron",
    description: "Varias respuestas + sistema de fallos"
  }
];

const partidas = {
  ruleta: [
    { id: 1, title: "Personajes del Antiguo Testamento" },
    { id: 2, title: "Milagros de Jesus" },
    { id: 3, title: "Libros de la Biblia" }
  ],
  "cien-hermanos": [
    { id: 1, title: "Nombra un milagro de Jesus" },
    { id: 2, title: "Nombra un fruto del Espiritu" },
    { id: 3, title: "Nombra un personaje que dudo" }
  ]
};

const preguntasRuleta = {
  1: {
    pregunta: "Quien construyo el arca?",
    opciones: ["Abraham", "Noe", "Moises", "David"],
    correcta: 1
  },
  2: {
    pregunta: "Cuantos dias estuvo Jesus en el desierto?",
    opciones: ["20", "30", "40", "50"],
    correcta: 2
  },
  3: {
    pregunta: "Cual es el primer libro de la Biblia?",
    opciones: ["Exodo", "Genesis", "Levitico", "Numeros"],
    correcta: 1
  }
};

const preguntasCien = {
  1: {
    pregunta: "Nombra un milagro de Jesus",
    respuestas: [
      { texto: "Multiplicacion de los panes", puntos: 30 },
      { texto: "Caminar sobre el agua", puntos: 25 },
      { texto: "Resucitar a Lazaro", puntos: 20 },
      { texto: "Sanar al ciego", puntos: 15 },
      { texto: "Convertir agua en vino", puntos: 10 }
    ]
  },
  2: {
    pregunta: "Nombra un fruto del Espiritu",
    respuestas: [
      { texto: "Amor", puntos: 25 },
      { texto: "Gozo", puntos: 20 },
      { texto: "Paz", puntos: 18 },
      { texto: "Paciencia", puntos: 15 },
      { texto: "Benignidad", puntos: 12 }
    ]
  },
  3: {
    pregunta: "Nombra un personaje que dudo",
    respuestas: [
      { texto: "Tomas", puntos: 30 },
      { texto: "Moises", puntos: 25 },
      { texto: "Jonas", puntos: 20 },
      { texto: "Gedeon", puntos: 15 },
      { texto: "Pedro", puntos: 10 }
    ]
  }
};

let currentGame = null;

function renderJuegos() {
  const html = `
    <h1 class="section-title">Juegos</h1>
    ${games.map(game => `
      <div class="game-card" onclick="selectGame('${game.id}')">
        <div>
          <h2>${game.name}</h2>
          <p>${game.description}</p>
        </div>
        <div style="font-size:22px; opacity:0.8;">></div>
      </div>
    `).join("")}
  `;
  document.getElementById("content").innerHTML = html;
}

function selectGame(gameId) {
  currentGame = gameId;
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
  document.querySelector('[data-section="partidas"]').classList.add("active");
  renderPartidas();
}

function renderPartidas() {
  if (!currentGame) {
    document.getElementById("content").innerHTML = `
      <h1 class="section-title">Partidas</h1>
      <p style="color:#6b7280">Primero selecciona un juego en la pestana Juegos.</p>
    `;
    return;
  }

  const gameName = games.find(g => g.id === currentGame).name;
  const lista = partidas[currentGame] || [];

  const html = `
    <h1 class="section-title">Partidas</h1>
    <p style="color:#6b7280; margin-bottom:20px">${gameName}</p>
    ${lista.map(p => `
      <div class="partida-card" onclick="abrirPartida('${currentGame}', ${p.id})">
        <span>${p.title}</span>
        <div class="play-btn">></div>
      </div>
    `).join("")}
  `;
  document.getElementById("content").innerHTML = html;
}

function abrirPartida(game, id) {
  window.location.href = "partida.html?game=" + game + "&id=" + id;
}

function renderAjustes() {
  const html = `
    <h1 class="section-title">Ajustes</h1>
    <p style="color:#6b7280; margin-bottom:20px; font-size:14px">
      Aqui es el unico lugar donde se edita y elimina contenido.
    </p>
    ${games.map(game => `
      <div class="ajuste-item" onclick="toggleAjuste('${game.id}')">
        <span>${game.name}</span>
        <span id="arrow-${game.id}">></span>
      </div>
      <div class="ajuste-actions" id="actions-${game.id}">
        <button onclick="alert('Editar partidas de ${game.name}')">Editar partidas</button>
        <button onclick="alert('Anadir nueva partida')">Anadir nueva partida</button>
        <button class="danger" onclick="alert('Eliminar juego')">Eliminar juego</button>
      </div>
    `).join("")}
  `;
  document.getElementById("content").innerHTML = html;
}

function toggleAjuste(id) {
  const el = document.getElementById("actions-" + id);
  el.classList.toggle("show");
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".bottom-nav")) {
    renderJuegos();

    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const section = btn.dataset.section;
        if (section === "juegos") renderJuegos();
        if (section === "partidas") renderPartidas();
        if (section === "ajustes") renderAjustes();
      });
    });
  }
});

function joinGame() {
  const name = document.getElementById("player-name").value.trim();
  if (!name) {
    alert("Escribe tu nombre");
    return;
  }

  document.getElementById("join-card").classList.add("hidden");
  document.getElementById("waiting-card").classList.remove("hidden");
  document.getElementById("greeting").textContent = "Hola, " + name;
}

function iniciarPartida(game, id) {
  const titleEl = document.getElementById("partida-title");
  const modeEl = document.getElementById("partida-mode");

  if (game === "ruleta") {
    document.getElementById("ruleta-view").classList.remove("hidden");
    document.getElementById("cien-view").classList.add("hidden");
    modeEl.textContent = "Ruleta Clasica";

    const data = preguntasRuleta[id];
    if (data) {
      titleEl.textContent = partidas.ruleta.find(p => p.id == id)?.title || "Partida";
    }
  } else {
    document.getElementById("ruleta-view").classList.add("hidden");
    document.getElementById("cien-view").classList.remove("hidden");
    modeEl.textContent = "Cien Hermanos Dijeron";

    const data = preguntasCien[id];
    if (data) {
      titleEl.textContent = data.pregunta;
      document.getElementById("texto-pregunta-cien").textContent = data.pregunta;

      const contenedor = document.getElementById("respuestas-cien");
      contenedor.innerHTML = data.respuestas.map((r, i) => `
        <div class="respuesta-item" id="resp-${i}" onclick="revelarRespuesta(${i}, ${r.puntos})">
          <span>${i + 1}. ----------</span>
          <span>${r.puntos} pts</span>
        </div>
      `).join("");

      const strikesContainer = document.getElementById("strikes-container");
      strikesContainer.innerHTML = "";
      for (let i = 0; i < 3; i++) {
        const span = document.createElement("div");
        span.className = "strike";
        span.id = "strike-" + i;
        strikesContainer.appendChild(span);
      }
    }
  }
}

function girarRuleta() {
  const ruleta = document.getElementById("ruleta");
  const btn = document.getElementById("btn-girar");
  btn.disabled = true;
  btn.textContent = "Girando...";

  const rotacion = 1800 + Math.floor(Math.random() * 360);
  ruleta.style.transform = "rotate(" + rotacion + "deg)";

  setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || "1";
    const data = preguntasRuleta[id];

    if (data) {
      document.getElementById("pregunta-ruleta").classList.remove("hidden");
      document.getElementById("texto-pregunta").textContent = data.pregunta;

      const opciones = document.getElementById("opciones-ruleta");
      opciones.innerHTML = data.opciones.map((op, i) => `
        <div class="opcion" onclick="responderRuleta(${i}, ${data.correcta})">${op}</div>
      `).join("");
    }

    btn.disabled = false;
    btn.textContent = "Girar Ruleta";
  }, 5200);
}

function responderRuleta(elegida, correcta) {
  const opciones = document.querySelectorAll(".opcion");
  opciones.forEach((el, i) => {
    el.onclick = null;
    if (i === correcta) el.classList.add("correcta");
    if (i === elegida && elegida !== correcta) el.classList.add("incorrecta");
  });

  const resultado = document.getElementById("resultado-ruleta");
  resultado.classList.remove("hidden");

  if (elegida === correcta) {
    resultado.textContent = "Correcto +5 puntos";
    resultado.className = "resultado ganador";
  } else {
    resultado.textContent = "Incorrecto";
    resultado.className = "resultado perdedor";
  }
}

function revelarRespuesta(index, puntos) {
  const el = document.getElementById("resp-" + index);
  if (el.classList.contains("revelada")) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "1";
  const data = preguntasCien[id];

  el.classList.add("revelada");
  el.innerHTML = "<span>" + (index + 1) + ". " + data.respuestas[index].texto + "</span><span>" + puntos + " pts</span>";
}

function revelarTodo() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "1";
  const data = preguntasCien[id];

  data.respuestas.forEach((r, i) => {
    const el = document.getElementById("resp-" + i);
    el.classList.add("revelada");
    el.innerHTML = "<span>" + (i + 1) + ". " + r.texto + "</span><span>" + r.puntos + " pts</span>";
  });
}
