import React from 'react';
import { User, ChevronRight, MessageSquare, BookOpen, FileText } from 'lucide-react';
import { handleLogin } from '../services/authService';

const AuthScreen = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold tracking-tight">AcceleraQA</div>
            <button
              onClick={handleLogin}
              className="px-6 py-2 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-4xl">
          <h1 className="text-6xl lg:text-8xl font-bold mb-8 leading-tight">
            The Future of
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Pharmaceutical QA
            </span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl">
            AI-powered learning assistant for pharmaceutical quality and compliance professionals. 
            Accelerating innovation in regulatory excellence through intelligent automation.
          </p>

          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 rounded-lg mb-16">
            <h2 className="text-2xl font-bold mb-4">Secure Auth0 Authentication</h2>
            <p className="text-lg text-blue-100 mb-6">
              Access AcceleraQA's advanced pharmaceutical AI assistant with enterprise-grade security through Auth0. 
              Get personalized learning resources, conversation history, and study note generation.
            </p>
            <button
              onClick={handleLogin}
              className="group inline-flex items-center space-x-3 bg-white text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300"
            >
              <User className="h-5 w-5" />
              <span>Sign In with Auth0</span>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gray-900 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Intelligent Responses</h3>
              <p className="text-gray-400">
                Advanced AI understanding of pharmaceutical regulations, GMP standards, and compliance requirements
              </p>
            </div>
            
            <div className="text-center p-6 bg-gray-900 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Curated Learning</h3>
              <p className="text-gray-400">
                Dynamic resource recommendations from FDA, ICH, and industry leaders for continuous professional development
              </p>
            </div>
            
            <div className="text-center p-6 bg-gray-900 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-600 to-red-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Export & Analyze</h3>
              <p className="text-gray-400">
                Generate comprehensive study materials and export conversation data for team collaboration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-gray-500">
            Built for pharmaceutical quality and compliance professionals worldwide
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthScreen;
