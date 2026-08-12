/* ═══════════════════════════════════════════════════════════════════
   BANCO DE PRUEBAS DE RECONEXIÓN — index4

   Uso: abrir index4.html, pegar TODO este archivo en la consola, y:

       await banco.instalar();     // una sola vez, por carga de página
       await banco.correrTodo();   // los 11 bloques de escenarios
       console.log(banco.reporte());

   Documentación y hallazgos: ../CORTES-Y-RECONEXION.md

   OJO: instalar() deja la página inutilizable para escuchar de verdad
   (reloj falso, audio mockeado, polls apagados). Recargar para volver.

   ─── POR QUÉ HAY UN RELOJ VIRTUAL ─────────────────────────────────
   Chrome estrangula los timers de una pestaña en segundo plano a
   1/segundo, y a 1/minuto tras unos minutos. Sin reloj virtual, el
   banco mide el throttling de Chrome en vez de la lógica: aparecen
   intervalos de "5,00 s exactos" y silencios de 12 s que parecen bugs
   del producto y no lo son. Acá el tiempo lo movemos nosotros.

   ─── LAS OTRAS DOS TRAMPAS ────────────────────────────────────────
   · Reasignar window.traerMeta NO desengancha su setInterval, que
     capturó la referencia original. Hay que matar los intervalos.
   · Mockear play/pause/load no alcanza: asignar player.src dispara una
     carga REAL contra el Worker y sus eventos se mezclan con los
     simulados (aparece un "socket fantasma" que parece un bug).
   ═══════════════════════════════════════════════════════════════════ */
window.banco = (function () {
  const api = {};
  let R = null, B = null;

  api.instalar = async function () {
    // ── reloj virtual ──────────────────────────────────────────────
    const realCT = window.clearTimeout.bind(window);
    let vnow = 1785900000000, seq = 1;
    const timers = new Map();
    window.setTimeout    = (fn, ms) => { const id = seq++; timers.set(id, { fn, t: vnow + (ms || 0), int: 0 }); return id; };
    window.setInterval   = (fn, ms) => { const id = seq++; timers.set(id, { fn, t: vnow + (ms || 0), int: ms || 1 }); return id; };
    window.clearTimeout  = id => timers.delete(id);
    window.clearInterval = id => timers.delete(id);
    Date.now = () => vnow;
    const drenar = () => new Promise(r => { let n = 0; const p = () => (++n < 12 ? queueMicrotask(p) : r()); queueMicrotask(p); });
    R = {
      ahora: () => vnow,
      avanzar: async ms => {
        const meta = vnow + ms;
        for (let g = 0; g < 20000; g++) {
          let px = null;
          for (const [id, t] of timers) if (t.t <= meta && (!px || t.t < px.t)) px = { id, ...t };
          if (!px) break;
          vnow = px.t;
          if (px.int) timers.set(px.id, { fn: px.fn, t: vnow + px.int, int: px.int });
          else timers.delete(px.id);
          try { px.fn(); } catch (e) {}
          await drenar();
        }
        vnow = meta; await drenar();
      }
    };

    // ── matar la red real ──────────────────────────────────────────
    for (let i = 1; i < 5000; i++) realCT(i);
    window.traerMeta = async () => {};
    window.traerConfig = async () => {};
    // el latido SÍ se reinstala: es parte de lo que se está probando
    setInterval(() => {
      if (!quiereSonar || conectando || reconectando || enEspera) return;
      if (player.paused || player.readyState < 2) manejarHipo();
    }, 4000);

    // ── aislar el <audio> ──────────────────────────────────────────
    let _src = '';
    Object.defineProperty(player, 'src', { get: () => _src, set: v => { _src = v; }, configurable: true });
    player.removeAttribute = () => { _src = ''; };

    // ── doble del elemento ─────────────────────────────────────────
    B = { log: [], conexiones: 0, modo: 'ok', arranque: 3400, online: true, t0: R.ahora() };
    const T = () => (((R.ahora() - B.t0) / 1000).toFixed(1) + 's').padStart(7);
    const set = (p, r, n) => ['paused', 'readyState', 'networkState']
      .forEach((k, i) => Object.defineProperty(player, k, { value: [p, r, n][i], configurable: true }));
    set(true, 0, 0);
    Object.defineProperty(navigator, 'onLine', { get: () => B.online, configurable: true });
    player.load  = () => {};
    player.pause = () => { set(true, player.readyState, player.networkState); estaSonando = false; };
    player.play  = function () {
      B.conexiones++;
      B.log.push(T() + '  → SOCKET #' + B.conexiones + '  [' + B.modo + (B.online ? '' : ' · SIN RED') + ']');
      if (!B.online || B.modo === 'error') {
        set(true, 0, 3);
        setTimeout(() => player.dispatchEvent(new Event('error')), 50);
        return Promise.resolve();
      }
      if (B.modo === 'colgado') { set(true, 0, 2); return new Promise(() => {}); }
      set(false, 1, 2);
      setTimeout(() => {
        if (B.modo !== 'ok' || !B.online) return;
        set(false, 4, 2);
        B.log.push(T() + '  ♪ SONANDO');
        player.dispatchEvent(new Event('playing'));
      }, B.arranque);
      return Promise.resolve();
    };

    Object.assign(api, {
      set, T,
      av:  R.avanzar,
      add: s => B.log.push(s),
      tit: s => { B.log.push(''); B.log.push('══ ' + s); },
      ok:  (b, si, no) => B.log.push('        ' + (b ? '✓ ' + si : '✗ ' + no)),
      meta: (v, live) => {
        ultimoDato = { verified: v, isLive: live, lastLiveAt: live ? null : R.ahora() - 120000,
                       offReason: live ? null : 'SOURCE_DOWN', cfg_v: 1, artist: 'x', title: 'y' };
        decidirCorte(ultimoDato); repintar();
      },
      st: () => 'quiere=' + quiereSonar + ' espera=' + enEspera + ' recon=' + reconectando +
                ' intentos=' + intentos + ' sonando=' + estaSonando + ' badge="' + badge.textContent + '"',
      reset: async () => { detener(true); await R.avanzar(500); B.conexiones = 0; B.t0 = R.ahora(); },
      get B() { return B; }
    });
    return 'banco instalado';
  };

  api.reporte = () => B.log.join('\n');

  api.correrTodo = async function () {
    const { av, meta, st, add, tit, ok, reset, set } = api;
    B.log.length = 0;

    await reset();
    tit('1. Arranque normal (3,4s medido) — el watchdog no debe matarlo');
    B.modo = 'ok'; B.arranque = 3400;
    meta(true, true); arrancar(); await av(6000);
    ok(B.conexiones === 1 && estaSonando, 'una sola conexión y suena', 'conexiones=' + B.conexiones);

    await reset();
    tit('2. Micro-corte 2s, conexión VIVA — no debe reconectar');
    B.modo = 'ok'; B.arranque = 500;
    meta(true, true); arrancar(); await av(1000);
    const c2 = B.conexiones;
    set(false, 1, 2); player.dispatchEvent(new Event('waiting'));
    await av(2000);
    set(false, 4, 2); player.dispatchEvent(new Event('playing'));
    await av(2000);
    ok(B.conexiones === c2, 'aguantó el hipo', 'reconectó de más');

    await reset();
    tit('3. Hipo con la conexión MUERTA — debe reconectar');
    B.modo = 'ok'; B.arranque = 500;
    meta(true, true); arrancar(); await av(1000);
    const c3 = B.conexiones;
    set(false, 1, 1); player.dispatchEvent(new Event('waiting'));
    await av(8000);
    ok(B.conexiones > c3, 'reconectó', 'no reconectó');

    await reset();
    tit('4. Corte confirmado 60s + retoma sola al volver');
    B.modo = 'ok'; B.arranque = 900;
    meta(true, true); arrancar(); await av(1500);
    const c4 = B.conexiones;
    meta(true, false); await av(60000);
    ok(B.conexiones === c4, 'no martilló al encoder apagado', 'martilló');
    ok(quiereSonar && enEspera, 'oyente preservado en espera', 'perdió al oyente');
    ok(!btn.disabled, 'botón vivo para cancelar', 'botón trabado');
    meta(true, true); await av(3000);
    ok(estaSonando, 'RETOMÓ SOLA', 'quedó muerta');

    await reset();
    tit('5. VIAJERO: sin señal 3 minutos, después vuelve');
    B.modo = 'ok'; B.arranque = 900;
    meta(true, true); arrancar(); await av(1500);
    const c5 = B.conexiones;
    B.online = false;
    window.dispatchEvent(new Event('offline'));
    player.dispatchEvent(new Event('error'));
    await av(180000);
    ok(B.conexiones === c5, 'CERO sockets condenados en 3 min', 'abrió ' + (B.conexiones - c5));
    B.online = true; window.dispatchEvent(new Event('online'));
    await av(8000);
    ok(estaSonando, 'volvió a sonar tras recuperar señal', 'no volvió');

    await reset();
    tit('6. Corte de PROVEEDOR de 25s (el dispositivo SÍ tiene red)');
    B.modo = 'ok'; B.arranque = 900;
    meta(true, true); arrancar(); await av(1500);
    const c6 = B.conexiones;
    B.modo = 'error'; player.dispatchEvent(new Event('error'));
    await av(25000);
    add('        reintentos durante los 25s: ' + (B.conexiones - c6));
    B.modo = 'ok'; await av(20000);
    ok(estaSonando, 'reenganchó al volver el proveedor', 'no reenganchó');

    await reset();
    tit('7. Pausa manual durante la reconexión — no debe resucitar');
    B.modo = 'ok'; B.arranque = 900;
    meta(true, true); arrancar(); await av(1500);
    B.modo = 'error'; player.dispatchEvent(new Event('error'));
    await av(500);
    detener(true);
    const c7 = B.conexiones;
    await av(30000);
    ok(B.conexiones === c7, 'se quedó quieto 30s', 'RESUCITÓ SOLO');

    await reset();
    tit('8. Conexión colgada (nunca llega playing) — el watchdog rescata');
    B.modo = 'colgado';
    meta(true, true); arrancar(); await av(11000);
    const c8 = B.conexiones;
    await av(6000);
    ok(B.conexiones > c8, 'el watchdog rescató a los ' + CONEXION_MAX_MS / 1000 + 's', 'quedó trabado');

    await reset();
    tit('9. El servidor cierra limpio (evento "ended")');
    B.modo = 'ok'; B.arranque = 900;
    meta(true, true); arrancar(); await av(1500);
    const c9 = B.conexiones;
    player.dispatchEvent(new Event('ended'));
    await av(3500);
    ok(B.conexiones > c9, 'reaccionó al EOF sin esperar al latido', 'no reaccionó');

    await reset();
    tit('10. Suena, pero se cae la metadata / el SO dice "sin red"');
    B.modo = 'ok'; B.arranque = 900;
    meta(true, true); arrancar(); await av(1500);
    ultimoDato = null; repintar();
    ok(badge.textContent.indexOf('AIRE') >= 0, 'el badge respeta el audio que suena',
       'dice "' + badge.textContent + '" con el audio sonando');
    sinRed = true; repintar();
    ok(badge.textContent.indexOf('AIRE') >= 0, 'no contradice al audio',
       'dice "' + badge.textContent + '" con el audio sonando');
    sinRed = false;

    tit('11. Escalera de espera (intento 1..14 → segundos)');
    const g = intentos, esc = [];
    for (let i = 0; i < 14; i++) { intentos = i; esc.push(esperaReintento() / 1000); }
    intentos = g;
    add('        ' + esc.join(' · '));

    await reset();
    return api.reporte();
  };

  return api;
})();
