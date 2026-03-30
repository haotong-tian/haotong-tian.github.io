/**
 * Flight data — add your flights here!
 *
 * Each flight: { date: "YYYY-MM-DD", from: "IATA", to: "IATA", airline: "XX" }
 *
 * Airport coordinates are looked up automatically from AIRPORTS below.
 * If you fly to a new airport, just add it to the AIRPORTS object.
 */

const AIRPORTS = {
    // ── North America ─────────────────────
    SFO: { lat: 37.6213, lng: -122.3790, city: "San Francisco" },
    LAX: { lat: 33.9425, lng: -118.4081, city: "Los Angeles" },
    BUR: { lat: 34.2007, lng: -118.3585, city: "Burbank" },
    SAN: { lat: 32.7338, lng: -117.1933, city: "San Diego" },
    ORD: { lat: 41.9742, lng: -87.9073, city: "Chicago" },
    DEN: { lat: 39.8561, lng: -104.6737, city: "Denver" },
    EWR: { lat: 40.6895, lng: -74.1745, city: "Newark" },
    JFK: { lat: 40.6413, lng: -73.7781, city: "New York JFK" },
    LGA: { lat: 40.7772, lng: -73.8726, city: "New York LaGuardia" },
    BNA: { lat: 36.1263, lng: -86.6774, city: "Nashville" },
    MCI: { lat: 39.2976, lng: -94.7139, city: "Kansas City" },
    IAH: { lat: 29.9902, lng: -95.3368, city: "Houston" },
    MIA: { lat: 25.7959, lng: -80.2870, city: "Miami" },
    PHL: { lat: 39.8721, lng: -75.2411, city: "Philadelphia" },
    BOS: { lat: 42.3656, lng: -71.0096, city: "Boston" },
    SEA: { lat: 47.4502, lng: -122.3088, city: "Seattle" },
    IAD: { lat: 38.9531, lng: -77.4565, city: "Washington Dulles" },
    DCA: { lat: 38.8512, lng: -77.0402, city: "Washington Reagan" },
    ATL: { lat: 33.6407, lng: -84.4277, city: "Atlanta" },
    DFW: { lat: 32.8998, lng: -97.0403, city: "Dallas" },
    LAS: { lat: 36.0840, lng: -115.1537, city: "Las Vegas" },
    MSP: { lat: 44.8848, lng: -93.2223, city: "Minneapolis" },
    DTW: { lat: 42.2124, lng: -83.3534, city: "Detroit" },
    YYZ: { lat: 43.6777, lng: -79.6248, city: "Toronto" },

    // ── Asia ──────────────────────────────
    PEK: { lat: 40.0799, lng: 116.6031, city: "Beijing Capital" },
    PKX: { lat: 39.5098, lng: 116.4105, city: "Beijing Daxing" },
    PVG: { lat: 31.1443, lng: 121.8083, city: "Shanghai Pudong" },
    SHA: { lat: 31.1979, lng: 121.3363, city: "Shanghai Hongqiao" },
    CAN: { lat: 23.3924, lng: 113.2988, city: "Guangzhou" },
    SZX: { lat: 22.6393, lng: 113.8107, city: "Shenzhen" },
    HKG: { lat: 22.3080, lng: 113.9185, city: "Hong Kong" },
    NRT: { lat: 35.7720, lng: 140.3929, city: "Tokyo Narita" },
    HND: { lat: 35.5494, lng: 139.7798, city: "Tokyo Haneda" },
    ICN: { lat: 37.4602, lng: 126.4407, city: "Seoul Incheon" },
    SIN: { lat: 1.3644, lng: 103.9915, city: "Singapore" },
    BKK: { lat: 13.6900, lng: 100.7501, city: "Bangkok" },
    KIX: { lat: 34.4320, lng: 135.2304, city: "Osaka Kansai" },
    TPE: { lat: 25.0797, lng: 121.2342, city: "Taipei" },
    CTU: { lat: 30.5728, lng: 103.9472, city: "Chengdu" },
    CKG: { lat: 29.7192, lng: 106.6417, city: "Chongqing" },
    WUH: { lat: 30.7838, lng: 114.2081, city: "Wuhan" },
    CSX: { lat: 28.1892, lng: 113.2200, city: "Changsha" },
    XIY: { lat: 34.4471, lng: 108.7516, city: "Xi'an" },
    KMG: { lat: 24.9924, lng: 102.7432, city: "Kunming" },
    HGH: { lat: 30.2295, lng: 120.4344, city: "Hangzhou" },
    NKG: { lat: 31.7420, lng: 118.8620, city: "Nanjing" },
    TAO: { lat: 36.2661, lng: 120.3744, city: "Qingdao" },
    DLC: { lat: 38.9657, lng: 121.5386, city: "Dalian" },
    TNA: { lat: 36.8572, lng: 117.2158, city: "Jinan" },
    HAK: { lat: 19.9349, lng: 110.4590, city: "Haikou" },
    SYX: { lat: 18.3029, lng: 109.4122, city: "Sanya" },
    URC: { lat: 43.9071, lng: 87.4742, city: "Urumqi" },
    LHW: { lat: 36.5152, lng: 103.6205, city: "Lanzhou" },

    // ── Europe ────────────────────────────
    LHR: { lat: 51.4700, lng: -0.4543, city: "London Heathrow" },
    CDG: { lat: 49.0097, lng: 2.5479, city: "Paris CDG" },
    FRA: { lat: 50.0379, lng: 8.5622, city: "Frankfurt" },
    AMS: { lat: 52.3105, lng: 4.7683, city: "Amsterdam" },
    FCO: { lat: 41.8003, lng: 12.2389, city: "Rome" },
    MAD: { lat: 40.4983, lng: -3.5676, city: "Madrid" },
    BCN: { lat: 41.2974, lng: 2.0833, city: "Barcelona" },
    ZRH: { lat: 47.4647, lng: 8.5492, city: "Zurich" },
    MUC: { lat: 48.3537, lng: 11.7750, city: "Munich" },
    IST: { lat: 41.2753, lng: 28.7519, city: "Istanbul" },

    // ── Oceania ───────────────────────────
    SYD: { lat: -33.9461, lng: 151.1772, city: "Sydney" },
    MEL: { lat: -37.6690, lng: 144.8410, city: "Melbourne" },

    // ── Middle East ───────────────────────
    DXB: { lat: 25.2532, lng: 55.3657, city: "Dubai" },
    DOH: { lat: 25.2731, lng: 51.6081, city: "Doha" },

    // ── Special regions ──────────────────
    MFM: { lat: 22.1496, lng: 113.5920, city: "Macau" },
};

const FLIGHTS = [
    // ── 2025 ─────────────────────────────────
    { date: "2025-08-01", from: "PEK", to: "HND", airline: "UA" },
    { date: "2025-08-06", from: "HND", to: "SFO", airline: "UA" },
    { date: "2025-08-18", from: "SFO", to: "LAX", airline: "UA" },
    { date: "2025-08-22", from: "LAX", to: "SFO", airline: "UA" },
    { date: "2025-09-07", from: "SFO", to: "ORD", airline: "UA" },
    { date: "2025-09-12", from: "ORD", to: "SFO", airline: "UA" },
    { date: "2025-09-22", from: "SFO", to: "DEN", airline: "UA" },
    { date: "2025-09-25", from: "DEN", to: "SFO", airline: "UA" },
    { date: "2025-09-28", from: "SFO", to: "BUR", airline: "UA" },
    { date: "2025-10-02", from: "BUR", to: "SFO", airline: "UA" },
    { date: "2025-10-06", from: "SFO", to: "SAN", airline: "UA" },
    { date: "2025-10-09", from: "SAN", to: "SFO", airline: "UA" },
    { date: "2025-11-09", from: "SFO", to: "JFK", airline: "AS" },
    { date: "2025-11-15", from: "LGA", to: "ORD", airline: "UA" },
    { date: "2025-11-15", from: "ORD", to: "SFO", airline: "UA" },
    { date: "2025-11-16", from: "SFO", to: "BNA", airline: "UA" },
    { date: "2025-11-16", from: "BNA", to: "EWR", airline: "UA" },
    { date: "2025-11-22", from: "EWR", to: "SFO", airline: "UA" },
    { date: "2025-12-01", from: "SFO", to: "MCI", airline: "UA" },
    { date: "2025-12-01", from: "MCI", to: "EWR", airline: "UA" },
    { date: "2025-12-11", from: "EWR", to: "LAX", airline: "UA" },
    { date: "2025-12-12", from: "LAX", to: "SFO", airline: "UA" },
    { date: "2025-12-15", from: "SFO", to: "DFW", airline: "AA" },
    { date: "2025-12-15", from: "DFW", to: "JFK", airline: "AA" },
    { date: "2025-12-21", from: "EWR", to: "SFO", airline: "UA" },

    // ── 2026 ─────────────────────────────────
    { date: "2026-01-04", from: "SFO", to: "DEN", airline: "UA" },
    { date: "2026-01-11", from: "DEN", to: "EWR", airline: "UA" },
    { date: "2026-01-18", from: "EWR", to: "SFO", airline: "UA" },
    { date: "2026-01-26", from: "SFO", to: "IAH", airline: "UA" },
    { date: "2026-01-26", from: "IAH", to: "EWR", airline: "UA" },
    { date: "2026-01-31", from: "EWR", to: "SFO", airline: "UA" },
    { date: "2026-02-13", from: "SFO", to: "PEK", airline: "UA" },
    { date: "2026-02-23", from: "PEK", to: "MFM", airline: "NX" },
    { date: "2026-02-23", from: "MFM", to: "TPE", airline: "BR" },
    { date: "2026-02-25", from: "TPE", to: "HKG", airline: "CX" },
    { date: "2026-02-25", from: "HKG", to: "PEK", airline: "CX" },
    { date: "2026-03-01", from: "PEK", to: "SFO", airline: "UA" },
    { date: "2026-03-07", from: "SFO", to: "ORD", airline: "UA" },
    { date: "2026-03-07", from: "ORD", to: "LGA", airline: "UA" },
    { date: "2026-03-15", from: "EWR", to: "MIA", airline: "UA" },
    { date: "2026-03-19", from: "MIA", to: "PHL", airline: "UA" },
    { date: "2026-03-22", from: "PHL", to: "MIA", airline: "UA" },
    { date: "2026-03-26", from: "MIA", to: "SFO", airline: "UA" },
    { date: "2026-03-30", from: "SFO", to: "MIA", airline: "UA" },
];
