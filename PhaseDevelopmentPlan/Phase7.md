Invoicing & AR/AP Management  

Objectives: Implement invoicing and receivables/payables management

Create invoice generation system

Develop e-faktura support

Implement payment reminder system

Create customer/vendor management

Test Criteria:

Invoices generated correctly

e-faktura standards followed

Payment reminders work appropriately

## Implementation Status: COMPLETED

### Entities Created:
1. **Customer** - Represents customers/clients
2. **Vendor** - Represents suppliers/vendors
3. **Invoice** - Represents sales invoices
4. **Bill** - Represents purchase bills
5. **InvoiceItem** - Represents line items in invoices
6. **BillItem** - Represents line items in bills

### Services Implemented:
1. **InvoiceService** - Managing customers, invoices, and invoice items
2. **BillService** - Managing vendors, bills, and bill items

### API Endpoints:
1. **Customer Management**
   - POST /customers - Create a new customer
   - GET /customers - List all customers

2. **Vendor Management**
   - POST /vendors - Create a new vendor
   - GET /vendors - List all vendors

3. **Invoice Management**
   - POST /invoices - Create a new invoice
   - GET /companies/:id/invoices - List all invoices for a company
   - POST /invoices/:id/items - Add item to an invoice
   - POST /invoices/:id/status - Update invoice status

4. **Bill Management**
   - POST /bills - Create a new bill
   - GET /companies/:id/bills - List all bills for a company
   - POST /bills/:id/items - Add item to a bill
   - POST /bills/:id/status - Update bill status

### Features:
- Customer management with full contact details
- Vendor management with full contact details
- Invoice creation with line items and tax calculations
- Bill creation with line items and tax calculations
- Support for e-invoices (e-faktura)
- Invoice and bill status tracking (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
- Automatic calculation of subtotal, tax amount, and total
- Company-based invoice and bill organization
- Account linking for invoice and bill items

### Technology Stack:
- **TypeORM** for database management
- **TypeScript/Node.js** for backend services
- **PostgreSQL** for data storage
- **REST API** for invoicing endpoints

### Swedish Standards Compliance:
- Support for Swedish organization numbers
- Support for VAT (moms) handling
- Structure ready for e-faktura integration
- Company-based financial management