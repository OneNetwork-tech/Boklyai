import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Language resources
const resources = {
  sv: {
    translation: {
      // General terms
      "welcome": "Välkommen till BoklyAI",
      "welcome_to_boklyai": "Välkommen till BoklyAI",
      "ai_powered_accounting": "AI-driven bokföring för framtidens företag",
      "login": "Logga in",
      "logout": "Logga ut",
      "register": "Registrera",
      "get_started": "Kom igång",
      "email": "E-post",
      "password": "Lösenord",
      "cancel": "Avbryt",
      "save": "Spara",
      "delete": "Radera",
      "edit": "Redigera",
      "create": "Skapa",
      "update": "Uppdatera",
      "first_name": "Förnamn",
      "last_name": "Efternamn",
      "registering": "Registrerar...",
      "registration_failed": "Registreringen misslyckades. Försök igen.",
      "registration_successful": "Registreringen lyckades! Omdirigerar till inloggning...",
      "already_have_account": "Har du redan ett konto?",
      "register_for_boklyai": "Registrera dig för BoklyAI",
      "dashboard_description": "Översikt över ditt företags ekonomi",
      "revenue": "Intäkter",
      "expenses": "Utgifter",
      "net_income": "Nettoinkomst",
      "this_month": "Denna månad",
      "recent_transactions": "Senaste transaktioner",
      "upcoming_invoices": "Kommande fakturor",
      "employee": "Anställd",
      "position": "Position",
      "salary": "Lön",
      "add_employee": "Lägg till anställd",
      "actions": "Åtgärder",
      "view_report": "Visa rapport",
      "profit_loss_description": "Resultaträkning visar ditt företags intäkter, kostnader och vinst",
      "balance_sheet_description": "Balansräkning visar ditt företags tillgångar, skulder och eget kapital",
      "cash_flow_description": "Kassaflödesrapport visar pengar som flödar in och ut ur ditt företag",
      "login_to_boklyai": "Logga in till BoklyAI",
      "logging_in": "Loggar in...",
      "dont_have_account": "Har du inget konto?",
      
      // Navigation
      "dashboard": "Översikt",
      "invoices": "Fakturor",
      "expenses": "Utgifter",
      "reports": "Rapporter",
      "settings": "Inställningar",
      "payroll": "Lönehantering",
      
      // Dashboard
      "financial_overview": "Finansiell översikt",
      "recent_transactions": "Senaste transaktioner",
      "monthly_summary": "Månadssammanfattning",
      
      // Invoices
      "invoice_list": "Fakturalista",
      "create_invoice": "Skapa faktura",
      "invoice_number": "Fakturanummer",
      "customer": "Kund",
      "amount": "Belopp",
      "status": "Status",
      "date": "Datum",
      
      // Expenses
      "expense_list": "Utgiftslista",
      "add_expense": "Lägg till utgift",
      "category": "Kategori",
      "description": "Beskrivning",
      
      // Reports
      "financial_reports": "Finansiella rapporter",
      "profit_loss": "Resultaträkning",
      "balance_sheet": "Balansräkning",
      "cash_flow": "Kassaflöde",
      
      // Payroll
      "payroll_management": "Lönehantering",
      
      // Settings
      "account_settings": "Kontoinställningar",
      "company_info": "Företagsinformation",
      "language": "Språk",
      "swedish": "Svenska",
      "english": "Engelska",
      
      // Homepage
      "powerfull_features": "Kraftfulla funktioner",
      "features_description": "Upptäck hur BoklyAI kan förenkla din bokföring och spara tid varje månad",
      "ready_to_transform": "Redo att transformera din bokföring?",
      "join_businesses": "Gå med tusentals företag som redan sparar tid och pengar med BoklyAI",
      "start_free_trial": "Starta gratis provperiod",
      "bank_integration": "Bankintegration",
      "bank_integration_desc": "Importera och avstämma banktransaktioner automatiskt med dina bokföringsposter",
      "ai_document_processing": "AI-dokumentbehandling",
      "ai_document_processing_desc": "Extrahera data från fakturor, kvitton och andra finansiella dokument med OCR och AI",
      "tax_compliance": "Skattehantering",
      "tax_compliance_desc": "Generera momsdeklarationer och håll dig uppdaterad med svenska skatteregler",
      "invoicing_payments": "Fakturering & Betalningar",
      "invoicing_payments_desc": "Skapa och skicka fakturor, spåra betalningar och hantera kundfordringar",
      "payroll_management": "Lönehanteirng",
      "payroll_management_desc": "Hantera löner med automatiska skatteberäkningar och rapportering",
      "financial_reporting": "Finansiell rapportering",
      "financial_reporting_desc": "Generera finansiella rapporter och spåra nyckeltal",
      "businesses_served": "Kunder",
      "uptime": "Drifttid",
      "support": "Support",
      "average_setup": "Genomsnittlig installation"
    }
  },
  en: {
    translation: {
      // General terms
      "welcome": "Welcome to BoklyAI",
      "welcome_to_boklyai": "Welcome to BoklyAI",
      "ai_powered_accounting": "AI-powered accounting for the businesses of tomorrow",
      "login": "Login",
      "logout": "Logout",
      "register": "Register",
      "get_started": "Get Started",
      "email": "Email",
      "password": "Password",
      "cancel": "Cancel",
      "save": "Save",
      "delete": "Delete",
      "edit": "Edit",
      "create": "Create",
      "update": "Update",
      "first_name": "First Name",
      "last_name": "Last Name",
      "registering": "Registering...",
      "registration_failed": "Registration failed. Please try again.",
      "registration_successful": "Registration successful! Redirecting to login...",
      "already_have_account": "Already have an account?",
      "register_for_boklyai": "Register for BoklyAI",
      "dashboard_description": "Overview of your business finances",
      "revenue": "Revenue",
      "expenses": "Expenses",
      "net_income": "Net Income",
      "this_month": "This month",
      "recent_transactions": "Recent Transactions",
      "upcoming_invoices": "Upcoming Invoices",
      "employee": "Employee",
      "position": "Position",
      "salary": "Salary",
      "add_employee": "Add Employee",
      "actions": "Actions",
      "view_report": "View Report",
      "profit_loss_description": "Profit & Loss statement shows your company's revenues, expenses, and profit",
      "balance_sheet_description": "Balance sheet shows your company's assets, liabilities, and equity",
      "cash_flow_description": "Cash flow report shows money flowing in and out of your business",
      "login_to_boklyai": "Login to BoklyAI",
      "logging_in": "Logging in...",
      "dont_have_account": "Don't have an account?",
      
      // Navigation
      "dashboard": "Dashboard",
      "invoices": "Invoices",
      "expenses": "Expenses",
      "reports": "Reports",
      "settings": "Settings",
      "payroll": "Payroll",
      
      // Dashboard
      "financial_overview": "Financial Overview",
      "recent_transactions": "Recent Transactions",
      "monthly_summary": "Monthly Summary",
      
      // Invoices
      "invoice_list": "Invoice List",
      "create_invoice": "Create Invoice",
      "invoice_number": "Invoice Number",
      "customer": "Customer",
      "amount": "Amount",
      "status": "Status",
      "date": "Date",
      
      // Expenses
      "expense_list": "Expense List",
      "add_expense": "Add Expense",
      "category": "Category",
      "description": "Description",
      
      // Reports
      "financial_reports": "Financial Reports",
      "profit_loss": "Profit & Loss",
      "balance_sheet": "Balance Sheet",
      "cash_flow": "Cash Flow",
      
      // Payroll
      "payroll_management": "Payroll Management",
      
      // Settings
      "account_settings": "Account Settings",
      "company_info": "Company Information",
      "language": "Language",
      "swedish": "Swedish",
      "english": "English",
      
      // Homepage
      "powerfull_features": "Powerful Features",
      "features_description": "Discover how BoklyAI can simplify your accounting and save you time every month",
      "ready_to_transform": "Ready to transform your accounting?",
      "join_businesses": "Join thousands of businesses already saving time and money with BoklyAI",
      "start_free_trial": "Start Free Trial",
      "bank_integration": "Bank Integration",
      "bank_integration_desc": "Automatically import and reconcile bank transactions with your accounting records",
      "ai_document_processing": "AI Document Processing",
      "ai_document_processing_desc": "Extract data from invoices, receipts, and other financial documents using OCR and AI",
      "tax_compliance": "Tax Compliance",
      "tax_compliance_desc": "Generate VAT reports (momsdeklaration) and stay compliant with Swedish tax regulations",
      "invoicing_payments": "Invoicing & Payments",
      "invoicing_payments_desc": "Create and send invoices, track payments, and manage accounts receivable",
      "payroll_management": "Payroll Management",
      "payroll_management_desc": "Manage employee payroll with automatic tax calculations and reporting",
      "financial_reporting": "Financial Reporting",
      "financial_reporting_desc": "Generate financial statements and track key performance indicators",
      "businesses_served": "Businesses Served",
      "uptime": "Uptime",
      "support": "Support",
      "average_setup": "Average Setup"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "sv", // Default language is Swedish
    fallbackLng: "en", // Fallback to English
    
    interpolation: {
      escapeValue: false // React already safes from XSS
    }
  });

export default i18n;