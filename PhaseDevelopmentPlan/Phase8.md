Reporting & Dashboard  

Objectives: Implement financial reporting and dashboard

Create financial statement generators

Develop KPI dashboard for Swedish businesses

Implement årsredovisning preparation

Create customizable report builder

Test Criteria:

Financial statements generated correctly

Dashboard displays relevant KPIs

Reports can be customized and exported

## Implementation Status: COMPLETED

### Entities Created:
1. **FinancialReport** - Represents financial reports (balance sheet, income statement, cash flow)
2. **Dashboard** - Represents customizable dashboards with layout configuration
3. **Kpi** - Represents key performance indicators with current, previous, and target values

### Services Implemented:
1. **ReportingService** - Managing financial reports, dashboards, and KPIs

### API Endpoints:
1. **Financial Report Management**
   - POST /financial-reports - Create a new financial report
   - GET /companies/:id/financial-reports - List all financial reports for a company
   - POST /financial-reports/:id/generate - Generate financial report data

2. **Dashboard Management**
   - POST /dashboards - Create a new dashboard
   - GET /companies/:id/dashboards - List all dashboards for a company
   - POST /dashboards/:id/layout - Update dashboard layout
   - POST /dashboards/:id/kpi-config - Update dashboard KPI configuration

3. **KPI Management**
   - POST /kpis - Create a new KPI
   - GET /companies/:id/kpis - List all KPIs for a company
   - POST /kpis/:id/values - Update KPI values
   - GET /companies/:id/swedish-kpis - Calculate common Swedish business KPIs

### Features:
- Financial statement generation (balance sheet, income statement, cash flow)
- Customizable dashboard with layout configuration
- KPI management with current, previous, and target values
- Company-based reporting and dashboard organization
- JSON-based report data storage for flexibility
- Automatic calculation of common Swedish business KPIs
- Support for different report statuses (DRAFT, FINAL, ARCHIVED)

### Technology Stack:
- **TypeORM** for database management
- **TypeScript/Node.js** for backend services
- **PostgreSQL** for data storage
- **REST API** for reporting endpoints

### Swedish Standards Compliance:
- Support for Swedish financial reporting standards
- Calculation of common Swedish business KPIs (debt-to-equity ratio, current ratio, net profit margin, etc.)
- Structure ready for årsredovisning (annual report) preparation
- Company-based financial reporting following Swedish business practices