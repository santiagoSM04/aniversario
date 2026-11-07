/* La información editable está en contenido.js. Este archivo da vida al álbum. */
(() => {
  "use strict";
  const c = window.ANIVERSARIO;
  if (!c) return;
  const $ = (id) => document.getElementById(id);
  const setText = (id, value) => { if (value != null) $(id).textContent = value; };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const photos = Array.isArray(c.fotos) ? c.fotos : [];
  const videos = Array.isArray(c.videos) ? c.videos : [];
  const reasons = Array.isArray(c.razones) ? c.razones : [];
  const mediaPath = (path) => (path || "").trim().replaceAll("\\", "/");
  const safeImage = (img, path, fallback, position) => {
    img.onerror = () => {
      img.onerror = null;
      img.src = fallback;
    };
    img.src = path || fallback;
    if (position) img.style.objectPosition = position;
  };

  // Textos: se usan nodos de texto para aceptar tildes, signos y comillas.
  document.title = `Nuestra historia · ${c.nombreDeElla || "Mi amor"}`;
  const cover = c.portada || {};
  if (cover.titulo) {
    const words = cover.titulo.trim().split(/\s+/);
    const last = words.pop();
    const title = $("hero-title");
    title.replaceChildren(document.createTextNode(words.join(" ") + " "));
    const emphasis = document.createElement("em");
    emphasis.textContent = last;
    title.append(emphasis);
  }
  setText("hero-description", cover.descripcion);
  setText("hero-dedication", cover.dedicatoria);
  setText("cover-caption", cover.piePrincipal);
  setText("detail-caption", cover.pieSecundario);
  safeImage($("cover-photo"), cover.fotoPrincipal, "assets/fotos/portada.jpeg", cover.encuadrePrincipal);
  safeImage($("detail-photo"), cover.fotoSecundaria, "assets/fotos/nosotros.jpeg", cover.encuadreSecundario);
  setText("intro-text", c.introduccion);
  setText("footer-text", c.pieDePagina);
  if (c.descripcionAlbum) {
    const description = $("album-description");
    const hint = document.createElement("span");
    hint.textContent = videos.length
      ? "Toca una foto para ampliarla o dale play a un video."
      : "Toca una para verla más cerquita.";
    description.replaceChildren(document.createTextNode(c.descripcionAlbum), document.createElement("br"), hint);
  }

  // Se cuentan días de calendario en Lima; las zonas horarias no cambian la fecha elegida.
  const dayMs = 86400000;
  const parseDate = (text) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || "");
    if (!match) return null;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    if (year < 1900 || year > 9999) return null;
    const value = Date.UTC(year, month - 1, day);
    const date = new Date(value);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : null;
  };
  const updateCounter = () => {
    const start = parseDate(c.fechaInicio);
    if (start === null) return;
    const pieces = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const parts = Object.fromEntries(pieces.map((p) => [p.type, p.value]));
    const today = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
    const days = Math.floor((today - start) / dayMs);
    if (days < 0) return;
    $("days-count").textContent = new Intl.NumberFormat("es-PE").format(days);
    $("since-label").textContent = "Desde el " + new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(start));
    $("together-counter").hidden = false;
  };
  updateCounter();
  if (parseDate(c.fechaInicio) !== null) window.setInterval(updateCounter, 60000);

  // Línea de recuerdos.
  (c.recuerdos || []).forEach((memory) => {
    const item = document.createElement("article");
    item.className = "memory-item";
    const label = document.createElement("p");
    label.className = "memory-label";
    label.textContent = memory.etiqueta || "UN RECUERDO";
    const title = document.createElement("h3");
    title.textContent = memory.titulo || "Un momento nuestro";
    const description = document.createElement("p");
    description.textContent = memory.texto || "";
    item.append(label, title, description);
    $("memory-timeline").append(item);
  });

  // Galería y visor. Funciona sin servidor al abrir index.html.
  const photoDialog = $("photo-dialog");
  const videoDialog = $("video-dialog");
  const letterDialog = $("letter-dialog");
  const dialogs = [photoDialog, videoDialog, letterDialog];
  const videoPlayer = $("video-player");
  const videoMessage = $("video-message");
  let activePhoto = 0;
  let returnFocus = null;
  const syncModalLock = () => {
    document.body.classList.toggle("modal-open", dialogs.some((dialog) => dialog.open));
  };
  const showDialog = (dialog, trigger) => {
    if (dialog.open) return;
    returnFocus = trigger || document.activeElement;
    dialog.showModal();
    syncModalLock();
  };
  const displayPhoto = (index) => {
    if (!photos.length) return;
    activePhoto = (index + photos.length) % photos.length;
    const photo = photos[activePhoto];
    const image = $("lightbox-image");
    image.alt = photo.titulo || `Recuerdo ${activePhoto + 1}`;
    safeImage(image, photo.archivo, "assets/foto-no-disponible.svg");
    setText("lightbox-counter", `${String(activePhoto + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`);
    setText("lightbox-title", photo.titulo || "Un recuerdo nuestro");
    setText("lightbox-caption", photo.detalle || "");
  };
  const createAlbumCard = ({ title, detail, badge, action, dialog }) => {
    const figure = document.createElement("figure");
    figure.className = "photo-card";
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${action}: ${title}`);
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", dialog.id);
    const frame = document.createElement("span");
    frame.className = "photo-window";
    const number = document.createElement("span");
    number.className = "photo-number";
    number.textContent = badge;
    number.setAttribute("aria-hidden", "true");
    frame.append(number);

    const caption = document.createElement("span");
    caption.className = "photo-card-caption";
    const captionTitle = document.createElement("strong");
    captionTitle.textContent = title;
    const captionDetail = document.createElement("span");
    captionDetail.textContent = detail;
    caption.append(captionTitle, captionDetail);
    button.append(frame, caption);
    figure.append(button);
    $("photo-grid").append(figure);
    return { button, frame };
  };

  photos.forEach((photo, index) => {
    const title = photo.titulo || `Recuerdo ${index + 1}`;
    const { button, frame } = createAlbumCard({
      title,
      detail: photo.etiqueta || "",
      badge: `NO. ${String(index + 1).padStart(2, "0")}`,
      action: "Ampliar foto",
      dialog: photoDialog
    });
    const img = document.createElement("img");
    img.alt = title;
    img.width = 800;
    img.height = 1000;
    img.loading = "lazy";
    img.decoding = "async";
    safeImage(img, photo.archivo, "assets/foto-no-disponible.svg", photo.encuadre);
    const expand = document.createElement("span");
    expand.className = "photo-expand";
    expand.textContent = "↗";
    expand.setAttribute("aria-hidden", "true");
    frame.prepend(img);
    frame.append(expand);
    button.addEventListener("click", () => {
      displayPhoto(index);
      showDialog(photoDialog, button);
    });
  });

  const showVideoError = () => {
    if (!videoDialog.open) return;
    videoPlayer.hidden = true;
    videoMessage.textContent = "Este recuerdo todavía no se puede reproducir.";
    videoMessage.hidden = false;
  };

  videos.forEach((clip, index) => {
    const title = clip.titulo || `Video ${index + 1}`;
    const badge = `VIDEO · ${String(photos.length + index + 1).padStart(2, "0")}`;
    const { button, frame } = createAlbumCard({
      title,
      detail: "Toca para reproducir",
      badge,
      action: "Reproducir video",
      dialog: videoDialog
    });
    frame.classList.add("video-window");
    const play = document.createElement("span");
    play.className = "video-play";
    play.setAttribute("aria-hidden", "true");
    frame.append(play);

    button.addEventListener("click", async () => {
      setText("video-title", title);
      setText("video-number", badge);
      setText("video-caption", clip.detalle || "");
      videoMessage.hidden = true;
      videoPlayer.hidden = false;
      showDialog(videoDialog, button);

      const source = mediaPath(clip.archivo);
      if (!source) {
        showVideoError();
        return;
      }
      videoPlayer.src = source;
      try {
        await videoPlayer.play();
      } catch (error) {
        if (!videoDialog.open || error.name === "AbortError") return;
        if (videoPlayer.error) {
          showVideoError();
        } else {
          videoMessage.textContent = "Toca el botón de play del reproductor para ver el video.";
          videoMessage.hidden = false;
        }
      }
    });
  });
  videoPlayer.addEventListener("error", showVideoError);
  videoPlayer.addEventListener("playing", () => { videoMessage.hidden = true; });
  videoDialog.addEventListener("close", () => {
    videoPlayer.pause();
    videoPlayer.removeAttribute("src");
    videoPlayer.load();
  });

  $("previous-photo").disabled = photos.length < 2;
  $("next-photo").disabled = photos.length < 2;
  $("previous-photo").addEventListener("click", () => displayPhoto(activePhoto - 1));
  $("next-photo").addEventListener("click", () => displayPhoto(activePhoto + 1));
  $("close-photo").addEventListener("click", () => photoDialog.close());
  $("close-video").addEventListener("click", () => videoDialog.close());
  $("close-letter").addEventListener("click", () => letterDialog.close());
  dialogs.forEach((dialog) => {
    dialog.addEventListener("close", () => {
      syncModalLock();
      if (returnFocus instanceof HTMLElement) returnFocus.focus({ preventScroll: true });
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
  });
  document.addEventListener("keydown", (event) => {
    if (!photoDialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); displayPhoto(activePhoto - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); displayPhoto(activePhoto + 1); }
  });
  let touchStart = null;
  const lightboxImage = $("lightbox-image");
  lightboxImage.addEventListener("touchstart", (event) => {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  lightboxImage.addEventListener("touchend", (event) => {
    if (!touchStart || !event.changedTouches.length) return;
    const x = event.changedTouches[0].clientX - touchStart.x;
    const y = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(x) > 55 && Math.abs(x) > Math.abs(y) * 1.4) displayPhoto(activePhoto + (x < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  lightboxImage.addEventListener("touchcancel", () => { touchStart = null; }, { passive: true });

  // Razones para sonreír.
  let reasonIndex = 0;
  const displayReason = () => {
    if (!reasons.length) { $("razones").hidden = true; return; }
    setText("reason-text", reasons[reasonIndex]);
    setText("reason-number", String(reasonIndex + 1).padStart(2, "0"));
  };
  displayReason();
  $("next-reason").addEventListener("click", () => {
    if (!reasons.length) return;
    reasonIndex = (reasonIndex + 1) % reasons.length;
    displayReason();
    if (!reducedMotion.matches) {
      $("reason-card").classList.remove("change");
      void $("reason-card").offsetWidth;
      $("reason-card").classList.add("change");
    }
  });

  // Carta: nunca se inventa una fecha ni una duración del aniversario.
  const letter = c.carta || {};
  setText("letter-salutation", letter.saludo || `${c.nombreDeElla || "Mi amor"},`);
  (letter.parrafos || []).forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    $("letter-body").append(p);
  });
  setText("letter-signoff", letter.despedida);
  setText("letter-signature", c.tuNombre);
  setText("letter-afterword", letter.posdata);
  let celebrated = false;
  const celebrate = () => {
    if (reducedMotion.matches) return;
    const stage = $("heart-confetti");
    for (let i = 0; i < 14; i++) {
      const heart = document.createElement("span");
      heart.className = "confetti-heart";
      heart.textContent = "♡";
      heart.style.setProperty("--x", `${(Math.random() - .5) * Math.min(innerWidth, 600)}px`);
      heart.style.setProperty("--y", `${-70 - Math.random() * 230}px`);
      heart.style.setProperty("--rotation", `${(Math.random() - .5) * 150}deg`);
      heart.style.animationDelay = `${Math.random() * .2}s`;
      stage.append(heart);
      window.setTimeout(() => heart.remove(), 2100);
    }
  };
  $("open-letter").addEventListener("click", () => {
    showDialog(letterDialog, $("open-letter"));
    letterDialog.scrollTop = 0;
    if (!celebrated) { celebrate(); celebrated = true; }
  });

  // Música opcional, con reproducción iniciada por la visitante.
  const songSource = mediaPath(c.musica?.archivo);
  if (songSource) {
    const music = new Audio();
    music.preload = "none";
    music.loop = true;
    const volume = Number(c.musica.volumen);
    music.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : .35;
    const toggle = $("music-toggle");
    const label = toggle.querySelector("span");
    const name = c.musica.nombre || "Nuestra canción";
    toggle.hidden = false;
    const syncMusic = () => {
      label.textContent = name;
      toggle.setAttribute("aria-pressed", String(!music.paused));
      toggle.setAttribute("aria-label", `${music.paused ? "Reproducir" : "Pausar"} ${name}`);
    };
    const showMusicError = () => {
      label.textContent = "Reintentar canción";
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", `Reintentar ${name}`);
      $("status-message").textContent = "La canción no se pudo cargar. Toca el botón para reintentar.";
    };
    syncMusic();
    music.addEventListener("playing", () => {
      $("status-message").textContent = "";
      syncMusic();
    });
    music.addEventListener("pause", () => {
      if (!music.error) syncMusic();
    });
    music.addEventListener("error", showMusicError);
    videoPlayer.addEventListener("playing", () => music.pause());
    toggle.addEventListener("click", async () => {
      if (!music.paused) {
        music.pause();
        return;
      }
      if (!music.getAttribute("src") || music.error) music.src = songSource;
      try {
        await music.play();
      } catch (error) {
        if (error.name !== "AbortError") showMusicError();
      }
    });
  }

  // Indicador discreto de lectura.
  let progressScheduled = false;
  const updateProgress = () => {
    const height = document.documentElement.scrollHeight - innerHeight;
    $("reading-progress").style.width = `${height > 0 ? Math.max(0, Math.min(100, scrollY / height * 100)) : 0}%`;
    progressScheduled = false;
  };
  const scheduleProgress = () => {
    if (progressScheduled) return;
    progressScheduled = true;
    requestAnimationFrame(updateProgress);
  };
  window.addEventListener("scroll", scheduleProgress, { passive: true });
  window.addEventListener("resize", scheduleProgress);
  window.addEventListener("load", scheduleProgress);
  updateProgress();
})();
