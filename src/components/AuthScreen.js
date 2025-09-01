import React, { memo } from 'react';
import { User, ChevronRight, MessageSquare, BookOpen, FileText, Shield } from 'lucide-react';
import { handleLogin } from '../services/authService';

const AuthScreen = memo(() => {
  const handleLoginClick = async () => {
    try {
      await handleLogin();
    } catch (error) {
      console.error('Login failed:', error);
      // Could show error toast here
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold tracking-tight">AcceleraQA</div>
            <button
              onClick={handleLoginClick}
              className="px-6 py-2 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label="Sign in to AcceleraQA"
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

          {/* Main CTA Section */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 rounded-lg mb-16">
            <div className="flex items-start space-x-4 mb-6">
              <Shield className="h-8 w-8 text-blue-100 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold mb-4">Enterprise-Grade Security</h2>
                <p className="text-lg text-blue-100 mb-6">
                  Access AcceleraQA's advanced pharmaceutical AI assistant with enterprise-grade security through Auth0. 
                  Get personalized learning resources, conversation history, and study note generation.
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLoginClick}
              className="group inline-flex items-center space-x-3 bg-white text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-600"
            >
              <User className="h-5 w-5" />
              <span>Sign In with Auth0</span>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <FeatureCard
              icon={<MessageSquare className="h-8 w-8" />}
              gradient="from-blue-600 to-purple-600"
              title="Intelligent Responses"
              description="Advanced AI understanding of pharmaceutical regulations, GMP standards, and compliance requirements with real-time learning capabilities."
            />
            
            <FeatureCard
              icon={<BookOpen className="h-8 w-8" />}
              gradient="from-purple-600 to-pink-600"
              title="Curated Learning"
              description="Dynamic resource recommendations from FDA, ICH, and industry leaders for continuous professional development and regulatory updates."
            />
            
            <FeatureCard
              icon={<FileText className="h-8 w-8" />}
              gradient="from-pink-600 to-red-600"
              title="Export & Analyze"
              description="Generate comprehensive study materials and export conversation data for team collaboration and knowledge sharing."
            />
          </div>

          {/* Trust Indicators */}
          <div className="bg-gray-900 rounded-lg p-8">
            <h3 className="text-xl font-semibold mb-6 text-center">Trusted by Pharmaceutical Professionals</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400 mb-2">99.9%</div>
                <div className="text-sm text-gray-400">Uptime SLA</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400 mb-2">SOC2</div>
                <div className="text-sm text-gray-400">Compliant</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400 mb-2">GDPR</div>
                <div className="text-sm text-gray-400">Ready</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400 mb-2">24/7</div>
                <div className="text-sm text-gray-400">Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left text-gray-500">
              Built for pharmaceutical quality and compliance professionals worldwide
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
});

// Reusable feature card component
const FeatureCard = memo(({ icon, gradient, title, description }) => (
  <div className="text-center p-6 bg-gray-900 rounded-lg hover:bg-gray-850 transition-colors group">
    <div className={`w-16 h-16 bg-gradient-to-r ${gradient} rounded-lg mx-auto mb-6 flex items-center justify-center group-hover:scale-105 transition-transform`}>
      <div className="text-white">{icon}</div>
    </div>
    <h3 className="text-xl font-semibold mb-4 group-hover:text-white transition-colors">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </div>
));

FeatureCard.displayName = 'FeatureCard';
AuthScreen.displayName = 'AuthScreen';

export default AuthScreen;
