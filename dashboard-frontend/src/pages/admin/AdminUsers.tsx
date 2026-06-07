import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Dashboard.css';

interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  provider: string | null;
  is_admin: boolean;
  credits: number;
  created_at: string;
}

const AdminUsers: React.FC = () => {
  const { getIdToken } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const token = await getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [getIdToken]);

  const handleUpdateCredits = async (userId: string, newCredits: number) => {
    try {
      const token = await getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credits: newCredits })
      });
      
      if (!response.ok) throw new Error('Failed to update user');
      fetchUsers(); // Refresh list
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const token = await getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_admin: !currentStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update user');
      fetchUsers(); // Refresh list
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="dashboard-content-inner">
      <div className="content-header">
        <h1 className="content-title">Manage Users</h1>
        <p className="content-subtitle">View and manage platform users</p>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <div className="models-table-container">
        <table className="models-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Provider</th>
              <th>Credits ($)</th>
              <th>Admin?</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{u.display_name || 'No Name'}</div>
                  <div style={{ fontSize: '0.85em', color: '#9ca3af' }}>{u.email || u.id}</div>
                </td>
                <td>{u.provider}</td>
                <td>{(u.credits / 100).toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${u.is_admin ? 'status-active' : 'status-inactive'}`}>
                    {u.is_admin ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    style={{ padding: '4px 8px', marginRight: '8px', background: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      const amount = prompt("Enter new credit amount (in cents, e.g. 1000 for $10.00):", u.credits.toString());
                      if (amount && !isNaN(parseInt(amount))) {
                        handleUpdateCredits(u.id, parseInt(amount));
                      }
                    }}
                  >
                    Set Credits
                  </button>
                  <button 
                    style={{ padding: '4px 8px', background: u.is_admin ? '#ef4444' : '#10b981', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      if (confirm(`Are you sure you want to ${u.is_admin ? 'revoke admin from' : 'make admin'} this user?`)) {
                        handleToggleAdmin(u.id, u.is_admin);
                      }
                    }}
                  >
                    {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
