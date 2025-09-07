import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import neonService from '../services/neonService';

const TrainingResourcesAdmin = () => {
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', url: '', tag: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const data = await neonService.getTrainingResources();
      setResources(data);
    } catch (err) {
      console.error('Failed to load training resources:', err);
      setResources([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) {
      setError('Name and URL are required');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const newResource = await neonService.addTrainingResource(form);
      setResources(prev => [newResource, ...prev]);
      setForm({ name: '', description: '', url: '', tag: '' });
    } catch (err) {
      console.error('Failed to add training resource:', err);
      setError(err.message || 'Failed to add resource');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Training title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={3}
            placeholder="Brief description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">URL</label>
          <input
            type="url"
            name="url"
            value={form.url}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="https://example.com/training"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tag</label>
          <input
            type="text"
            name="tag"
            value={form.tag}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., safety"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Resource
          </button>
        </div>
      </form>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Existing Resources</h3>
        {resources.length === 0 ? (
          <p className="text-sm text-gray-500">No training resources found.</p>
        ) : (
          <ul className="space-y-3">
            {resources.map(res => (
              <li key={res.id} className="p-4 border rounded-md">
                <div className="font-medium">{res.name}</div>
                {res.tag && (
                  <span className="inline-block text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded mt-1">{res.tag}</span>
                )}
                {res.description && <p className="text-sm text-gray-500">{res.description}</p>}
                {res.url && (
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {res.url}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TrainingResourcesAdmin;
