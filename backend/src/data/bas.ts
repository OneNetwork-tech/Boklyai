/**
 * Curated subset of the BAS 2024 chart of accounts (Kontoplan BAS), covering
 * what a typical small Swedish company (AB or enskild firma) needs. Companies
 * can add any other BAS account themselves.
 *
 * vatCode marks accounts that feed the VAT return (momsdeklaration):
 *   U25/U12/U6 = utgående moms, IN = ingående moms, F25/F12/F6/F0 = sales at that rate.
 */
export interface BasAccount {
  number: number;
  name: string;
  vatCode?: string;
}

export const BAS_ACCOUNTS: BasAccount[] = [
  // 1 Tillgångar
  { number: 1210, name: 'Maskiner och andra tekniska anläggningar' },
  { number: 1219, name: 'Ackumulerade avskrivningar på maskiner' },
  { number: 1220, name: 'Inventarier och verktyg' },
  { number: 1229, name: 'Ackumulerade avskrivningar på inventarier' },
  { number: 1250, name: 'Datorer' },
  { number: 1259, name: 'Ackumulerade avskrivningar på datorer' },
  { number: 1460, name: 'Lager av handelsvaror' },
  { number: 1510, name: 'Kundfordringar' },
  { number: 1513, name: 'Kundfordringar – delad faktura' },
  { number: 1610, name: 'Kortfristiga fordringar hos anställda' },
  { number: 1630, name: 'Avräkning för skatter och avgifter (skattekonto)' },
  { number: 1650, name: 'Momsfordran' },
  { number: 1680, name: 'Andra kortfristiga fordringar' },
  { number: 1710, name: 'Förutbetalda hyreskostnader' },
  { number: 1790, name: 'Övriga förutbetalda kostnader och upplupna intäkter' },
  { number: 1910, name: 'Kassa' },
  { number: 1920, name: 'PlusGiro' },
  { number: 1930, name: 'Företagskonto / checkkonto / affärskonto' },
  { number: 1940, name: 'Övriga bankkonton' },
  // 2 Eget kapital och skulder
  { number: 2010, name: 'Eget kapital (enskild firma)' },
  { number: 2013, name: 'Övriga egna uttag' },
  { number: 2018, name: 'Övriga egna insättningar' },
  { number: 2081, name: 'Aktiekapital' },
  { number: 2091, name: 'Balanserad vinst eller förlust' },
  { number: 2098, name: 'Vinst eller förlust från föregående år' },
  { number: 2099, name: 'Årets resultat' },
  { number: 2110, name: 'Periodiseringsfonder' },
  { number: 2150, name: 'Ackumulerade överavskrivningar' },
  { number: 2350, name: 'Andra långfristiga skulder till kreditinstitut' },
  { number: 2393, name: 'Lån från närstående personer' },
  { number: 2440, name: 'Leverantörsskulder' },
  { number: 2510, name: 'Skatteskulder' },
  { number: 2611, name: 'Utgående moms på försäljning inom Sverige, 25 %', vatCode: 'U25' },
  { number: 2621, name: 'Utgående moms på försäljning inom Sverige, 12 %', vatCode: 'U12' },
  { number: 2631, name: 'Utgående moms på försäljning inom Sverige, 6 %', vatCode: 'U6' },
  { number: 2641, name: 'Debiterad ingående moms', vatCode: 'IN' },
  { number: 2650, name: 'Redovisningskonto för moms' },
  { number: 2710, name: 'Personalskatt' },
  { number: 2731, name: 'Avräkning lagstadgade sociala avgifter' },
  { number: 2820, name: 'Kortfristiga skulder till anställda' },
  { number: 2890, name: 'Övriga kortfristiga skulder' },
  { number: 2893, name: 'Skulder till närstående personer, kortfristig del' },
  { number: 2910, name: 'Upplupna löner' },
  { number: 2920, name: 'Upplupna semesterlöner' },
  { number: 2941, name: 'Beräknade upplupna lagstadgade sociala avgifter' },
  { number: 2990, name: 'Övriga upplupna kostnader och förutbetalda intäkter' },
  // 3 Rörelsens inkomster/intäkter
  { number: 3001, name: 'Försäljning inom Sverige, 25 % moms', vatCode: 'F25' },
  { number: 3002, name: 'Försäljning inom Sverige, 12 % moms', vatCode: 'F12' },
  { number: 3003, name: 'Försäljning inom Sverige, 6 % moms', vatCode: 'F6' },
  { number: 3004, name: 'Försäljning inom Sverige, momsfri', vatCode: 'F0' },
  { number: 3740, name: 'Öres- och kronutjämning' },
  { number: 3960, name: 'Valutakursvinster på fordringar och skulder av rörelsekaraktär' },
  { number: 3990, name: 'Övriga ersättningar och intäkter' },
  // 4 Utgifter/kostnader för varor, material och vissa köpta tjänster
  { number: 4010, name: 'Inköp av material och varor' },
  { number: 4600, name: 'Legoarbeten och underentreprenader' },
  // 5–6 Övriga externa rörelseutgifter/kostnader
  { number: 5010, name: 'Lokalhyra' },
  { number: 5020, name: 'El för belysning' },
  { number: 5060, name: 'Städning och renhållning' },
  { number: 5410, name: 'Förbrukningsinventarier' },
  { number: 5420, name: 'Programvaror' },
  { number: 5460, name: 'Förbrukningsmaterial' },
  { number: 5611, name: 'Drivmedel för personbilar' },
  { number: 5615, name: 'Leasing av personbilar' },
  { number: 5800, name: 'Resekostnader' },
  { number: 5810, name: 'Biljetter' },
  { number: 5831, name: 'Kost och logi i Sverige' },
  { number: 5910, name: 'Annonsering' },
  { number: 5930, name: 'Reklamtrycksaker och direktreklam' },
  { number: 6071, name: 'Representation, avdragsgill' },
  { number: 6072, name: 'Representation, ej avdragsgill' },
  { number: 6110, name: 'Kontorsmateriel' },
  { number: 6211, name: 'Fast telefoni' },
  { number: 6212, name: 'Mobiltelefon' },
  { number: 6230, name: 'Datakommunikation' },
  { number: 6250, name: 'Postbefordran' },
  { number: 6310, name: 'Företagsförsäkringar' },
  { number: 6530, name: 'Redovisningstjänster' },
  { number: 6540, name: 'IT-tjänster' },
  { number: 6550, name: 'Konsultarvoden' },
  { number: 6570, name: 'Bankkostnader' },
  { number: 6970, name: 'Tidningar, tidskrifter och facklitteratur' },
  { number: 6981, name: 'Föreningsavgifter, avdragsgilla' },
  { number: 6991, name: 'Övriga externa kostnader, avdragsgilla' },
  { number: 6992, name: 'Övriga externa kostnader, ej avdragsgilla' },
  // 7 Personal
  { number: 7010, name: 'Löner till kollektivanställda' },
  { number: 7210, name: 'Löner till tjänstemän' },
  { number: 7220, name: 'Löner till företagsledare' },
  { number: 7290, name: 'Förändring av semesterlöneskuld' },
  { number: 7331, name: 'Skattefria bilersättningar' },
  { number: 7510, name: 'Arbetsgivaravgifter 31,42 %' },
  { number: 7519, name: 'Sociala avgifter för semester- och löneskulder' },
  { number: 7690, name: 'Övriga personalkostnader' },
  { number: 7832, name: 'Avskrivningar på inventarier och verktyg' },
  { number: 7834, name: 'Avskrivningar på bilar och andra transportmedel' },
  // 8 Finansiella och andra inkomster/intäkter och utgifter/kostnader
  { number: 8310, name: 'Ränteintäkter från omsättningstillgångar' },
  { number: 8410, name: 'Räntekostnader för långfristiga skulder' },
  { number: 8423, name: 'Räntekostnader för skatter och avgifter' },
  { number: 8811, name: 'Avsättning till periodiseringsfond' },
  { number: 8910, name: 'Skatt som belastar årets resultat' },
  { number: 8999, name: 'Årets resultat' },
];

export type AccountClass = 'asset' | 'equity' | 'liability' | 'revenue' | 'expense';

/** BAS account class from the account number. */
export function accountClass(number: number): AccountClass {
  if (number < 2000) return 'asset';
  if (number < 2200) return 'equity'; // 20 eget kapital, 21 obeskattade reserver
  if (number < 3000) return 'liability';
  if (number < 4000) return 'revenue';
  // 80–83: financial income (result from participations, interest income).
  if (number >= 8000 && number < 8400) return 'revenue';
  return 'expense';
}

/** Default revenue account and output VAT account per VAT rate. */
export const SALES_ACCOUNT: Record<number, number> = { 25: 3001, 12: 3002, 6: 3003, 0: 3004 };
export const OUTPUT_VAT_ACCOUNT: Record<number, number> = { 25: 2611, 12: 2621, 6: 2631 };
export const INPUT_VAT_ACCOUNT = 2641;
export const RECEIVABLES_ACCOUNT = 1510;
export const PAYABLES_ACCOUNT = 2440;
export const VAT_SETTLEMENT_ACCOUNT = 2650;
export const DEFAULT_BANK_ACCOUNT = 1930;
export const YEAR_RESULT_PL_ACCOUNT = 8999;
export const YEAR_RESULT_BS_ACCOUNT = 2099;
