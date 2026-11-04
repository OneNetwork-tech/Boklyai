import {
  isValidOcr, luhnValid, normalizeOrgNumber, normalizePersonalNumber, ocrReference, vatNumberFromOrg,
} from '../src/utils/swedish';
import { lineNet, splitGross, vatOnNet } from '../src/utils/money';
import { addMonths, ageOn } from '../src/utils/dates';
import { parseBankCsv, parseSwedishAmount, parseBankDate } from '../src/services/bankImport';
import { tokenize } from '../src/services/categorizer';
import { extractFields, sniffMime } from '../src/services/documents';
import { calculatePayslip, employerFeeRate } from '../src/services/payroll';
import { encodeCp437 } from '../src/services/sie';
import { consolidate } from '../src/services/posting';
import { accountClass } from '../src/data/bas';
import { qrData } from '../src/services/bankid';
import { pool } from '../src/db';

afterAll(() => pool.end());

describe('Swedish identifiers', () => {
  test('organisationsnummer', () => {
    expect(normalizeOrgNumber('5566778899')).toBe('556677-8899');
    expect(normalizeOrgNumber('16556677-8899')).toBe('556677-8899');
    expect(normalizeOrgNumber('556677-8898')).toBeNull();
    expect(normalizeOrgNumber('abc')).toBeNull();
    expect(vatNumberFromOrg('556677-8899')).toBe('SE556677889901');
  });

  test('personnummer with century inference, + separator and samordningsnummer', () => {
    const today = new Date('2026-06-01');
    expect(normalizePersonalNumber('811218-9876', today)).toBe('19811218-9876');
    expect(normalizePersonalNumber('19811218-9876', today)).toBe('19811218-9876');
    expect(normalizePersonalNumber('121212-1212', today)).toBe('20121212-1212');
    expect(normalizePersonalNumber('121212+1212', today)).toBe('19121212-1212');
    expect(normalizePersonalNumber('811218-9877', today)).toBeNull(); // bad check digit
    expect(normalizePersonalNumber('811318-9876', today)).toBeNull(); // month 13
  });

  test('OCR reference has length and Luhn check digits', () => {
    const ocr = ocrReference(1001);
    expect(ocr).toMatch(/^1001\d\d$/);
    expect(ocr[4]).toBe('6'); // 6 digits total
    expect(isValidOcr(ocr)).toBe(true);
    expect(isValidOcr(`${ocr.slice(0, -1)}${(Number(ocr.slice(-1)) + 1) % 10}`)).toBe(false);
    expect(luhnValid('8112189876')).toBe(true);
  });
});

describe('money', () => {
  test('VAT rounding is half away from zero', () => {
    expect(vatOnNet(10002, 25)).toBe(2501); // 2500.5 → 2501
    expect(vatOnNet(-10002, 25)).toBe(-2501);
    expect(vatOnNet(9999, 12)).toBe(1200);
  });

  test('gross split', () => {
    expect(splitGross(12500, 25)).toEqual({ net: 10000, vat: 2500 });
    expect(splitGross(11200, 12)).toEqual({ net: 10000, vat: 1200 });
    expect(splitGross(5000, 0)).toEqual({ net: 5000, vat: 0 });
    const s = splitGross(9999, 25);
    expect(s.net + s.vat).toBe(9999);
  });

  test('line net handles fractional quantities exactly', () => {
    expect(lineNet(0.1, 30000)).toBe(3000);
    expect(lineNet(1.5, 99900)).toBe(149850);
    expect(lineNet(3, 33333)).toBe(99999);
  });
});

describe('dates', () => {
  test('addMonths clamps to month end', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-07-01', 12)).toBe('2027-07-01');
  });
  test('ageOn', () => {
    expect(ageOn(new Date(Date.UTC(1960, 0, 1)), '2026-01-01')).toBe(66);
    expect(ageOn(new Date(Date.UTC(1960, 0, 2)), '2026-01-01')).toBe(65);
  });
});

describe('bank CSV parsing', () => {
  test('Swedish semicolon format with extra header rows', () => {
    const csv = [
      'Kontoutdrag;Företagskonto 1234',
      '',
      'Bokföringsdag;Valutadag;Text;Belopp;Saldo',
      '2025-03-01;2025-03-01;Kortköp CIRCLE K;-1 234,50;10 000,00',
      '2025-03-02;2025-03-02;"Inbetalning; OCR 100164";3 060,00;13 060,00',
      '2025-03-02;2025-03-02;Kaffe;-45,00;13 015,00',
      '2025-03-02;2025-03-02;Kaffe;-45,00;12 970,00',
      'trasig rad;;;',
    ].join('\r\n');
    const r = parseBankCsv(csv);
    expect(r.transactions).toHaveLength(4);
    expect(r.transactions[0]).toMatchObject({ date: '2025-03-01', description: 'Kortköp CIRCLE K', amount: -123450, balance: 1000000 });
    expect(r.transactions[1].description).toBe('Inbetalning; OCR 100164');
    expect(r.transactions[2].hash).not.toBe(r.transactions[3].hash); // identical rows stay distinct
    expect(r.errors).toHaveLength(1);
    // Re-parsing yields identical hashes (idempotent import).
    expect(parseBankCsv(csv).transactions.map((t) => t.hash)).toEqual(r.transactions.map((t) => t.hash));
  });

  test('comma separated with dot decimals and compact dates', () => {
    const r = parseBankCsv('Date,Description,Amount\n20250105,Spotify,-119.00\n');
    expect(r.transactions[0]).toMatchObject({ date: '2025-01-05', amount: -11900 });
  });

  test('amount and date formats', () => {
    expect(parseSwedishAmount('1.234,56')).toBe(123456);
    expect(parseSwedishAmount('1,234.56')).toBe(123456);
    expect(parseSwedishAmount('−12')).toBe(-1200);
    expect(parseSwedishAmount('12,5')).toBe(1250);
    expect(parseSwedishAmount('abc')).toBeNull();
    expect(parseBankDate('05.01.2025')).toBe('2025-01-05');
    expect(parseBankDate('2025-02-30')).toBeNull();
  });
});

describe('categoriser tokens', () => {
  test('drops noise words and numbers', () => {
    expect(tokenize('Kortköp 4455 CIRCLE K Sundbyberg SEK')).toEqual(['circle', 'sundbyberg']);
  });
});

describe('document extraction', () => {
  test('reads totals, VAT, dates, org number and OCR from receipt text', () => {
    const text = `Kontorsbolaget AB\nOrg.nr 556677-8899\nFakturanummer: F-2041\nFakturadatum 2025-03-10\nFörfallodatum 2025-04-09\n`
      + `Pennor 800,00\nMoms 25 % 200,00\nAtt betala: 1 000,00 kr\nBankgiro 123-4567\nOCR: ${ocrReference(2041)}\n`;
    expect(extractFields(text)).toEqual({
      total: 100000, vat: 20000, vatRate: 25, date: '2025-03-10', dueDate: '2025-04-09',
      orgNumber: '556677-8899', ocr: ocrReference(2041), bankgiro: '123-4567', invoiceNumber: 'F-2041',
    });
  });

  test('sniffs file types from magic bytes', () => {
    expect(sniffMime(Buffer.from('%PDF-1.7 ...'))).toBe('application/pdf');
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffMime(Buffer.from('<html><script>'))).toBeNull();
  });
});

describe('payroll', () => {
  test('employer contribution rates by age', () => {
    expect(employerFeeRate('19850115-1230', 2026)).toBe(31.42);
    expect(employerFeeRate('19581224-1239', 2026)).toBe(10.21);
    expect(employerFeeRate('19350101-0000', 2026)).toBe(0);
  });

  test('tax is rounded down to whole kronor', () => {
    const p = calculatePayslip({ baseSalary: 3500050, taxRate: 30, employerFeeRate: 31.42 });
    expect(p.gross).toBe(3500050);
    expect(p.tax).toBe(1050000); // 10 500.15 kr → 10 500 kr
    expect(p.net).toBe(2450050);
    expect(p.employerFee).toBe(Math.round(3500050 * 0.3142));
  });

  test('deductions cannot make net negative', () => {
    expect(() => calculatePayslip({ baseSalary: 1000, deductions: 5000, taxRate: 0, employerFeeRate: 0 })).toThrow();
  });
});

describe('misc', () => {
  test('CP437 encoding of Swedish characters', () => {
    expect([...encodeCp437('åäöÅÄÖé')]).toEqual([0x86, 0x84, 0x94, 0x8f, 0x8e, 0x99, 0x82]);
  });

  test('consolidate nets lines per account', () => {
    expect(consolidate([
      { account: 1510, debit: 100 }, { account: 3001, credit: 60 }, { account: 3001, credit: 20 }, { account: 2611, credit: 20 },
    ])).toEqual([{ account: 1510, debit: 100, description: '' }, { account: 3001, credit: 80, description: '' }, { account: 2611, credit: 20, description: '' }]);
  });

  test('BAS classes', () => {
    expect(accountClass(1930)).toBe('asset');
    expect(accountClass(2099)).toBe('equity');
    expect(accountClass(2440)).toBe('liability');
    expect(accountClass(3001)).toBe('revenue');
    expect(accountClass(8310)).toBe('revenue');
    expect(accountClass(8410)).toBe('expense');
  });

  test('BankID animated QR uses HMAC of elapsed seconds', () => {
    const qr = qrData('tok', 'secret', 0, 3500);
    expect(qr).toMatch(/^bankid\.tok\.3\.[0-9a-f]{64}$/);
  });
});
