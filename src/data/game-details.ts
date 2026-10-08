import { allGames } from "./games";
import type { GameDetail, GameDetailExtra } from "@/types/game";

/** Mock game detail (replaced by real data later). */
const extras: Record<string, GameDetailExtra> = {
  "sweet-bonanza": {
    intro:
      "Sweet Bonanza este un slot de tip tumbling cu tematică de fructe și bomboane, foarte popular în România datorită multiplicatorilor mari și rundei de rotiri gratuite.",
    maxWin: "21.100x miza",
    releaseDate: "2019",
    reels: "6 role",
    paylines: "Scatter Pays (plată pe grup)",
    betRange: "0,20 – 100 RON",
    mechanics:
      "Câștigurile se formează când apar 8 sau mai multe simboluri identice oriunde pe ecran. Simbolurile câștigătoare dispar, iar altele cad în locul lor, permițând câștiguri în lanț.",
    bonusFeatures: ["Rotiri gratuite cu multiplicatori", "Simboluri multiplicator până la 100x", "Opțiune Ante Bet / Buy Feature"],
    availableCasinos: ["superbet-casino", "betano-casino", "winbet-casino"],
    faq: [
      { question: "Care este RTP-ul la Sweet Bonanza?", answer: "RTP-ul standard este 96,5%, deși unele cazinouri pot folosi versiuni cu RTP diferit." },
      { question: "Ce câștig maxim are Sweet Bonanza?", answer: "Câștigul maxim este de 21.100x miza." },
    ],
  },
  "gates-of-olympus": {
    intro:
      "Gates of Olympus, cunoscut și ca jocul cu Zeus, este un slot de mare volatilitate cu simboluri multiplicator și mecanică de tip tumble.",
    maxWin: "5.000x miza",
    releaseDate: "2021",
    reels: "6 role",
    paylines: "Scatter Pays",
    betRange: "0,20 – 100 RON",
    mechanics:
      "8 sau mai multe simboluri identice oferă câștig. Simbolurile multiplicator (până la 500x) se adună în runda de rotiri gratuite pentru câștiguri explozive.",
    bonusFeatures: ["Rotiri gratuite", "Multiplicatori cumulativi până la 500x", "Buy Feature"],
    availableCasinos: ["superbet-casino", "betano-casino", "las-vegas-casino"],
    faq: [
      { question: "Este Gates of Olympus un slot volatil?", answer: "Da, are volatilitate mare — câștigurile pot fi rare, dar potențial foarte mari." },
    ],
  },
  "big-bass-bonanza": {
    intro:
      "Big Bass Bonanza este un slot cu tematică de pescuit, apreciat pentru runda de rotiri gratuite cu simboluri money și pescar colector.",
    maxWin: "2.100x miza",
    releaseDate: "2020",
    reels: "5 role",
    paylines: "10 linii",
    betRange: "0,10 – 100 RON",
    mechanics:
      "În rotirile gratuite, simbolul pescar colectează valorile simbolurilor money, iar fiecare 4 pescari re-declanșează rundele cu multiplicatori mai mari.",
    bonusFeatures: ["Rotiri gratuite retriggerabile", "Multiplicatori x2, x3, x10", "Simboluri money"],
    availableCasinos: ["superbet-casino", "winbet-casino", "netbet-casino"],
  },
  "wolf-gold": {
    intro:
      "Wolf Gold este un slot clasic cu tematică de prerie și trei jackpoturi fixe (Mini, Major, Mega), ideal pentru jucătorii care caută premii mari.",
    maxWin: "2.500x miza",
    releaseDate: "2017",
    reels: "5 role",
    paylines: "25 linii",
    betRange: "0,25 – 125 RON",
    mechanics:
      "Simbolurile Money declanșează runda Money Respin, unde poți câștiga jackpoturile. Rotirile gratuite includ role gigantice cu simbolul lună.",
    bonusFeatures: ["3 jackpoturi fixe", "Money Respin", "Rotiri gratuite cu Giant Symbol"],
    availableCasinos: ["betano-casino", "unibet-casino"],
  },
  "power-of-merlin-megaways": {
    intro:
      "Power of Merlin Megaways combină mecanica Megaways cu tematica magiei, oferind până la 117.649 de moduri de câștig.",
    maxWin: "10.000x miza",
    releaseDate: "2022",
    reels: "6 role (Megaways)",
    paylines: "Până la 117.649 moduri",
    betRange: "0,20 – 100 RON",
    mechanics:
      "Numărul de simboluri pe fiecare rolă variază la fiecare rotire. Mecanica tumble și wild-urile multiplicator cresc potențialul în rotirile gratuite.",
    bonusFeatures: ["Megaways", "Tumble", "Wild multiplicator în rotiri gratuite"],
    availableCasinos: ["superbet-casino", "las-vegas-casino"],
  },
  "shining-crown": {
    intro:
      "Shining Crown este unul dintre cele mai populare sloturi EGT din România, cu simboluri de fructe clasice, stele și coroane.",
    maxWin: "1.000x miza",
    releaseDate: "2015",
    reels: "5 role",
    paylines: "10 linii",
    betRange: "0,10 – 100 RON",
    mechanics:
      "Coroana este wild și scatter, iar steaua și dolarul declanșează runde speciale. Include jackpotul progresiv Jackpot Cards.",
    bonusFeatures: ["Jackpot Cards progresiv", "Wild expandabil", "Gamble"],
    availableCasinos: ["winbet-casino", "maxbet-casino", "vlad-casino"],
    faq: [
      { question: "Are Shining Crown jackpot?", answer: "Da, include sistemul de jackpot progresiv Jackpot Cards, specific sloturilor EGT." },
    ],
  },
  "burning-hot": {
    intro:
      "Burning Hot este un slot EGT clasic cu fructe aprinse, stele și coroane, cunoscut pentru simplitate și jackpotul Jackpot Cards.",
    maxWin: "1.000x miza",
    releaseDate: "2014",
    reels: "5 role",
    paylines: "5 linii",
    betRange: "0,05 – 100 RON",
    mechanics:
      "Steaua wild poate expanda pe toată rola, iar coroana scatter oferă câștiguri indiferent de poziție. Jackpot Cards se poate declanșa aleatoriu.",
    bonusFeatures: ["Jackpot Cards progresiv", "Wild expandabil", "Gamble"],
    availableCasinos: ["winbet-casino", "maxbet-casino"],
  },
  "20-super-hot": {
    intro:
      "20 Super Hot este un slot EGT cu volatilitate redusă, potrivit pentru jucătorii care preferă câștiguri frecvente și joc relaxat.",
    maxWin: "500x miza",
    releaseDate: "2016",
    reels: "5 role",
    paylines: "20 linii",
    betRange: "0,20 – 200 RON",
    mechanics:
      "Simboluri de fructe clasice, stea wild și dolar scatter. Jackpotul progresiv Jackpot Cards se poate activa oricând.",
    bonusFeatures: ["Jackpot Cards progresiv", "Scatter care plătește", "Gamble"],
    availableCasinos: ["winbet-casino", "vlad-casino"],
  },
  "bison-moon-megaways": {
    intro:
      "Bison Moon Megaways aduce mecanica Megaways în universul EGT, cu tematică de prerie și potențial ridicat de câștig.",
    maxWin: "5.000x miza",
    releaseDate: "2023",
    reels: "6 role (Megaways)",
    paylines: "Până la 200.704 moduri",
    betRange: "0,20 – 100 RON",
    mechanics:
      "Mecanica Megaways cu role variabile și tumble. Rotirile gratuite includ un multiplicator progresiv care nu se resetează.",
    bonusFeatures: ["Megaways", "Multiplicator progresiv", "Tumble"],
    availableCasinos: ["winbet-casino", "maxbet-casino"],
  },
  "book-of-dead": {
    intro:
      "Book of Dead este un slot emblematic Play'n GO cu tematică egipteană, celebru pentru simbolul expandabil din rotirile gratuite.",
    maxWin: "5.000x miza",
    releaseDate: "2016",
    reels: "5 role",
    paylines: "10 linii",
    betRange: "0,01 – 100 RON",
    mechanics:
      "Cartea este wild și scatter. 3 cărți declanșează 10 rotiri gratuite, iar un simbol special selectat se expandează pentru câștiguri mari.",
    bonusFeatures: ["Rotiri gratuite", "Simbol special expandabil", "Gamble"],
    availableCasinos: ["unibet-casino", "netbet-casino", "las-vegas-casino"],
    faq: [
      { question: "De ce este Book of Dead așa popular?", answer: "Datorită simbolului special expandabil din rotirile gratuite, care poate acoperi role întregi pentru câștiguri mari." },
    ],
  },
  "reactoonz": {
    intro:
      "Reactoonz este un slot de tip cluster pays de la Play'n GO, cu creaturi extraterestre colorate și mecanică de cascadă.",
    maxWin: "4.570x miza",
    releaseDate: "2017",
    reels: "Grilă 7x7",
    paylines: "Cluster Pays",
    betRange: "0,20 – 100 RON",
    mechanics:
      "Câștigurile se formează din grupuri de 5 sau mai multe simboluri identice. Simbolurile dispar și apar altele, iar cuanticele speciale adaugă wild-uri și multiplicatori.",
    bonusFeatures: ["Cluster Pays", "Gargantoon wild", "Multiplicatori progresivi"],
    availableCasinos: ["unibet-casino", "netbet-casino"],
  },
  "rise-of-olympus": {
    intro:
      "Rise of Olympus este un slot Play'n GO cu tematică mitologică, mecanică grid și zei care transformă simbolurile pentru câștiguri în lanț.",
    maxWin: "5.000x miza",
    releaseDate: "2018",
    reels: "Grilă 5x5",
    paylines: "Cluster / Grid",
    betRange: "0,20 – 100 RON",
    mechanics:
      "Zeii Zeus, Poseidon și Hades oferă efecte speciale la fiecare cascadă. Golirea grilei activează runda bonus cu multiplicatori progresivi.",
    bonusFeatures: ["Puteri ale zeilor", "Multiplicatori progresivi", "Rundă bonus"],
    availableCasinos: ["unibet-casino", "las-vegas-casino"],
  },
};

export function getGameDetail(slug: string): GameDetail | null {
  const base = allGames.find((g) => g.slug === slug);
  const extra = extras[slug];
  if (!base || !extra) return null;
  return { ...base, ...extra };
}

export function getAllGameSlugs(): string[] {
  return allGames.filter((g) => extras[g.slug]).map((g) => g.slug);
}
