"use client";
import moment from "moment";

interface WooOrder {
  id: number;
  line_items: {
    name: string;
    quantity: number;
    meta_data: { key: string; value: string }[];
  }[];
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

interface ThirdPartyBooking {
  id: string;
  date: string;
  carCount: number;
  source: string;
}

interface DayData {
  date: string;
  carCount: number;
  occupancyPercentage: number;
  orders?: WooOrder[];
  thirdPartyBookings?: ThirdPartyBooking[];
}

interface OrderModalProps {
  date: string;
  dayData: DayData;
  onClose: () => void;
}

export default function OrderModal({ date, dayData, onClose }: OrderModalProps) {
  // Extract cruise duration from line item name
  const getCruiseDuration = (itemName: string) => {
    const nightsMatch = itemName.match(/(\d+)-Night/);
    return nightsMatch ? `${nightsMatch[1]} nights` : 'Unknown duration';
  };

  // Calculate total cars for an order
  const getTotalCars = (order: WooOrder) => {
    return order.line_items.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.currentTarget === e.target) {
      onClose();
    }
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {moment(date).format('MMMM D, YYYY')}
              </h2>
              <p className="text-blue-100 mt-1">
                {dayData.orders ? `${dayData.orders.length} order${dayData.orders.length !== 1 ? 's' : ''}` : 'Loading orders...'} • {dayData.carCount} car{dayData.carCount !== 1 ? 's' : ''} • {dayData.occupancyPercentage}% occupied
                {dayData.thirdPartyBookings && dayData.thirdPartyBookings.length > 0 && ` • +${dayData.thirdPartyBookings.reduce((sum, booking) => sum + booking.carCount, 0)} third-party`}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors duration-200 touch-manipulation"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {!dayData.orders ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-12 w-12 border-4 border-blue-600 rounded-full border-t-transparent mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading orders...</h3>
              <p className="text-gray-600">Fetching booking details for this date.</p>
            </div>
          ) : dayData.orders.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h6M8 7V3a2 2 0 012-2h6M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2M8 7V3a2 2 0 012-2h6" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings</h3>
              <p className="text-gray-600">No parking reservations for this date.</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Third-Party Bookings Section */}
              {dayData.thirdPartyBookings && dayData.thirdPartyBookings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Third-Party Bookings
                  </h3>
                  
                  {dayData.thirdPartyBookings.map((booking, index) => (
                    <div key={booking.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-purple-900">
                            Third-Party Booking #{index + 1}
                          </h4>
                          <p className="text-sm text-purple-700">External booking source</p>
                        </div>
                        
                        <div className="text-right">
                          <div className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-2a2 2 0 00-2-2H8z" />
                            </svg>
                            {booking.carCount} car{booking.carCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="bg-purple-100 rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-purple-900">Source Website</span>
                          <span className="text-sm text-purple-700">{booking.source}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* WooCommerce Orders Section */}
              {dayData.orders && dayData.orders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    WooCommerce Orders
                  </h3>
                </div>
              )}

              {dayData.orders.map((order, index) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {order.billing.first_name} {order.billing.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">Booking ID: #{order.id}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-2a2 2 0 00-2-2H8z" />
                        </svg>
                        {getTotalCars(order)} car{getTotalCars(order) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {order.billing.email}
                    </div>
                    
                    {order.billing.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {order.billing.phone}
                      </div>
                    )}
                  </div>

                  {/* Line Items */}
                  <div className="space-y-2">
                    {order.line_items.map((item, itemIndex) => (
                      <div key={itemIndex} className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            Duration: {getCruiseDuration(item.name)}
                          </span>
                          
                          {/* Show parking dates if available */}
                          {item.meta_data.find(m => m.key === "_prdd_lite_date") && (
                            <span className="text-gray-600">
                              Start: {moment(item.meta_data.find(m => m.key === "_prdd_lite_date")?.value).format('MMM D')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 touch-manipulation font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}