'use strict';

// Real capital-city (or, where noted, conventional seat-of-government)
// coordinates per SCB trading-partner code (ISO 3166-1 alpha-2, matching
// TAB3195/TAB3197's `Handelspartner` dimension). Looked up per-country from
// public reference data, never invented or approximated by formula -- same
// standard SWEDEN_TRADE_SCHEMA.md requires and the /live map's port
// coordinates already follow. Covers Sweden's actual top import partners
// plus a broad set of other plausible top-10/top-20 candidates so the build
// doesn't break if the ranking shifts month to month; extend if it ever
// throws on an unlisted partner.
module.exports = {
  DE: { lat: 52.52, lon: 13.405 }, // Berlin
  NL: { lat: 52.3676, lon: 4.9041 }, // Amsterdam
  NO: { lat: 59.9139, lon: 10.7522 }, // Oslo
  DK: { lat: 55.6761, lon: 12.5683 }, // Copenhagen
  CN: { lat: 39.9042, lon: 116.4074 }, // Beijing
  FI: { lat: 60.1699, lon: 24.9384 }, // Helsinki
  BE: { lat: 50.8503, lon: 4.3517 }, // Brussels
  PL: { lat: 52.2297, lon: 21.0122 }, // Warsaw
  GB: { lat: 51.5074, lon: -0.1278 }, // London
  US: { lat: 38.9072, lon: -77.0369 }, // Washington, D.C.
  FR: { lat: 48.8566, lon: 2.3522 }, // Paris
  IT: { lat: 41.9028, lon: 12.4964 }, // Rome
  ES: { lat: 40.4168, lon: -3.7038 }, // Madrid
  IE: { lat: 53.3498, lon: -6.2603 }, // Dublin
  CH: { lat: 46.948, lon: 7.4474 }, // Bern
  AT: { lat: 48.2082, lon: 16.3738 }, // Vienna
  CZ: { lat: 50.0755, lon: 14.4378 }, // Prague
  HU: { lat: 47.4979, lon: 19.0402 }, // Budapest
  PT: { lat: 38.7223, lon: -9.1393 }, // Lisbon
  RU: { lat: 55.7558, lon: 37.6173 }, // Moscow
  JP: { lat: 35.6762, lon: 139.6503 }, // Tokyo
  KR: { lat: 37.5665, lon: 126.978 }, // Seoul
  IN: { lat: 28.6139, lon: 77.209 }, // New Delhi
  TR: { lat: 39.9334, lon: 32.8597 }, // Ankara
  LT: { lat: 54.6872, lon: 25.2797 }, // Vilnius
  LV: { lat: 56.9496, lon: 24.1052 }, // Riga
  EE: { lat: 59.437, lon: 24.7536 }, // Tallinn
  RO: { lat: 44.4268, lon: 26.1025 }, // Bucharest
  GR: { lat: 37.9838, lon: 23.7275 }, // Athens
  UA: { lat: 50.4501, lon: 30.5234 }, // Kyiv
  SK: { lat: 48.1486, lon: 17.1077 }, // Bratislava
  SI: { lat: 46.0569, lon: 14.5058 }, // Ljubljana
  HR: { lat: 45.815, lon: 15.9819 }, // Zagreb
  CA: { lat: 45.4215, lon: -75.6972 }, // Ottawa
  BR: { lat: -15.7939, lon: -47.8828 }, // Brasilia
  MX: { lat: 19.4326, lon: -99.1332 }, // Mexico City
  AU: { lat: -35.2809, lon: 149.13 }, // Canberra
  SG: { lat: 1.3521, lon: 103.8198 }, // Singapore
  TH: { lat: 13.7563, lon: 100.5018 }, // Bangkok
  VN: { lat: 21.0278, lon: 105.8342 }, // Hanoi
  MY: { lat: 3.139, lon: 101.6869 }, // Kuala Lumpur
  ID: { lat: -6.2088, lon: 106.8456 }, // Jakarta
  ZA: { lat: -25.7479, lon: 28.2293 }, // Pretoria
  AE: { lat: 24.4539, lon: 54.3773 }, // Abu Dhabi
  SA: { lat: 24.7136, lon: 46.6753 }, // Riyadh
  IL: { lat: 31.7683, lon: 35.2137 }, // Jerusalem
  TW: { lat: 25.033, lon: 121.5654 }, // Taipei
  HK: { lat: 22.3193, lon: 114.1694 }, // Hong Kong
  IS: { lat: 64.1466, lon: -21.9426 }, // Reykjavik
  LU: { lat: 49.6116, lon: 6.1319 }, // Luxembourg City
  BG: { lat: 42.6977, lon: 23.3219 }, // Sofia
  RS: { lat: 44.7866, lon: 20.4489 }, // Belgrade
  NZ: { lat: -41.2865, lon: 174.7762 }, // Wellington
  EG: { lat: 30.0444, lon: 31.2357 }, // Cairo
  MA: { lat: 34.0209, lon: -6.8416 }, // Rabat
  NG: { lat: 9.0765, lon: 7.3986 }, // Abuja
  KE: { lat: -1.2921, lon: 36.8219 }, // Nairobi
  CL: { lat: -33.4489, lon: -70.6693 }, // Santiago
  AR: { lat: -34.6037, lon: -58.3816 }, // Buenos Aires
  CO: { lat: 4.711, lon: -74.0721 }, // Bogota
  PH: { lat: 14.5995, lon: 120.9842 }, // Manila
  PK: { lat: 33.6844, lon: 73.0479 }, // Islamabad
  BD: { lat: 23.8103, lon: 90.4125 }, // Dhaka
  MT: { lat: 35.8989, lon: 14.5146 }, // Valletta
  CY: { lat: 35.1856, lon: 33.3823 } // Nicosia
};
