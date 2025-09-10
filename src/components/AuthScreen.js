import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const AuthScreen = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <img
          src="/AceleraQA_logo.png"
          alt="AcceleraQA logo"
          width="200"
          height="40"
          className="mx-auto"
        />
        <p className="text-lg text-gray-300">Sign in to continue</p>
        <button
          onClick={() => loginWithRedirect()}
          className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none"
        >
          Log In
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
