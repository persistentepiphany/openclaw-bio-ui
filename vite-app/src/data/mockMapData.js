/**
 * mockMapData.js — Geolocated threat incidents for the Intelligence Map.
 *
 * Each incident represents a biosurveillance signal with geolocation,
 * source attribution, strain data, and an analyst assessment.
 *
 * In production, replace with a fetch from /api/map-incidents.
 */

export const mapIncidents = [
  {
    id: 1,
    lat: 12.5657,
    lng: 104.991,
    title: "H5N1 Human Case",
    location: "Prey Veng, Cambodia",
    source: "WHO",
    date: "2026-03-05",
    strain: "H5N1 clade 2.3.4.4b",
    assessment:
      "Confirmed human infection in poultry worker. Contact tracing initiated for 23 close contacts. No secondary transmission detected.",
    severity: "critical",
    confidence: 85,
    newsUrl: "#",
  },
  {
    id: 2,
    lat: 42.0308,
    lng: -93.6319,
    title: "H5N1 in Dairy Cattle",
    location: "Iowa, United States",
    source: "CDC / USDA",
    date: "2026-03-04",
    strain: "H5N1",
    assessment:
      "Outbreak confirmed in 12 dairy herds across 3 counties. Virus detected in raw milk samples. Enhanced surveillance ordered.",
    severity: "high",
    confidence: 92,
    newsUrl: "#",
  },
  {
    id: 3,
    lat: 30.0444,
    lng: 31.2357,
    title: "H5N1 Poultry Outbreak",
    location: "Cairo, Egypt",
    source: "FAO",
    date: "2026-03-03",
    strain: "H5N1 clade 2.3.2.1",
    assessment:
      "Large-scale poultry die-off in Giza governorate. 50,000+ birds culled. Genetic sequencing shows no mammalian adaptation markers.",
    severity: "high",
    confidence: 78,
    newsUrl: "#",
  },
  {
    id: 4,
    lat: 52.1326,
    lng: 5.2913,
    title: "Avian Influenza Detection",
    location: "Utrecht, Netherlands",
    source: "ECDC",
    date: "2026-03-02",
    strain: "H5N8",
    assessment:
      "Wild bird surveillance detected H5N8 in migratory waterfowl. Risk to poultry farms elevated. Containment zones established.",
    severity: "moderate",
    confidence: 88,
    newsUrl: "#",
  },
  {
    id: 5,
    lat: 9.0579,
    lng: 7.4951,
    title: "Lassa Fever Cluster",
    location: "Abuja, Nigeria",
    source: "NCDC",
    date: "2026-03-01",
    strain: "Lassa mammarenavirus",
    assessment:
      "Unusual cluster of 8 cases in urban setting. Genomic analysis suggests single spillover event. CFR tracking at 22%.",
    severity: "critical",
    confidence: 71,
    newsUrl: "#",
  },
  {
    id: 6,
    lat: -23.5505,
    lng: -46.6333,
    title: "Novel Coronavirus Surveillance",
    location: "São Paulo, Brazil",
    source: "PAHO",
    date: "2026-02-28",
    strain: "SCoV-3 candidate",
    assessment:
      "Atypical SARI cluster under investigation. Samples sent for deep sequencing. Preliminary PCR negative for known respiratory pathogens.",
    severity: "moderate",
    confidence: 45,
    newsUrl: "#",
  },
  {
    id: 7,
    lat: 31.2304,
    lng: 121.4737,
    title: "H7N9 Lab Detection",
    location: "Shanghai, China",
    source: "Chinese CDC",
    date: "2026-02-27",
    strain: "H7N9",
    assessment:
      "Environmental surveillance detected H7N9 in live poultry market. Market closed for decontamination. No human cases reported.",
    severity: "moderate",
    confidence: 82,
    newsUrl: "#",
  },
  {
    id: 8,
    lat: 51.5074,
    lng: -0.1278,
    title: "Unusual Respiratory Cluster",
    location: "London, United Kingdom",
    source: "UKHSA",
    date: "2026-02-25",
    strain: "Under investigation",
    assessment:
      "12 healthcare workers with atypical pneumonia at single hospital. Isolation protocols enacted. Awaiting pathogen identification.",
    severity: "high",
    confidence: 58,
    newsUrl: "#",
  },
];
