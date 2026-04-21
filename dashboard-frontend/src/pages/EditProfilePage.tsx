import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from 'firebase/auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/AccountPages.css';

const EditProfilePage: React.FC = () => {
  const { firebaseUser, user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
    }
  }, [user]);

  const initial = displayName?.charAt(0)?.toUpperCase()
    || user?.email?.charAt(0)?.toUpperCase()
    || '?';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!firebaseUser) {
      setError('Not authenticated.');
      return;
    }

    try {
      setLoading(true);
      await updateProfile(firebaseUser, {
        displayName: displayName.trim() || null,
        photoURL: photoURL.trim() || null,
      });
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="account-page-container">
        <div className="account-card">
          <div className="account-card-header">
            <h2>✏️ Edit Profile</h2>
            <p>Update your profile information</p>
          </div>

          {/* Avatar preview */}
          <div className="profile-avatar-section">
            {photoURL ? (
              <img src={photoURL} alt="avatar" className="profile-avatar-large" />
            ) : (
              <div className="profile-avatar-placeholder-large">{initial}</div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="account-form">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Read-only fields */}
            <div className="form-group">
              <label>Email</label>
              <input
                type="text"
                value={user?.email || user?.phoneNumber || '—'}
                disabled
                className="input-disabled"
              />
              <span className="field-hint">Email cannot be changed here</span>
            </div>

            <div className="form-group">
              <label>UID</label>
              <input
                type="text"
                value={user?.uid || ''}
                disabled
                className="input-disabled"
              />
            </div>

            {/* Editable fields */}
            <div className="form-group">
              <label htmlFor="display-name">Display Name</label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="photo-url">Photo URL</label>
              <input
                id="photo-url"
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
              <span className="field-hint">Paste a URL for your profile picture</span>
            </div>

            <button type="submit" className="account-btn" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default EditProfilePage;
