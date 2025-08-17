"use client";
import { useState, useEffect } from "react";
import moment from "moment";

interface ThirdPartyBooking {
  id: string;
  date: string;
  carCount: number;
  source: string;
}

interface ThirdPartyModalProps {
  onClose: () => void;
  onUpdate: () => void;
}

// localStorage utility functions
const getThirdPartyBookings = (): ThirdPartyBooking[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('thirdPartyBookings');
  return stored ? JSON.parse(stored) : [];
};

const saveThirdPartyBookings = (bookings: ThirdPartyBooking[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('thirdPartyBookings', JSON.stringify(bookings));
};

export default function ThirdPartyModal({ onClose, onUpdate }: ThirdPartyModalProps) {
  const [bookings, setBookings] = useState<ThirdPartyBooking[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    date: moment().format('YYYY-MM-DD'),
    carCount: 1,
    source: ''
  });

  useEffect(() => {
    setBookings(getThirdPartyBookings());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.source.trim() || formData.carCount < 1) {
      alert('Please fill in all fields with valid values');
      return;
    }

    const newBooking: ThirdPartyBooking = {
      id: editingIndex !== null ? bookings[editingIndex].id : Date.now().toString() + Math.random().toString(36).substr(2, 9),
      date: formData.date,
      carCount: formData.carCount,
      source: formData.source.trim()
    };

    let updatedBookings = [...bookings];
    
    if (editingIndex !== null) {
      // Update existing booking
      updatedBookings[editingIndex] = newBooking;
    } else {
      // Always add as new booking (allow multiple per date)
      updatedBookings.push(newBooking);
    }

    // Sort by date
    updatedBookings.sort((a, b) => a.date.localeCompare(b.date));
    
    setBookings(updatedBookings);
    saveThirdPartyBookings(updatedBookings);
    
    // Reset form
    setFormData({
      date: moment().format('YYYY-MM-DD'),
      carCount: 1,
      source: ''
    });
    setIsAddingNew(false);
    setEditingIndex(null);
    onUpdate();
  };

  const handleEdit = (index: number) => {
    const booking = bookings[index];
    setFormData({
      date: booking.date,
      carCount: booking.carCount,
      source: booking.source
    });
    setEditingIndex(index);
    setIsAddingNew(true);
  };

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this third-party booking?')) {
      const updatedBookings = bookings.filter((_, i) => i !== index);
      setBookings(updatedBookings);
      saveThirdPartyBookings(updatedBookings);
      onUpdate();
    }
  };

  const handleCancel = () => {
    setFormData({
      date: moment().format('YYYY-MM-DD'),
      carCount: 1,
      source: ''
    });
    setIsAddingNew(false);
    setEditingIndex(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.currentTarget === e.target) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Manage Third-Party Bookings</h2>
              <p className="text-purple-100 mt-1">
                Add or remove manual bookings from external sources
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500 hover:bg-purple-400 transition-colors duration-200"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          {/* Add New Button */}
          {!isAddingNew && (
            <div className="mb-6">
              <button
                onClick={() => setIsAddingNew(true)}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Third-Party Booking
              </button>
            </div>
          )}

          {/* Add/Edit Form */}
          {isAddingNew && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {editingIndex !== null ? 'Edit' : 'Add'} Third-Party Booking
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Cars
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.carCount}
                    onChange={(e) => setFormData({ ...formData, carCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Website
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., thepointsguy.com, brave.com, bing.com"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200 font-medium"
                  >
                    {editingIndex !== null ? 'Update' : 'Add'} Booking
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Existing Bookings List */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Current Third-Party Bookings</h3>
            
            {bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No third-party bookings yet.</p>
                <p className="text-sm">Click "Add Third-Party Booking" to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {moment(booking.date).format('MMMM D, YYYY')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {booking.carCount} car{booking.carCount !== 1 ? 's' : ''} • {booking.source}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(index)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-200 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Export utility functions for use in other components
export { getThirdPartyBookings, saveThirdPartyBookings };
export type { ThirdPartyBooking };