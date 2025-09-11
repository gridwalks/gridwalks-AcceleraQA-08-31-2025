// src/App.js - EMERGENCY DEBUG VERSION
// Replace your App.js temporarily with this to diagnose issues

import React, { useState, useEffect } from 'react';
import { CheckCircle, X, AlertTriangle, Loader2 } from 'lucide-react';

const EmergencyDiagnostic = () => {
  const [checks, setChecks] = useState({
    react: { status: 'checking', message: 'React Loading...' },
    env: { status: 'checking', message: 'Checking Environment Variables...' },
    auth0: { status: 'checking', message: 'Testing Auth0 Configuration...' },
    functions: { status: 'checking', message: 'Testing Netlify Functions...' },
    neon: { status: 'checking', message: 'Testing Neon Database...' }
  });

  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    // 1. React is working (if we see this)
    updateCheck('react', 'success', 'React is working ✓');

    // 2. Check environment variables
    const envVars = {
      AUTH0_DOMAIN: process.env.REACT_APP_AUTH0_DOMAIN,
      AUTH0_CLIENT_ID: process.env.REACT_APP_AUTH0_CLIENT_ID,
      OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY
    };

    const missingVars = Object.entries(envVars).filter(([key, value]) => !value);
    
    if (missingVars.length === 0) {
      updateCheck('env', 'success', 'All environment variables present ✓');
    } else {
      updateCheck('env', 'error', `Missing: ${missingVars.map(([key]) => key).join(', ')}`);
    }

    setDebugInfo(prev => ({ ...prev, envVars, missingVars }));

    // 3. Test Auth0 configuration
    try {
      if (envVars.AUTH0_DOMAIN && envVars.AUTH0_CLIENT_ID) {
        // Basic Auth0 config test
        const auth0Domain = envVars.AUTH0_DOMAIN;
        if (auth0Domain.includes('.auth0.com') || auth0Domain.includes('.auth0.us')) {
          updateCheck('auth0', 'success', 'Auth0 configuration looks valid ✓');
        } else {
          updateCheck('auth0', 'warning', 'Auth0 domain format may be incorrect');
        }
      } else {
        updateCheck('auth0', 'error', 'Auth0 environment variables missing');
      }
    } catch (error) {
      updateCheck('auth0', 'error', `Auth0 error: ${error.message}`);
    }

    // 4. Test Netlify Functions
    try {
      const response = await fetch('/.netlify/functions/test-simple', {
        method: 'GET'
      });
      
      if (response.ok) {
        updateCheck('functions', 'success', 'Netlify Functions working ✓');
      } else {
        updateCheck('functions', 'warning', `Functions responding but status: ${response.status}`);
      }
    } catch (error) {
      updateCheck('functions', 'error', `Functions not accessible: ${error.message}`);
    }

    // 5. Test Neon Database
    try {
      const response = await fetch('/.netlify/functions/neon-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      });

      if (response.ok) {
        updateCheck('neon', 'success', 'Neon Database accessible ✓');
      } else {
        updateCheck('neon', 'warning', `Neon responding but status: ${response.status}`);
      }
    } catch (error) {
      updateCheck('neon', 'error', `Neon database error: ${error.message}`);
    }
  };

  const updateCheck = (key, status, message) => {
    setChecks(prev => ({
      ...prev,
      [key]: { status, message }
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <X className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🚨 AcceleraQA Emergency Diagnostics
            </h1>
            <p className="text-gray-600">
              Your site isn't loading properly. Here's what I found:
            </p>
          </div>

          {/* Diagnostic Results */}
          <div className="space-y-4 mb-8">
            {Object.entries(checks).map(([key, check]) => (
              <div
                key={key}
                className={`flex items-center p-4 rounded-lg border-2 ${getStatusColor(check.status)}`}
              >
                {getStatusIcon(check.status)}
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </h3>
                  <p className="text-gray-700">{check.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Debug Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Debug Information:</h3>
            <pre className="text-sm text-gray-700 overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>

          {/* Next Steps */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
            <ul className="text-blue-800 space-y-1">
              <li>1. Fix any ❌ red errors above</li>
              <li>2. Check your Netlify environment variables</li>
              <li>3. Verify Auth0 callback URLs match your site URL</li>
              <li>4. Check browser console for additional errors (F12)</li>
              <li>5. Once fixed, restore your original App.js</li>
            </ul>
          </div>

          {/* Test Button */}
          <div className="mt-6 text-center">
            <button
              onClick={runDiagnostics}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Run Diagnostics Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyDiagnostic;

/*
INSTRUCTIONS:
1. TEMPORARILY replace your src/App.js with this file
2. Deploy to Netlify
3. Visit your site
4. You should see either:
   - Emergency debug screen (if there are issues)
   - Simple loading test (if basic React works)

5. Check browser console for debug information
6. Once you identify the issue, restore your original App.js

COMMON ISSUES THIS WILL REVEAL:
- Missing environment variables
- Auth0 configuration problems
- Network/function issues
- Basic React/build problems

WHAT TO LOOK FOR:
- Red ❌ marks indicate missing/broken configuration
- Console errors will show specific problems
- Functions test will show if Netlify functions work
*/
