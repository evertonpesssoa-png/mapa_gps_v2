// ======================================
// LOCATION ENGINE
// ======================================

window.locationEngine = {

  currentPosition: null,
  watchId: null,
  started: false,
  subscribers: [],
  lastUpdate: 0,
  minUpdateInterval: 1000,

  start() {
    if (this.started) {
      console.log("LocationEngine já iniciado");
      return;
    }
    if (!navigator.geolocation) {
      console.warn("Geolocalização não suportada");
      return;
    }
    this.started = true;
    console.log("Iniciando LocationEngine...");

    navigator.geolocation.getCurrentPosition(
      pos => this.handlePosition(pos),
      err => this.handleError(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    this.watchId = navigator.geolocation.watchPosition(
      pos => this.handlePosition(pos),
      err => this.handleError(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  },

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.started = false;
    console.log("LocationEngine parado");
  },

  handlePosition(pos) {
    const now = Date.now();
    if (now - this.lastUpdate < this.minUpdateInterval) return;
    this.lastUpdate = now;

    const lat = Number(pos.coords.latitude);
    const lng = Number(pos.coords.longitude);
    const accuracy = Number(pos.coords.accuracy);
    const speed = Number(pos.coords.speed || 0);
    const heading = Number(pos.coords.heading || 0);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn("GPS inválido");
      return;
    }

    this.currentPosition = { lat, lng, accuracy, speed, heading, timestamp: now };
    window.lastGPS = this.currentPosition;
    console.log("📍 Nova posição:", lat, lng);
    this.notifySubscribers();
  },

  handleError(err) {
    console.error("GPS Error:", err);
    let message = "Erro GPS";
    switch (err.code) {
      case 1: message = "Permissão negada"; break;
      case 2: message = "Localização indisponível"; break;
      case 3: message = "Tempo esgotado"; break;
    }
    console.warn(message);
  },

  subscribe(callback) {
    if (typeof callback !== "function") return;
    this.subscribers.push(callback);
    if (this.currentPosition) callback(this.currentPosition);
  },

  unsubscribe(callback) {
    this.subscribers = this.subscribers.filter(cb => cb !== callback);
  },

  notifySubscribers() {
    this.subscribers.forEach(callback => {
      try { callback(this.currentPosition); } catch (err) { console.error("Erro subscriber:", err); }
    });
  },

  getPosition() {
    return this.currentPosition;
  },

  distance(a, b) {
    if (!a || !b) return 0;
    const lat1 = a.lat, lng1 = a.lng ?? a.lon;
    const lat2 = b.lat, lng2 = b.lng ?? b.lon;
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const aa = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  },

  movedEnough(oldPos, newPos, meters = 100) {
    if (!oldPos || !newPos) return false;
    return this.distance(oldPos, newPos) >= meters;
  },

  getSpeedKMH() {
    if (!this.currentPosition) return 0;
    return this.currentPosition.speed * 3.6;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.locationEngine.start();
});