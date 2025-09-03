# BoklyAI - Swedish Accounting AI System

BoklyAI is an intelligent accounting system designed specifically for Swedish businesses, featuring AI-powered transaction categorization, document processing, and compliance with Swedish accounting standards.

## Project Structure

```
Boklyai/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── backend/
│   ├── src/
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   ├── tests/
│   └── package.json
├── ai-services/
│   ├── src/
│   ├── tests/
│   └── requirements.txt
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
├── docs/
└── README.md
```

## Development Phases

1. **Phase 1: Project Foundation & Authentication**
   - Basic setup, CI/CD configuration
   - BankID authentication integration
   - User management and database setup

2. **Phase 2: Core Accounting Schema**
   - Implementation of BAS chart of accounts
   - Transaction recording system

3. **Phase 3: Document Management & OCR**
   - File upload system
   - OCR integration for receipt/invoice processing

4. **Phase 4: Bank Integration**
   - Integration with Swedish bank APIs
   - Transaction import functionality

5. **Phase 5: VAT Handling**
   - VAT calculation engine
   - Swedish tax compliance

6. **Phase 6: AI-Powered Categorization**
   - ML-based transaction categorization

7. **Phase 7: Invoicing**
   - Invoice generation system
   - E-faktura support

8. **Phase 8: Reporting & Dashboard**
   - Financial statement generators
   - KPI dashboard

9. **Phase 9: Payroll Integration**
   - Employee management system
   - Swedish tax calculations

10. **Phase 10: Polish & Deployment**
    - Security audit
    - Performance optimization
    - Production deployment

## Technology Stack

- **Frontend**: React/TypeScript, React Native, GraphQL, Tailwind CSS
- **Backend**: Node.js/TypeScript, PostgreSQL, Redis
- **AI/ML**: Python, TensorFlow/PyTorch, spaCy, Tesseract OCR
- **Infrastructure**: Docker, Kubernetes, AWS/Azure, GitHub Actions

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker
- PostgreSQL

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
4. Install AI services dependencies:
   ```bash
   cd ai-services
   pip install -r requirements.txt
   ```

### Running the Application

Using Docker (recommended):
```bash
cd infrastructure/docker
docker-compose up
```

Or run each service separately:
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm start
```

## Testing

Run tests for each component:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# AI services tests
cd ai-services
python -m pytest
```

## CI/CD

This project uses GitHub Actions for CI/CD:
- CI Pipeline: Runs tests on every push and pull request
- CD Pipeline: Deploys to staging on main branch pushes, with manual promotion to production

## License

This project is proprietary and confidential.