import { Phone, Mail, MapPin, Clock, Headphones, MessageCircle } from 'lucide-react';

export function ContactUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We'd love to hear from you. Get in touch with us for any queries or support.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=1000&fit=crop"
                alt="Traditional Kurta Collection"
                className="w-full h-[600px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <h3 className="text-3xl font-bold mb-2">Indie Craft</h3>
                <p className="text-lg text-gray-200">
                  Premium Quality Kurtas & Traditional Wear
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Contact Information */}
          <div className="space-y-6">
            {/* Contact Cards */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Our Address</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Indie Craft Textiles<br />
                    123, Textile Market Road<br />
                    Gandhi Nagar, Ahmedabad<br />
                    Gujarat - 380001, India
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Phone Numbers</h3>
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-800">Main Office:</span>{' '}
                      <a href="tel:+919876543210" className="text-blue-600 hover:text-blue-700 hover:underline">
                        +91 98765 43210
                      </a>
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-800">Sales:</span>{' '}
                      <a href="tel:+919876543211" className="text-blue-600 hover:text-blue-700 hover:underline">
                        +91 98765 43211
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Headphones className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Customer Care</h3>
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-800">Toll Free:</span>{' '}
                      <a href="tel:18001234567" className="text-blue-600 hover:text-blue-700 hover:underline">
                        1800 123 4567
                      </a>
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-800">WhatsApp:</span>{' '}
                      <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline">
                        +91 98765 43210
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Email Us</h3>
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-800">General Inquiries:</span><br />
                      <a href="mailto:info@indiecraft.com" className="text-blue-600 hover:text-blue-700 hover:underline">
                        info@indiecraft.com
                      </a>
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-800">Support:</span><br />
                      <a href="mailto:support@indiecraft.com" className="text-blue-600 hover:text-blue-700 hover:underline">
                        support@indiecraft.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Business Hours</h3>
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-800">Monday - Saturday:</span><br />
                      10:00 AM - 7:00 PM
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-800">Sunday:</span><br />
                      11:00 AM - 5:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Message Section */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Need Immediate Assistance?</h3>
                  <p className="text-blue-100 mb-4">
                    Our customer support team is available to help you with any questions or concerns.
                  </p>
                  <a
                    href="https://wa.me/919876543210"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chat on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
