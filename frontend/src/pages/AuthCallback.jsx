import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PageLoader from '../components/ui/PageLoader';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setToken, checkAuth } = useAuthStore();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login');
      return;
    }

    if (token) {
      setToken(token);
      checkAuth().then(() => {
        toast.success('Signed in with Google!');
        navigate('/dashboard');
      });
    } else {
      navigate('/login');
    }
  }, [params, setToken, checkAuth, navigate]);

  return <PageLoader message="Completing sign-in..." />;
}
