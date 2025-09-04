import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [organizationNumber, setOrganizationNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Sweden');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await api.getCompanies();
        setCompanies(data);
      } catch (err) {
        console.error('Failed to fetch companies', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      const newCompany = await api.createCompany({
        name,
        organizationNumber,
        vatNumber,
        address,
        postalCode,
        city,
        country
      });
      
      setCompanies([...companies, newCompany]);
      setSuccess(true);
      
      // Reset form
      setName('');
      setOrganizationNumber('');
      setVatNumber('');
      setAddress('');
      setPostalCode('');
      setCity('');
      
      // Hide form
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create company');
      console.error('Create company error', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Companies</h1>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Company'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card mb-8">
          <h2 className="text-2xl font-bold mb-4">Create New Company</h2>
          
          {error && (
            <div className="alert alert-danger mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="alert alert-success mb-4">
              Company created successfully!
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="name">Company Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="organizationNumber">Organization Number</label>
                <input
                  type="text"
                  id="organizationNumber"
                  value={organizationNumber}
                  onChange={(e) => setOrganizationNumber(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="vatNumber">VAT Number</label>
                <input
                  type="text"
                  id="vatNumber"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="postalCode">Postal Code</label>
                <input
                  type="text"
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="country">Country</label>
              <input
                type="text"
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            
            <button type="submit" className="btn btn-primary">
              Create Company
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p>Loading companies...</p>
        </div>
      ) : (
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Your Companies</h2>
          
          {companies.length === 0 ? (
            <p className="text-gray-600">No companies found. Create your first company to get started.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Organization Number</th>
                    <th>VAT Number</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td>
                        <Link to={`/companies/${company.id}`} className="text-blue-600 hover:underline">
                          {company.name}
                        </Link>
                      </td>
                      <td>{company.organizationNumber}</td>
                      <td>{company.vatNumber || '-'}</td>
                      <td>{company.city ? `${company.city}, ${company.country}` : company.country}</td>
                      <td>
                        <Link to={`/companies/${company.id}`} className="text-blue-600 hover:underline">
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompaniesPage;