// Monochromatic, terracotta-tinted Google Maps style to match the site theme.
// Everything is rendered in warm earth tones — land in terracotta, water in deep
// espresso (so land/water contrast stays readable for the geo-guessing game),
// labels in cream. Applied via the classic JSON `styles` option, which only works
// when the map has NO cloud `mapId` set (ours doesn't — see MapPicker).
export const EARTHY_MAP_STYLE: google.maps.MapTypeStyle[] = [
  // Base
  { elementType: "geometry", stylers: [{ color: "#9a472e" }] }, // land — terracotta field
  { elementType: "labels.text.fill", stylers: [{ color: "#f4e7d2" }] }, // labels — cream
  { elementType: "labels.text.stroke", stylers: [{ color: "#5c2a1a" }] }, // label halo — espresso

  // De-clutter for a calmer, on-theme map
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },

  // Borders
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c86e4f" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#d98a5f" }] },

  // Land features
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#9a472e" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#86532f" }] }, // muted olive-brown

  // Roads — lighter clay so they read above the land
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#b3633f" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#7a3422" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#c86e4f" }] },

  // Water — darkest tone so coastlines stay legible
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#5c2a1a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#caa07f" }] },
];
