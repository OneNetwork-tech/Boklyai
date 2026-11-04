-- BoklyAI initial schema.
-- Amounts are BIGINT öre (1 SEK = 100 öre). Debit/credit are both stored as
-- non-negative numbers; exactly one is positive per voucher line.

-- ---------------------------------------------------------------------------
-- Identity & tenancy
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id               BIGSERIAL PRIMARY KEY,
  email            TEXT NOT NULL,
  password_hash    TEXT NOT NULL,
  first_name       TEXT NOT NULL DEFAULT '',
  last_name        TEXT NOT NULL DEFAULT '',
  personal_number  TEXT,
  failed_logins    INTEGER NOT NULL DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));
CREATE UNIQUE INDEX users_pnr_uq ON users (personal_number) WHERE personal_number IS NOT NULL;

CREATE TABLE sessions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  csrf_token    TEXT NOT NULL,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE password_resets (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE companies (
  id                    BIGSERIAL PRIMARY KEY,
  name                  TEXT NOT NULL,
  org_number            TEXT NOT NULL UNIQUE,
  vat_number            TEXT,
  address               TEXT NOT NULL DEFAULT '',
  postal_code           TEXT NOT NULL DEFAULT '',
  city                  TEXT NOT NULL DEFAULT '',
  country               TEXT NOT NULL DEFAULT 'SE',
  email                 TEXT NOT NULL DEFAULT '',
  phone                 TEXT NOT NULL DEFAULT '',
  bankgiro              TEXT NOT NULL DEFAULT '',
  plusgiro              TEXT NOT NULL DEFAULT '',
  iban                  TEXT NOT NULL DEFAULT '',
  bic                   TEXT NOT NULL DEFAULT '',
  vat_period            TEXT NOT NULL DEFAULT 'quarterly' CHECK (vat_period IN ('monthly', 'quarterly', 'yearly')),
  payment_terms_days    INTEGER NOT NULL DEFAULT 30 CHECK (payment_terms_days BETWEEN 0 AND 365),
  locked_until          DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  company_id  BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'accountant', 'member', 'viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships (user_id);

CREATE TABLE invitations (
  id           BIGSERIAL PRIMARY KEY,
  company_id   BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('owner', 'accountant', 'member', 'viewer')),
  invited_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invitations_pending_uq ON invitations (company_id, lower(email)) WHERE accepted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------
CREATE TABLE fiscal_years (
  id          BIGSERIAL PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  closed      BOOLEAN NOT NULL DEFAULT false,
  closed_at   TIMESTAMPTZ,
  CHECK (end_date > start_date),
  UNIQUE (company_id, start_date)
);

CREATE TABLE accounts (
  id          BIGSERIAL PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  number      INTEGER NOT NULL CHECK (number BETWEEN 1000 AND 9999),
  name        TEXT NOT NULL,
  vat_code    TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (company_id, number)
);

CREATE TABLE number_sequences (
  company_id  BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  next_value  INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (company_id, key)
);

CREATE TABLE vouchers (
  id              BIGSERIAL PRIMARY KEY,
  company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  fiscal_year_id  BIGINT NOT NULL REFERENCES fiscal_years(id) ON DELETE RESTRICT,
  series          TEXT NOT NULL CHECK (series ~ '^[A-Z]$'),
  number          INTEGER NOT NULL CHECK (number > 0),
  date            DATE NOT NULL,
  description     TEXT NOT NULL,
  source_type     TEXT NOT NULL DEFAULT 'manual',
  source_id       BIGINT,
  reverses_id     BIGINT UNIQUE REFERENCES vouchers(id),
  reversed_by_id  BIGINT UNIQUE REFERENCES vouchers(id),
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, fiscal_year_id, series, number)
);
CREATE INDEX vouchers_company_date_idx ON vouchers (company_id, date);

CREATE TABLE voucher_lines (
  id          BIGSERIAL PRIMARY KEY,
  voucher_id  BIGINT NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
  company_id  BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  line_no     INTEGER NOT NULL,
  account_id  BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit       BIGINT NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit      BIGINT NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description TEXT NOT NULL DEFAULT '',
  CHECK ((debit = 0) <> (credit = 0)),
  UNIQUE (voucher_id, line_no)
);
CREATE INDEX voucher_lines_account_idx ON voucher_lines (company_id, account_id);

-- Vouchers are immutable (Bokföringslagen 5 kap.): corrections are made with a
-- reversing voucher. Only the reversed_by_id back-reference may be set, once.
CREATE FUNCTION vouchers_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'vouchers cannot be deleted' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.reversed_by_id IS NULL AND NEW.reversed_by_id IS NOT NULL
     AND (NEW.company_id, NEW.fiscal_year_id, NEW.series, NEW.number, NEW.date, NEW.description,
          NEW.source_type, NEW.source_id, NEW.reverses_id, NEW.created_by, NEW.created_at)
       IS NOT DISTINCT FROM
         (OLD.company_id, OLD.fiscal_year_id, OLD.series, OLD.number, OLD.date, OLD.description,
          OLD.source_type, OLD.source_id, OLD.reverses_id, OLD.created_by, OLD.created_at) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'vouchers are immutable; create a reversing voucher instead' USING ERRCODE = 'check_violation';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER vouchers_immutable BEFORE UPDATE OR DELETE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION vouchers_immutable();

CREATE FUNCTION voucher_lines_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'voucher lines are immutable' USING ERRCODE = 'check_violation';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER voucher_lines_immutable BEFORE UPDATE OR DELETE ON voucher_lines
  FOR EACH ROW EXECUTE FUNCTION voucher_lines_immutable();

-- Every voucher must balance and have at least two lines, checked at commit.
CREATE FUNCTION voucher_balanced() RETURNS trigger AS $$
DECLARE d BIGINT; c BIGINT; n INTEGER;
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0), COUNT(*) INTO d, c, n
    FROM voucher_lines WHERE voucher_id = NEW.voucher_id;
  IF d <> c THEN
    RAISE EXCEPTION 'voucher % does not balance (debit %, credit %)', NEW.voucher_id, d, c USING ERRCODE = 'check_violation';
  END IF;
  IF n < 2 THEN
    RAISE EXCEPTION 'voucher % needs at least two lines', NEW.voucher_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER voucher_balanced AFTER INSERT ON voucher_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION voucher_balanced();

-- ---------------------------------------------------------------------------
-- Documents (receipts, supplier invoices)
-- ---------------------------------------------------------------------------
CREATE TABLE documents (
  id             BIGSERIAL PRIMARY KEY,
  company_id     BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  original_name  TEXT NOT NULL,
  mime_type      TEXT NOT NULL,
  size_bytes     BIGINT NOT NULL,
  storage_key    TEXT NOT NULL UNIQUE,
  sha256         TEXT NOT NULL,
  ocr_status     TEXT NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'done', 'failed', 'unavailable')),
  ocr_text       TEXT,
  extracted      JSONB,
  voucher_id     BIGINT REFERENCES vouchers(id),
  uploaded_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX documents_company_idx ON documents (company_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
  id                  BIGSERIAL PRIMARY KEY,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_number     INTEGER NOT NULL,
  name                TEXT NOT NULL,
  org_number          TEXT NOT NULL DEFAULT '',
  vat_number          TEXT NOT NULL DEFAULT '',
  email               TEXT NOT NULL DEFAULT '',
  phone               TEXT NOT NULL DEFAULT '',
  address             TEXT NOT NULL DEFAULT '',
  postal_code         TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL DEFAULT '',
  country             TEXT NOT NULL DEFAULT 'SE',
  payment_terms_days  INTEGER CHECK (payment_terms_days BETWEEN 0 AND 365),
  archived            BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, customer_number)
);

CREATE TABLE invoices (
  id                 BIGSERIAL PRIMARY KEY,
  company_id         BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  customer_id        BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  kind               TEXT NOT NULL DEFAULT 'invoice' CHECK (kind IN ('invoice', 'credit_note')),
  credits_invoice_id BIGINT REFERENCES invoices(id),
  invoice_number     INTEGER,
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'credited')),
  issue_date         DATE NOT NULL,
  due_date           DATE NOT NULL,
  ocr_reference      TEXT,
  our_reference      TEXT NOT NULL DEFAULT '',
  your_reference     TEXT NOT NULL DEFAULT '',
  notes              TEXT NOT NULL DEFAULT '',
  net_amount         BIGINT NOT NULL DEFAULT 0,
  vat_amount         BIGINT NOT NULL DEFAULT 0,
  total_amount       BIGINT NOT NULL DEFAULT 0,
  paid_amount        BIGINT NOT NULL DEFAULT 0,
  voucher_id         BIGINT REFERENCES vouchers(id),
  created_by         BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_at          TIMESTAMPTZ,
  UNIQUE (company_id, invoice_number),
  CHECK (due_date >= issue_date)
);
CREATE INDEX invoices_company_status_idx ON invoices (company_id, status);

CREATE TABLE invoice_lines (
  id              BIGSERIAL PRIMARY KEY,
  invoice_id      BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_no         INTEGER NOT NULL,
  description     TEXT NOT NULL,
  quantity        NUMERIC(12, 3) NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'st',
  unit_price      BIGINT NOT NULL,
  vat_rate        SMALLINT NOT NULL CHECK (vat_rate IN (0, 6, 12, 25)),
  account_number  INTEGER NOT NULL,
  net_amount      BIGINT NOT NULL,
  vat_amount      BIGINT NOT NULL
);

CREATE TABLE invoice_payments (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  invoice_id           BIGINT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  date                 DATE NOT NULL,
  amount               BIGINT NOT NULL CHECK (amount > 0),
  account_number       INTEGER NOT NULL,
  voucher_id           BIGINT NOT NULL REFERENCES vouchers(id),
  bank_transaction_id  BIGINT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Purchases
-- ---------------------------------------------------------------------------
CREATE TABLE suppliers (
  id                      BIGSERIAL PRIMARY KEY,
  company_id              BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  org_number              TEXT NOT NULL DEFAULT '',
  vat_number              TEXT NOT NULL DEFAULT '',
  email                   TEXT NOT NULL DEFAULT '',
  bankgiro                TEXT NOT NULL DEFAULT '',
  plusgiro                TEXT NOT NULL DEFAULT '',
  iban                    TEXT NOT NULL DEFAULT '',
  default_account_number  INTEGER,
  archived                BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bills (
  id                       BIGSERIAL PRIMARY KEY,
  company_id               BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  supplier_id              BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_invoice_number  TEXT NOT NULL DEFAULT '',
  status                   TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'booked', 'paid')),
  invoice_date             DATE NOT NULL,
  due_date                 DATE NOT NULL,
  payment_reference        TEXT NOT NULL DEFAULT '',
  notes                    TEXT NOT NULL DEFAULT '',
  net_amount               BIGINT NOT NULL DEFAULT 0,
  vat_amount               BIGINT NOT NULL DEFAULT 0,
  total_amount             BIGINT NOT NULL DEFAULT 0,
  paid_amount              BIGINT NOT NULL DEFAULT 0,
  document_id              BIGINT REFERENCES documents(id) ON DELETE SET NULL,
  voucher_id               BIGINT REFERENCES vouchers(id),
  created_by               BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (due_date >= invoice_date)
);
CREATE INDEX bills_company_status_idx ON bills (company_id, status);

CREATE TABLE bill_lines (
  id              BIGSERIAL PRIMARY KEY,
  bill_id         BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  line_no         INTEGER NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  account_number  INTEGER NOT NULL,
  net_amount      BIGINT NOT NULL,
  vat_rate        SMALLINT NOT NULL CHECK (vat_rate IN (0, 6, 12, 25)),
  vat_amount      BIGINT NOT NULL
);

CREATE TABLE bill_payments (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  bill_id              BIGINT NOT NULL REFERENCES bills(id) ON DELETE RESTRICT,
  date                 DATE NOT NULL,
  amount               BIGINT NOT NULL CHECK (amount > 0),
  account_number       INTEGER NOT NULL,
  voucher_id           BIGINT NOT NULL REFERENCES vouchers(id),
  bank_transaction_id  BIGINT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Bank
-- ---------------------------------------------------------------------------
CREATE TABLE bank_accounts (
  id                     BIGSERIAL PRIMARY KEY,
  company_id             BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  bank_name              TEXT NOT NULL DEFAULT '',
  clearing_number        TEXT NOT NULL DEFAULT '',
  account_number         TEXT NOT NULL DEFAULT '',
  iban                   TEXT NOT NULL DEFAULT '',
  ledger_account_number  INTEGER NOT NULL DEFAULT 1930,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bank_transactions (
  id               BIGSERIAL PRIMARY KEY,
  company_id       BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id  BIGINT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  description      TEXT NOT NULL,
  amount           BIGINT NOT NULL CHECK (amount <> 0),
  balance          BIGINT,
  import_hash      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'booked', 'ignored')),
  matched_type     TEXT CHECK (matched_type IN ('invoice', 'bill', 'account')),
  matched_id       BIGINT,
  voucher_id       BIGINT REFERENCES vouchers(id),
  imported_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bank_account_id, import_hash)
);
CREATE INDEX bank_tx_company_status_idx ON bank_transactions (company_id, status, date);

-- Learned categorisation: description tokens -> account used by this company.
CREATE TABLE categorization_rules (
  company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token           TEXT NOT NULL,
  account_number  INTEGER NOT NULL,
  vat_rate        SMALLINT NOT NULL,
  hits            INTEGER NOT NULL DEFAULT 1,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, token, account_number, vat_rate)
);

-- ---------------------------------------------------------------------------
-- VAT
-- ---------------------------------------------------------------------------
CREATE TABLE vat_reports (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  boxes         JSONB NOT NULL,
  voucher_id    BIGINT NOT NULL REFERENCES vouchers(id),
  created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, period_start)
);

-- ---------------------------------------------------------------------------
-- Payroll
-- ---------------------------------------------------------------------------
CREATE TABLE employees (
  id                BIGSERIAL PRIMARY KEY,
  company_id        BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  personal_number   TEXT NOT NULL,
  email             TEXT NOT NULL DEFAULT '',
  employment_start  DATE NOT NULL,
  employment_end    DATE,
  monthly_salary    BIGINT NOT NULL CHECK (monthly_salary >= 0),
  tax_rate          NUMERIC(5, 2) NOT NULL DEFAULT 30 CHECK (tax_rate BETWEEN 0 AND 60),
  bank_account      TEXT NOT NULL DEFAULT '',
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, personal_number)
);

CREATE TABLE payroll_runs (
  id                  BIGSERIAL PRIMARY KEY,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  period              TEXT NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  pay_date            DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'booked')),
  total_gross         BIGINT NOT NULL DEFAULT 0,
  total_tax           BIGINT NOT NULL DEFAULT 0,
  total_employer_fee  BIGINT NOT NULL DEFAULT 0,
  total_net           BIGINT NOT NULL DEFAULT 0,
  voucher_id          BIGINT REFERENCES vouchers(id),
  created_by          BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, period)
);

CREATE TABLE payslips (
  id                 BIGSERIAL PRIMARY KEY,
  payroll_run_id     BIGINT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id        BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  base_salary        BIGINT NOT NULL,
  additions          BIGINT NOT NULL DEFAULT 0,
  deductions         BIGINT NOT NULL DEFAULT 0,
  gross              BIGINT NOT NULL,
  tax_rate           NUMERIC(5, 2) NOT NULL,
  tax                BIGINT NOT NULL,
  net                BIGINT NOT NULL,
  employer_fee_rate  NUMERIC(5, 2) NOT NULL,
  employer_fee       BIGINT NOT NULL,
  UNIQUE (payroll_run_id, employee_id)
);

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  company_id  BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   BIGINT,
  details     JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_company_idx ON audit_log (company_id, created_at DESC);
