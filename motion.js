/* Camada de movimento dos sites de restaurante (Loocaw / MenuFlix).
   GSAP + ScrollTrigger + Lenis. Se as bibliotecas não carregarem ou o visitante preferir menos movimento,
   nada muda: o site continua com as animações simples do app.js. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  root.classList.add("mo");
  const fine = window.matchMedia("(pointer: fine)").matches;
  const desktop = () => window.innerWidth >= 1024;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const EASE = "expo.out";

  /* ---------- rolagem suave (só mouse/trackpad; no celular fica a rolagem nativa) ---------- */
  let lenis = null;
  if (window.Lenis && fine) {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // âncoras do menu passam pela rolagem suave, descontando o topo fixo
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      const target = id.length > 1 ? $(id) : null;
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -72, duration: 1.4 });
    });
  }

  /* ---------- quebra títulos em palavras (preserva <em>, <span> etc.) ---------- */
  function splitWords(el) {
    if (el.dataset.split) return $$(".w > i", el);
    el.dataset.split = "1";
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) return frag.append(document.createTextNode(p));
            const w = document.createElement("span");
            w.className = "w";
            const i = document.createElement("i");
            i.textContent = p;
            w.append(i);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains("w")) {
          walk(n);
        }
      });
    };
    walk(el);
    return $$(".w > i", el);
  }

  /* ---------- abertura (só na primeira visita da sessão) ---------- */
  const heroTl = gsap.timeline({ paused: true, defaults: { ease: EASE } });
  const heroTitle = $(".hero__title");
  if (heroTitle) heroTl.from(splitWords(heroTitle), { yPercent: 115, rotate: 4, duration: 1.2, stagger: 0.07 }, 0);
  heroTl.from([".status", ".hero__eyebrow"].map((s) => $(s)).filter(Boolean), { y: 18, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.1);
  heroTl.from($$(".hero__lead, .hero__ctas > *"), { y: 26, opacity: 0, duration: 1, stagger: 0.08 }, 0.45);
  // só máscara + opacidade: esses elementos já têm animação CSS própria (flutuar/“chiado”)
  const visual = $$(".hero__burger, .hero__art .plate");
  if (visual.length) heroTl.from(visual, { clipPath: "inset(20% 20% 20% 20% round 40px)", opacity: 0, duration: 1.6, stagger: 0.12 }, 0.05);
  const badges = $$(".sticker, .seal");
  if (badges.length) heroTl.from(badges, { scale: 0, rotate: -40, duration: 1, ease: "back.out(1.8)", stagger: 0.12 }, 0.75);
  heroTl.from(".nav__inner > *", { y: -20, opacity: 0, duration: 0.8, stagger: 0.06 }, 0.2);

  // A abertura (.mo-loader) é só CSS e já está no HTML: aparece no 1º quadro e some sozinha em ~1,9 s.
  // Aqui só sincronizamos a entrada do topo. Se as bibliotecas chegarem tarde, o topo já está à vista:
  // não animamos de novo para não "piscar".
  const now = performance.now();
  const intro = !root.classList.contains("no-intro");
  const LOADER_END = 1250; // ms desde o início da página
  if (intro && now < LOADER_END + 300) {
    gsap.delayedCall(Math.max(0, LOADER_END - now) / 1000, () => heroTl.play());
  } else if (!intro && now < 700) {
    heroTl.play();
  } else {
    heroTl.progress(1);
  }
  setTimeout(() => $(".mo-loader")?.remove(), Math.max(0, 2200 - now));

  /* ---------- barra de progresso de leitura ---------- */
  const bar = document.createElement("div");
  bar.className = "mo-progress";
  document.body.append(bar);
  gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  /* ---------- títulos de seção: palavras sobem; linha do “eyebrow” cresce ---------- */
  $$(".section__title").forEach((t) => {
    gsap.from(splitWords(t), { yPercent: 115, duration: 1.1, ease: EASE, stagger: 0.05, scrollTrigger: { trigger: t, start: "top 85%" } });
  });
  $$(".eyebrow").forEach((e) => {
    gsap.from(e, { opacity: 0, x: -18, duration: 0.9, ease: EASE, scrollTrigger: { trigger: e, start: "top 88%" } });
  });

  /* ---------- fotos se revelam com máscara + leve zoom ---------- */
  const masked = $$(".dish, .cat, .gallery__item, .story__img, .lunch__side, .plate-reveal, .map");
  masked.forEach((el) => {
    const img = $("img", el) || (el.tagName === "IMG" ? el : null);
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 88%" } });
    tl.from(el, { clipPath: "inset(100% 0% 0% 0% round 14px)", duration: 1.3, ease: "expo.inOut", clearProps: "clipPath" });
    // clearProps devolve o zoom de hover que o CSS já tinha
    if (img && img !== el) tl.from(img, { scale: 1.3, duration: 1.6, ease: EASE, clearProps: "transform" }, 0);
  });
  // textos dentro dos cards entram depois da foto
  $$(".dish__body").forEach((b) => {
    gsap.from(b.children, { y: 20, opacity: 0, duration: 0.8, ease: EASE, stagger: 0.06, scrollTrigger: { trigger: b, start: "top 92%" } });
  });

  /* ---------- demais blocos: sobem em sequência ---------- */
  const others = $$(".reveal").filter((el) => !masked.includes(el) && !el.classList.contains("section__head"));
  ScrollTrigger.batch(others, {
    start: "top 90%",
    onEnter: (batch) => gsap.from(batch, { y: 40, opacity: 0, duration: 1, ease: EASE, stagger: 0.08, overwrite: true }),
  });
  $$(".section__head .section__lead, .section__head p:not(.eyebrow)").forEach((p) => {
    gsap.from(p, { y: 20, opacity: 0, duration: 1, ease: EASE, scrollTrigger: { trigger: p, start: "top 90%" } });
  });

  /* ---------- profundidade (parallax) ---------- */
  const par = (sel, y, trigger) =>
    $$(sel).forEach((el) =>
      gsap.fromTo(
        el,
        { yPercent: -y / 2 },
        { yPercent: y / 2, ease: "none", scrollTrigger: { trigger: trigger ? el.closest(trigger) : el, start: "top bottom", end: "bottom top", scrub: true } },
      ),
    );
  par(".lunch__bg img, .rodizio__bg img", 16, "section");
  par(".story__img--float", -18);
  par(".hero__kanji", 22, "section");
  // no topo: texto sobe e some devagar enquanto o visual fica
  const hero = $(".hero");
  const heroText = $(".hero__content, .hero__txt");
  if (hero && heroText) {
    gsap.to(heroText, { yPercent: -12, opacity: 0.25, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
  }
  const art = $(".hero__art");
  if (art) gsap.to(art, { yPercent: 10, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });

  /* ---------- faixa: acelera e inclina com a velocidade da rolagem ---------- */
  const ticker = $(".ticker");
  if (ticker) {
    const skew = gsap.quickTo(ticker, "--mo-skew", { duration: 0.6, ease: "power3" });
    ScrollTrigger.create({ onUpdate: (s) => skew(gsap.utils.clamp(-8, 8, s.getVelocity() / -300)) });
  }

  /* ---------- categorias: rolagem horizontal presa à vertical (desktop) ---------- */
  const cats = $(".cats");
  if (cats) {
    ScrollTrigger.matchMedia({
      "(min-width: 1024px)": () => {
        cats.classList.add("is-pinned");
        const dist = () => Math.max(0, cats.scrollWidth - cats.clientWidth);
        const tw = gsap.to(cats, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: { trigger: cats, start: "center center", end: () => `+=${dist()}`, pin: cats.closest("section"), scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
        });
        return () => {
          tw.scrollTrigger?.kill();
          tw.kill();
          gsap.set(cats, { x: 0 });
          cats.classList.remove("is-pinned");
        };
      },
    });
  }

  /* ---------- botões magnéticos e cards com inclinação (só mouse) ---------- */
  if (fine) {
    $$(".btn").forEach((b) => {
      const xTo = gsap.quickTo(b, "x", { duration: 0.5, ease: "power3" });
      const yTo = gsap.quickTo(b, "y", { duration: 0.5, ease: "power3" });
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      b.addEventListener("pointerleave", () => {
        xTo(0);
        yTo(0);
      });
    });
    $$(".dish").forEach((c) => {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        gsap.to(c, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 6, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 6, transformPerspective: 900, duration: 0.6, ease: "power3" });
      });
      c.addEventListener("pointerleave", () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "power3" }));
    });

    /* cursor personalizado: ponto que vira “Ver” sobre fotos e links do cardápio */
    const cur = document.createElement("div");
    cur.className = "mo-cursor";
    cur.innerHTML = "<span>Ver</span>";
    document.body.append(cur);
    const cx = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3" });
    const cy = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3" });
    window.addEventListener("pointermove", (e) => {
      cx(e.clientX);
      cy(e.clientY);
    });
    document.addEventListener("pointerover", (e) => {
      const t = e.target;
      cur.classList.toggle("is-view", !!t.closest(".cat, .dish, .gallery__item, [data-link=menu] img"));
      cur.classList.toggle("is-link", !!t.closest("a, button, input, select, textarea, label") && !t.closest(".cat, .dish"));
    });
    document.documentElement.addEventListener("pointerleave", () => cur.classList.add("is-out"));
    document.documentElement.addEventListener("pointerenter", () => cur.classList.remove("is-out"));
  }

  // fontes e imagens mudam alturas: recalcula os gatilhos quando tudo carregar
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
