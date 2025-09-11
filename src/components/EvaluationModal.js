import React, { useState, useEffect } from 'react';

function EvaluationModal({ onClose }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    document.body.classList.add('no-scroll');
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { firstName, lastName, email, company } = formData;
    if (!firstName || !lastName || !email) {
      return;
    }

    setSubmitting(true);

    const subject = `AcceleraQA Evaluation Request - ${firstName} ${lastName}`;
    const body = `Hello AcceleraQA Team,\n\nNew evaluation request:\n\nName: ${firstName} ${lastName}\nEmail: ${email}\nCompany: ${company || 'Not provided'}\nDate: ${new Date().toLocaleString()}\n\nPlease follow up for evaluation access.`;
    const mailtoLink = `mailto:support@acceleraqa.atlassian.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      window.open(mailtoLink, '_blank');
    } catch (error) {
      // ignore
    }

    setTimeout(() => {
      setShowSuccess(true);
      setSubmitting(false);
      setTimeout(onClose, 3000);
    }, 1000);
  };

  const handleModalClick = (e) => {
    if (e.target.id === 'evaluationModal') {
      onClose();
    }
  };

  return (
    <div id="evaluationModal" className="evaluation-modal show" onClick={handleModalClick}>
      <div className="modal-content">
        <button className="close-btn" onClick={onClose} aria-label="Close modal">
          ×
        </button>

        {showSuccess ? (
          <div id="successMessage" className="success-message">
            <div className="success-icon">✓</div>
            <h3 className="success-title">Thank you for your interest!</h3>
            <p className="success-text">One of our team members will be in touch shortly.</p>
          </div>
        ) : (
          <div id="modalForm">
            <div className="modal-header">
              <h2 className="modal-title">Request Tool Evaluation</h2>
              <p className="modal-subtitle">
                Interested in evaluating AcceleraQA for your quality team? Fill out the form below and we'll get you started with a personalized demo.
              </p>
            </div>
            <form id="evaluationForm" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className="form-input"
                  placeholder="Enter your first name"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName" className="form-label">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className="form-input"
                  placeholder="Enter your last name"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email" className="form-label">Work Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  placeholder="Enter your work email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="company" className="form-label">Company Name</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  className="form-input"
                  placeholder="Enter your company name"
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>
              <button type="submit" className="submit-btn" id="submitBtn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Request Evaluation Access'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default EvaluationModal;

