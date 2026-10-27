/**
 * Centralized API Client for MYSUBS Nómina
 */
const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('mysubs_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}, responseType = 'json') {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...getAuthHeaders(), ...options.headers };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    localStorage.removeItem('mysubs_token');
    localStorage.removeItem('mysubs_user');
    if (window.location.pathname !== '/login') {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
  }

  if (response.ok && responseType === 'blob') return response.blob();

  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
  }

  return data;
}

async function downloadFile(endpoint, filename) {
  const blob = await request(endpoint, {}, 'blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),

  // Remunerations Table & Real-time Calculation (Core Module)
  getRemunerations: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/remunerations${q ? `?${q}` : ''}`);
  },
  simulateRemuneration: (monthlySalary) => request('/remunerations/simulate', { method: 'POST', body: JSON.stringify({ monthlySalary }) }),
  updateEmployeeSalaryInline: (id, data) => request(`/remunerations/employee/${id}/salary`, { method: 'PUT', body: JSON.stringify(data) }),
  downloadRemunerationsExcel: () => downloadFile('/remunerations/export/excel', 'MYSUBS_Cuadro_Remuneraciones.xlsx'),

  // Proposals / Scenarios
  getProposals: () => request('/proposals'),
  createProposal: (data) => request('/proposals', { method: 'POST', body: JSON.stringify(data) }),
  addProposalItem: (id, data) => request(`/proposals/${id}/items`, { method: 'POST', body: JSON.stringify(data) }),

  // Parameters
  getParameters: () => request('/parameters'),
  getParameterHistory: () => request('/parameters/history'),
  updateParameter: (code, data) => request(`/parameters/${code}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Labor Regimes & Work Schedules
  getRegimes: () => request('/regimes'),
  createRegime: (data) => request('/regimes', { method: 'POST', body: JSON.stringify(data) }),
  getSchedules: () => request('/schedules'),
  createSchedule: (data) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),

  // Employees
  getEmployees: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/employees${q ? `?${q}` : ''}`);
  },
  getEmployee: (id) => request(`/employees/${id}`),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updatePosition: (id, data) => request(`/departments/positions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getOvertime: (periodId, employeeId) => request(`/payrolls/overtime?periodId=${periodId}&employeeId=${employeeId}`),
  saveOvertime: (data) => request('/payrolls/overtime', { method: 'PUT', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  changeSalary: (id, data) => request(`/employees/${id}/salary`, { method: 'POST', body: JSON.stringify(data) }),
  getSalaryHistory: (id) => request(`/employees/${id}/salary-history`),
  toggleEmployeeStatus: (id) => request(`/employees/${id}/toggle-status`, { method: 'PUT' }),

  // Departments & Positions
  getDepartments: () => request('/departments'),
  createDepartment: (data) => request('/departments', { method: 'POST', body: JSON.stringify(data) }),
  getPositions: () => request('/departments/positions'),
  getSalaryScales: () => request('/departments/salary-scales'),
  createPosition: (data) => request('/departments/positions', { method: 'POST', body: JSON.stringify(data) }),

  // Pay Periods
  getPeriods: () => request('/periods'),
  getPeriod: (id) => request(`/periods/${id}`),
  createPeriod: (data) => request('/periods', { method: 'POST', body: JSON.stringify(data) }),
  updatePeriodStatus: (id, status) => request(`/periods/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  previewIncomeTax: data => request('/payrolls/tax-preview', { method: 'POST', body: JSON.stringify(data) }),
  // Payrolls
  generatePayroll: (periodId) => request('/payrolls/generate', { method: 'POST', body: JSON.stringify({ periodId }) }),
  getPayrolls: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/payrolls${q ? `?${q}` : ''}`);
  },
  getPayrollSlip: (id) => request(`/payrolls/${id}`),
  approvePayroll: (periodId) => request('/payrolls/approve', { method: 'POST', body: JSON.stringify({ periodId }) }),

  // Payments
  getPayments: () => request('/payments'),
  getPaymentBatch: (id) => request(`/payments/${id}`),
  markBatchPaid: (id, data) => request(`/payments/${id}/mark-paid`, { method: 'PUT', body: JSON.stringify(data) }),

  // Reports
  downloadEmployeesCsv: () => downloadFile('/reports/employees.csv', 'MYSUBS_Reporte_Empleados.csv'),
  downloadPayrollCsv: (periodId) => downloadFile(`/reports/payroll/${periodId}.csv`, `MYSUBS_Nomina_${periodId}.csv`),

  // Audit
  getAuditLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/audit${q ? `?${q}` : ''}`);
  }
};
