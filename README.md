# BoklyAI - Swedish Accounting AI System

BoklyAI is an AI-powered accounting and business management system designed specifically for Swedish businesses. It automates financial processes, ensures tax compliance, and provides intelligent insights for better decision-making.

## Features

### Core Accounting
- Bank integration and transaction import
- Automated transaction matching and reconciliation
- Chart of accounts management
- Double-entry bookkeeping

### AI-Powered Automation
- Document processing with OCR
- Intelligent transaction categorization
- Predictive analytics and forecasting
- Anomaly detection

### Tax Compliance
- VAT calculation and reporting (momsdeklaration)
- Tax rate management for Swedish rates (25%, 12%, 6%)
- Tax report generation

### Financial Management
- Invoicing and billing (including e-faktura support)
- Accounts receivable and payable tracking
- Payroll management with Swedish tax calculations
- Financial reporting and dashboard visualization

### Security & Compliance
- BankID authentication for Swedish users
- Role-based access control
- Audit logging
- Data encryption

## Technology Stack

- **Frontend**: React/TypeScript, React Native, GraphQL, Tailwind CSS
- **Backend**: Node.js/TypeScript, Python for AI/ML components
- **Database**: PostgreSQL with TypeORM
- **AI/ML**: TensorFlow/PyTorch, spaCy, Tesseract OCR
- **Infrastructure**: Docker, Kubernetes, AWS/Azure

## Development Phases

1. **Phase 1**: Core Infrastructure - BankID auth, company management, chart of accounts
2. **Phase 2**: AI Document Processing - OCR, data extraction, bank integration
3. **Phase 3**: Transaction Matching & Categorization - Auto-matching, rule engine
4. **Phase 4**: Tax Compliance - VAT handling, tax reports
5. **Phase 5**: AI-Powered Categorization - ML models, feedback loop
6. **Phase 6**: Invoicing & AR/AP Management - Invoice generation, payment tracking
7. **Phase 7**: Payroll Integration - Employee management, salary calculations
8. **Phase 8**: Financial Reporting & Dashboard - Financial statements, KPIs
9. **Phase 9**: Mobile App & Notifications - Mobile UI, real-time alerts
10. **Phase 10**: Polish, Security & Deployment - RBAC, security audit, deployment

## Deployment

To deploy the application, follow the instructions in [DEPLOYMENT.md](DEPLOYMENT.md).

## Getting Started

### Backend
```bash
cd backend
npm install
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

The frontend application can be configured using environment variables:

- `REACT_APP_API_URL`: The URL to the backend API (default: http://localhost:3000)
- `REACT_APP_BASE_URL`: The base URL of the application
- `NODE_ENV`: The environment (development/production)

In development, create a `.env` file in the frontend directory with your configuration.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
