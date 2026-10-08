import { allProviders } from "./providers";
import type { ProviderDetail, ProviderDetailExtra } from "@/types/provider";

/** Mock provider detail (replaced by real data later). */
const extras: Record<string, ProviderDetailExtra> = {
  "pragmatic-play": {
    intro:
      "Pragmatic Play este unul dintre cei mai prolifici furnizori de jocuri de cazino din lume, cunoscut pentru sloturi de mare succes precum Sweet Bonanza și Gates of Olympus, dar și pentru o secțiune live în creștere.",
    founded: "2015",
    country: "Malta",
    specialty: "Sloturi & Live Casino",
    rtpRange: "96% – 97%",
    faq: [
      { question: "Care sunt cele mai populare jocuri Pragmatic Play?", answer: "Sweet Bonanza, Gates of Olympus și Big Bass Bonanza sunt printre cele mai jucate titluri din România." },
      { question: "Sunt jocurile Pragmatic Play corecte?", answer: "Da, jocurile sunt testate de laboratoare independente și folosesc un generator de numere aleatorii certificat." },
    ],
  },
  "egt": {
    intro:
      "EGT (Amusnet) este un furnizor cu rădăcini în jocurile de tip land-based, extrem de popular în România datorită sloturilor clasice cu fructe și sistemului de jackpot progresiv Jackpot Cards.",
    founded: "2002",
    country: "Bulgaria",
    specialty: "Sloturi clasice",
    rtpRange: "95% – 96%",
    faq: [
      { question: "Ce este Jackpot Cards?", answer: "Este un jackpot progresiv cu patru niveluri, prezent în multe sloturi EGT, care se poate declanșa aleatoriu." },
    ],
  },
  "playn-go": {
    intro:
      "Play'n GO este un furnizor suedez premiat, recunoscut pentru sloturi cu tematici puternice și mecanici inovatoare, printre care celebrul Book of Dead.",
    founded: "2005",
    country: "Suedia",
    specialty: "Sloturi tematice",
    rtpRange: "96% – 96,5%",
    faq: [
      { question: "Care este cel mai cunoscut joc Play'n GO?", answer: "Book of Dead este jocul emblematic al studioului, foarte popular pentru simbolul special expandabil." },
    ],
  },
  "greentube": {
    intro:
      "Greentube, parte a grupului Novomatic, aduce în mediul online sloturile clasice îndrăgite din sălile de jocuri, cu o experiență familiară pentru jucătorii români.",
    founded: "1998",
    country: "Austria",
    specialty: "Sloturi clasice",
    rtpRange: "95% – 96%",
  },
  "hacksaw": {
    intro:
      "Hacksaw Gaming este un studio modern, apreciat de o nouă generație de jucători pentru sloturi rapide, volatile și mecanici de tip scratch card.",
    founded: "2018",
    country: "Malta",
    specialty: "Sloturi moderne",
    rtpRange: "96% – 96,5%",
  },
  "playson": {
    intro:
      "Playson este un furnizor cu un portofoliu solid de sloturi, echilibrat între titluri clasice și jocuri moderne cu funcții bonus atractive.",
    founded: "2012",
    country: "Malta",
    specialty: "Sloturi",
    rtpRange: "95% – 96,5%",
  },
};

export function getProviderDetail(slug: string): ProviderDetail | null {
  const base = allProviders.find((p) => p.slug === slug);
  const extra = extras[slug];
  if (!base || !extra) return null;
  return { ...base, ...extra };
}

export function getAllProviderSlugs(): string[] {
  return allProviders.filter((p) => extras[p.slug]).map((p) => p.slug);
}
