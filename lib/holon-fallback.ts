/**
 * Offline clinical fallback data.
 *
 * WHY THIS EXISTS: as of build time `https://holon-api.ontomorph.com` answers
 * every documented path (`GET /concepts?q=…`, `/interactions/check-list`, …)
 * with a bare `404 page not found`, with or without an Authorization header.
 * That is the exact URL, path and auth scheme the official docs and the SDK
 * both use, so it is an upstream outage rather than a client mistake.
 *
 * Rather than let the live demo hard-fail on a dead dependency, every HOLON
 * call in `lib/holon.ts` tries the real API first and only falls back to this
 * table if the call throws. Responses always report which path was taken via
 * a `source: "holon" | "fallback"` field, so nothing here can silently
 * masquerade as real clinical knowledge.
 *
 * Concept ids are genuine RxNorm ingredient codes (the same identifier space
 * the Ontomorph docs use in their own example: `interactions.check(1191, 11289)`
 * is aspirin vs. warfarin). The interaction rows are well-established
 * pharmacology, deliberately kept small and demo-focused.
 */

export type FallbackConcept = {
  conceptId: number;
  conceptName: string;
  conceptCode: string;
  vocabularyId: string;
  domainId: string;
  /** Lowercase strings that should resolve to this concept. */
  aliases: string[];
};

export const FALLBACK_DRUGS: FallbackConcept[] = [
  { conceptId: 11289, conceptName: "Warfarin", conceptCode: "11289", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["warfarin", "coumadin"] },
  { conceptId: 5640, conceptName: "Ibuprofen", conceptCode: "5640", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["ibuprofen", "brufen", "advil", "nurofen"] },
  { conceptId: 1191, conceptName: "Aspirin", conceptCode: "1191", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["aspirin", "acetylsalicylic acid", "asa"] },
  { conceptId: 161, conceptName: "Acetaminophen", conceptCode: "161", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["paracetamol", "acetaminophen", "panadol", "tylenol"] },
  { conceptId: 3355, conceptName: "Diclofenac", conceptCode: "3355", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["diclofenac", "voltaren", "cataflam"] },
  { conceptId: 7258, conceptName: "Naproxen", conceptCode: "7258", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["naproxen", "naprosyn"] },
  { conceptId: 6922, conceptName: "Metronidazole", conceptCode: "6922", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["metronidazole", "flagyl"] },
  { conceptId: 2551, conceptName: "Ciprofloxacin", conceptCode: "2551", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["ciprofloxacin", "cipro", "ciproxin"] },
  { conceptId: 723, conceptName: "Amoxicillin", conceptCode: "723", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["amoxicillin", "amoxil"] },
  { conceptId: 2193, conceptName: "Ceftriaxone", conceptCode: "2193", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["ceftriaxone", "rocephin"] },
  { conceptId: 4450, conceptName: "Fluconazole", conceptCode: "4450", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["fluconazole", "diflucan"] },
  { conceptId: 6809, conceptName: "Metformin", conceptCode: "6809", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["metformin", "glucophage"] },
  { conceptId: 17767, conceptName: "Amlodipine", conceptCode: "17767", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["amlodipine", "norvasc"] },
  { conceptId: 435, conceptName: "Albuterol", conceptCode: "435", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["salbutamol", "albuterol", "ventolin"] },
  { conceptId: 8638, conceptName: "Prednisolone", conceptCode: "8638", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["prednisolone", "prednisone"] },
  { conceptId: 2393, conceptName: "Chloroquine", conceptCode: "2393", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["chloroquine"] },
  { conceptId: 10180, conceptName: "Trimethoprim", conceptCode: "10180", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["trimethoprim", "septrin", "co-trimoxazole", "bactrim"] },
  { conceptId: 7646, conceptName: "Omeprazole", conceptCode: "7646", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["omeprazole", "prilosec"] },
  { conceptId: 74504, conceptName: "Artemether", conceptCode: "74504", vocabularyId: "RxNorm", domainId: "Drug", aliases: ["artemether", "artemether-lumefantrine", "coartem", "lonart"] },
];

export type FallbackInteraction = {
  drugA: number;
  drugB: number;
  severity: "major" | "moderate" | "minor";
  mechanism: string;
  clinicalEffect: string;
  management: string;
};

/** Pairs are stored once; lookup is order-insensitive. */
export const FALLBACK_INTERACTIONS: FallbackInteraction[] = [
  {
    drugA: 11289, drugB: 5640, severity: "major",
    mechanism: "NSAIDs inhibit platelet aggregation and irritate gastric mucosa; ibuprofen also displaces warfarin from plasma protein binding.",
    clinicalEffect: "Substantially increased risk of gastrointestinal and other serious bleeding.",
    management: "Avoid the combination. Use paracetamol for analgesia instead. If unavoidable, add gastroprotection and monitor INR and haemoglobin closely.",
  },
  {
    drugA: 11289, drugB: 1191, severity: "major",
    mechanism: "Additive inhibition of haemostasis — irreversible platelet COX-1 inhibition on top of anticoagulation.",
    clinicalEffect: "Markedly increased bleeding risk, especially gastrointestinal.",
    management: "Only combine on a specific cardiological indication. Otherwise stop the aspirin and monitor INR.",
  },
  {
    drugA: 11289, drugB: 3355, severity: "major",
    mechanism: "NSAID antiplatelet effect plus gastric mucosal injury alongside anticoagulation.",
    clinicalEffect: "Increased risk of serious gastrointestinal bleeding.",
    management: "Avoid. Substitute paracetamol.",
  },
  {
    drugA: 11289, drugB: 7258, severity: "major",
    mechanism: "NSAID antiplatelet effect plus gastric mucosal injury alongside anticoagulation.",
    clinicalEffect: "Increased risk of serious gastrointestinal bleeding.",
    management: "Avoid. Substitute paracetamol.",
  },
  {
    drugA: 11289, drugB: 6922, severity: "major",
    mechanism: "Metronidazole inhibits CYP2C9, reducing clearance of S-warfarin.",
    clinicalEffect: "Sharp rise in INR with bleeding risk within a few days of starting.",
    management: "If required, reduce the warfarin dose and check INR within 3-5 days.",
  },
  {
    drugA: 11289, drugB: 2551, severity: "moderate",
    mechanism: "Ciprofloxacin inhibits CYP1A2/CYP3A4 and disrupts gut flora that produce vitamin K.",
    clinicalEffect: "Potentiated anticoagulation and raised INR.",
    management: "Monitor INR during and shortly after the antibiotic course.",
  },
  {
    drugA: 11289, drugB: 4450, severity: "major",
    mechanism: "Fluconazole strongly inhibits CYP2C9-mediated warfarin metabolism.",
    clinicalEffect: "Large INR increase and bleeding risk.",
    management: "Avoid if possible; otherwise reduce warfarin dose and monitor INR closely.",
  },
  {
    drugA: 11289, drugB: 10180, severity: "major",
    mechanism: "Trimethoprim-sulfamethoxazole inhibits CYP2C9 and displaces warfarin from protein binding.",
    clinicalEffect: "Pronounced INR elevation with bleeding risk.",
    management: "Choose an alternative antibiotic where possible; otherwise monitor INR closely.",
  },
  {
    drugA: 8638, drugB: 5640, severity: "moderate",
    mechanism: "Additive gastric mucosal injury from corticosteroid plus NSAID.",
    clinicalEffect: "Increased risk of peptic ulceration and gastrointestinal bleeding.",
    management: "Co-prescribe a proton pump inhibitor and use the shortest effective course.",
  },
  {
    drugA: 2551, drugB: 7646, severity: "minor",
    mechanism: "Raised gastric pH modestly reduces absorption of some quinolone salts.",
    clinicalEffect: "Slightly reduced antibiotic exposure.",
    management: "Separate administration by at least two hours.",
  },
];

/**
 * Non-drug concepts used by /api/summary to turn intake codes into readable
 * clinical language. Vitals are LOINC; complaints/conditions are SNOMED CT.
 */
export const FALLBACK_CLINICAL_CONCEPTS: FallbackConcept[] = [
  { conceptId: 8310, conceptName: "Body temperature", conceptCode: "8310-5", vocabularyId: "LOINC", domainId: "Measurement", aliases: ["temp", "temperature", "body temperature"] },
  { conceptId: 85354, conceptName: "Blood pressure panel", conceptCode: "85354-9", vocabularyId: "LOINC", domainId: "Measurement", aliases: ["bp", "blood pressure"] },
  { conceptId: 8867, conceptName: "Heart rate", conceptCode: "8867-4", vocabularyId: "LOINC", domainId: "Measurement", aliases: ["hr", "heart rate", "pulse"] },
  { conceptId: 9279, conceptName: "Respiratory rate", conceptCode: "9279-1", vocabularyId: "LOINC", domainId: "Measurement", aliases: ["rr", "respiratory rate"] },
  { conceptId: 2708, conceptName: "Oxygen saturation", conceptCode: "2708-6", vocabularyId: "LOINC", domainId: "Measurement", aliases: ["spo2", "oxygen saturation", "sats"] },
  { conceptId: 386661006, conceptName: "Fever", conceptCode: "386661006", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["fever", "pyrexia", "high temperature"] },
  { conceptId: 25064002, conceptName: "Headache", conceptCode: "25064002", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["headache"] },
  { conceptId: 4834000, conceptName: "Typhoid fever", conceptCode: "4834000", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["typhoid", "typhoid fever", "enteric fever"] },
  { conceptId: 61462000, conceptName: "Malaria", conceptCode: "61462000", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["malaria"] },
  { conceptId: 25374005, conceptName: "Gastroenteritis", conceptCode: "25374005", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["gastroenteritis", "diarrhoea", "diarrhea"] },
  { conceptId: 54150009, conceptName: "Upper respiratory infection", conceptCode: "54150009", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["upper respiratory infection", "uri", "catarrh", "cough and cold"] },
  { conceptId: 195967001, conceptName: "Asthma", conceptCode: "195967001", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["asthma"] },
  { conceptId: 38341003, conceptName: "Hypertension", conceptCode: "38341003", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["hypertension", "high blood pressure"] },
  { conceptId: 422587007, conceptName: "Nausea", conceptCode: "422587007", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["nausea", "vomiting"] },
  { conceptId: 21522001, conceptName: "Abdominal pain", conceptCode: "21522001", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["abdominal pain", "stomach pain", "belly pain"] },
  { conceptId: 267036007, conceptName: "Shortness of breath", conceptCode: "267036007", vocabularyId: "SNOMED", domainId: "Condition", aliases: ["shortness of breath", "breathlessness", "dyspnoea"] },
];

const ALL_FALLBACK = [...FALLBACK_DRUGS, ...FALLBACK_CLINICAL_CONCEPTS];

/** Resolve free text to a fallback concept: exact alias, then substring match. */
export function findFallbackConcept(
  query: string,
  domain?: string,
): FallbackConcept | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const pool = domain ? ALL_FALLBACK.filter((c) => c.domainId === domain) : ALL_FALLBACK;
  const searched = pool.length ? pool : ALL_FALLBACK;

  const exact = searched.find((c) => c.aliases.includes(q));
  if (exact) return exact;

  // "Ibuprofen 400mg tds" should still resolve to ibuprofen.
  const partial = searched.find((c) => c.aliases.some((a) => q.includes(a)));
  if (partial) return partial;

  return searched.find((c) => c.aliases.some((a) => a.includes(q) && q.length >= 4)) ?? null;
}

export function findFallbackInteraction(a: number, b: number): FallbackInteraction | null {
  return (
    FALLBACK_INTERACTIONS.find(
      (i) => (i.drugA === a && i.drugB === b) || (i.drugA === b && i.drugB === a),
    ) ?? null
  );
}

export function fallbackDrugName(conceptId: number): string {
  return FALLBACK_DRUGS.find((d) => d.conceptId === conceptId)?.conceptName ?? `Concept ${conceptId}`;
}
