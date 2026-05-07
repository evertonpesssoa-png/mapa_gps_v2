// ======================================
// LOCATION ENGINE
// ======================================

window.locationEngine = {

  // ======================================
  // ESTADO
  // ======================================

  currentPosition: null,

  watchId: null,

  started: false,

  subscribers: [],

  lastUpdate: 0,

  minUpdateInterval: 1000,

  // ======================================
  // START GPS
  // ======================================

  start() {

    if (this.started) {

      console.log(
        "LocationEngine já iniciado"
      );

      return;
    }

    if (
      !navigator.geolocation
    ) {

      console.warn(
        "Geolocalização não suportada"
      );

      return;
    }

    this.started = true;

    console.log(
      "Iniciando LocationEngine..."
    );

    // ======================================
    // PRIMEIRA POSIÇÃO
    // ======================================

    navigator.geolocation.getCurrentPosition(

      pos => {

        this.handlePosition(pos);

      },

      err => {

        this.handleError(err);

      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    // ======================================
    // WATCH POSITION
    // ======================================

    this.watchId =

      navigator.geolocation.watchPosition(

        pos => {

          this.handlePosition(pos);

        },

        err => {

          this.handleError(err);

        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000
        }
      );
  },

  // ======================================
  // STOP GPS
  // ======================================

  stop() {

    if (
      this.watchId !== null
    ) {

      navigator.geolocation.clearWatch(
        this.watchId
      );

      this.watchId = null;
    }

    this.started = false;

    console.log(
      "LocationEngine parado"
    );
  },

  // ======================================
  // HANDLE POSITION
  // ======================================

  handlePosition(pos) {

    const now = Date.now();

    // ======================================
    // LIMITADOR UPDATE
    // ======================================

    if (
      now - this.lastUpdate <
      this.minUpdateInterval
    ) {

      return;
    }

    this.lastUpdate = now;

    const lat =
      Number(
        pos.coords.latitude
      );

    const lng =
      Number(
        pos.coords.longitude
      );

    const accuracy =
      Number(
        pos.coords.accuracy
      );

    const speed =
      Number(
        pos.coords.speed || 0
      );

    const heading =
      Number(
        pos.coords.heading || 0
      );

    // ======================================
    // VALIDAÇÃO
    // ======================================

    if (
      isNaN(lat) ||
      isNaN(lng)
    ) {

      console.warn(
        "GPS inválido"
      );

      return;
    }

    // ======================================
    // SALVA POSIÇÃO
    // ======================================

    this.currentPosition = {

      lat,
      lng,
      accuracy,
      speed,
      heading,
      timestamp: now
    };

    // compatibilidade global
    window.lastGPS =
      this.currentPosition;

    console.log(
      "Nova posição:",
      this.currentPosition
    );

    // ======================================
    // NOTIFICA
    // ======================================

    this.notifySubscribers();
  },

  // ======================================
  // HANDLE ERROR
  // ======================================

  handleError(err) {

    console.error(
      "GPS Error:",
      err
    );

    let message =
      "Erro GPS";

    switch (err.code) {

      case 1:

        message =
          "Permissão negada";

        break;

      case 2:

        message =
          "Localização indisponível";

        break;

      case 3:

        message =
          "Tempo esgotado";

        break;
    }

    console.warn(message);
  },

  // ======================================
  // SUBSCRIBE
  // ======================================

  subscribe(callback) {

    if (
      typeof callback !==
      "function"
    ) {

      return;
    }

    this.subscribers.push(
      callback
    );

    // envia posição atual imediatamente
    if (
      this.currentPosition
    ) {

      callback(
        this.currentPosition
      );
    }
  },

  // ======================================
  // UNSUBSCRIBE
  // ======================================

  unsubscribe(callback) {

    this.subscribers =

      this.subscribers.filter(
        cb => cb !== callback
      );
  },

  // ======================================
  // NOTIFY
  // ======================================

  notifySubscribers() {

    this.subscribers.forEach(
      callback => {

        try {

          callback(
            this.currentPosition
          );

        } catch (err) {

          console.error(
            "Erro subscriber:",
            err
          );
        }
      }
    );
  },

  // ======================================
  // GET POSITION
  // ======================================

  getPosition() {

    return this.currentPosition;
  },

  // ======================================
  // DISTÂNCIA
  // ======================================

  distance(
    a,
    b
  ) {

    if (!a || !b) return 0;

    const R = 6371000;

    const dLat =
      (b.lat - a.lat) *
      Math.PI / 180;

    const dLng =
      (b.lng - a.lng) *
      Math.PI / 180;

    const aa =

      Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +

      Math.cos(a.lat * Math.PI / 180) *
      Math.cos(b.lat * Math.PI / 180) *

      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c =

      2 *
      Math.atan2(
        Math.sqrt(aa),
        Math.sqrt(1 - aa)
      );

    return R * c;
  },

  // ======================================
  // MOVEU O SUFICIENTE?
  // ======================================

  movedEnough(
    oldPos,
    newPos,
    meters = 500
  ) {

    const dist =
      this.distance(
        oldPos,
        newPos
      );

    return dist >= meters;
  },

  // ======================================
  // VELOCIDADE KM/H
  // ======================================

  getSpeedKMH() {

    if (
      !this.currentPosition
    ) {

      return 0;
    }

    return (
      this.currentPosition.speed *
      3.6
    );
  }

};

// ======================================
// AUTO START
// ======================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    window.locationEngine.start();

  }
);