// ==============================
// ICONS GLOBAIS
// ==============================

window.getIcon = function (category) {

  const icons = {
    hospital: "assets/icons/hospital.png",
    pharmacy: "assets/icons/pharmacy.png",
    police: "assets/icons/police-station.png",
    policeman: "assets/icons/policeman.png",
    supermarket: "assets/icons/supermarket.png",
    gas: "assets/icons/gas-pump.png",
    mechanic: "assets/icons/mechanic.png",
    home: "assets/icons/house.png",
    medical: "assets/icons/medical-records.png",

    // padrão
    generic: "assets/icons/marker.png",

    // fallback final
    warning: "assets/icons/warning.png"
  };

  const iconUrl =
    icons[category] ||
    icons.generic ||
    icons.warning;

  return L.icon({
    iconUrl: iconUrl,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};
