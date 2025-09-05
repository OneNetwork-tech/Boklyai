const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface CompanyData {
  name: string;
  organizationNumber: string;
  vatNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

interface BankAccountData {
  companyId: number;
  bankId: number;
  accountName: string;
  accountNumber: string;
  iban?: string;
  bic?: string;
}

class ApiService {
  // Authentication
  async login(data: LoginData) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    return response.json();
  }

  async register(data: RegisterData) {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    
    return response.json();
  }

  // Companies
  async getCompanies() {
    const response = await fetch(`${API_BASE_URL}/companies`);
    if (!response.ok) {
      throw new Error('Failed to fetch companies');
    }
    return response.json();
  }

  async createCompany(data: CompanyData) {
    const response = await fetch(`${API_BASE_URL}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create company');
    }
    
    return response.json();
  }

  async getCompanyById(id: number) {
    const response = await fetch(`${API_BASE_URL}/companies/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch company');
    }
    return response.json();
  }

  // Bank Accounts
  async getBankAccounts(companyId: number) {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/bank-accounts`);
    if (!response.ok) {
      throw new Error('Failed to fetch bank accounts');
    }
    return response.json();
  }

  async createBankAccount(data: BankAccountData) {
    const response = await fetch(`${API_BASE_URL}/bank-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create bank account');
    }
    
    return response.json();
  }

  // Transactions
  async getTransactions(accountId: number) {
    const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/transactions`);
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return response.json();
  }

  async createTransaction(data: any) {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create transaction');
    }
    
    return response.json();
  }

  // Invoices
  async getInvoices(companyId: number) {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/invoices`);
    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }
    return response.json();
  }

  async createInvoice(data: any) {
    const response = await fetch(`${API_BASE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create invoice');
    }
    
    return response.json();
  }

  // Bills
  async getBills(companyId: number) {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/bills`);
    if (!response.ok) {
      throw new Error('Failed to fetch bills');
    }
    return response.json();
  }

  async createBill(data: any) {
    const response = await fetch(`${API_BASE_URL}/bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create bill');
    }
    
    return response.json();
  }

  // Payroll
  async getEmployees(companyId: number) {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/employees`);
    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }
    return response.json();
  }

  async createEmployee(data: any) {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create employee');
    }
    
    return response.json();
  }

  async getPayrolls(companyId: number) {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/payrolls`);
    if (!response.ok) {
      throw new Error('Failed to fetch payrolls');
    }
    return response.json();
  }

  async createPayroll(data: any) {
    const response = await fetch(`${API_BASE_URL}/payrolls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create payroll');
    }
    
    return response.json();
  }

  // Reports
  async getFinancialReports(companyId: number) {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/financial-reports`);
    if (!response.ok) {
      throw new Error('Failed to fetch financial reports');
    }
    return response.json();
  }

  async createFinancialReport(data: any) {
    const response = await fetch(`${API_BASE_URL}/financial-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create financial report');
    }
    
    return response.json();
  }

  async generateFinancialReport(reportId: number) {
    const response = await fetch(`${API_BASE_URL}/financial-reports/${reportId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate financial report');
    }
    
    return response.json();
  }
}

export default new ApiService();