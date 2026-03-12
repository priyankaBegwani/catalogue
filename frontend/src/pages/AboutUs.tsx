import { Heart, Award, Target, Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin, Sparkles, TrendingUp, Shield, CheckCircle } from 'lucide-react';

export function AboutUs() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Brand Introduction */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.05) 35px, rgba(0,0,0,.05) 70px)' }}></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-slate-700">Premium Men's Ethnic Wear</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Where Heritage Meets <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Modern Style</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-700 leading-relaxed max-w-3xl mx-auto">
              IndieCraft blends Indian heritage with contemporary design to create premium ethnic wear for modern men. From Bengal and Assam to across India, we craft pieces that celebrate your culture with confidence and style.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-blue-100 text-primary px-4 py-1 rounded-full text-sm font-medium mb-4">
              Our Story
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">From Passion to Purpose</h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-lg">
              <div className="space-y-4 text-slate-700 leading-relaxed">
                <p>
                  IndieCraft was born in Kolkata from a simple vision: create ethnic wear that modern Indian men actually want to wear. Traditional enough to honor our roots, contemporary enough for today's lifestyle.
                </p>
                <p>
                  Founded by entrepreneurs passionate about Indian textiles, we work with skilled tailors to craft premium kurtas that fit perfectly and feel exceptional. Every piece reflects our commitment to quality, authenticity, and style.
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border-l-4 border-primary">
              <p className="text-slate-700 text-lg font-medium italic">
                "We're helping men rediscover the confidence that comes from wearing something truly well-made—connecting heritage with modern life."
              </p>
              <p className="text-slate-600 mt-4 text-sm">— IndieCraft Founders</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block bg-blue-100 text-primary px-4 py-1 rounded-full text-sm font-medium mb-4">
            Our Mission
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Redefining Men's Ethnic Wear</h2>
          <p className="text-lg text-slate-700 leading-relaxed max-w-3xl mx-auto mb-8">
            We're on a mission to make ethnic wear the first choice for modern Indian men—delivering exceptional craftsmanship, timeless designs, and uncompromising quality that celebrates culture with confidence.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <Target className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 mb-2">Today</h3>
              <p className="text-sm text-slate-600">Premium ethnic wear for everyday confidence</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <TrendingUp className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 mb-2">Tomorrow</h3>
              <p className="text-sm text-slate-600">India's most trusted ethnic wear brand</p>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Values Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-block bg-blue-100 text-primary px-4 py-1 rounded-full text-sm font-medium mb-4">
              Our Values
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">What Drives Us</h2>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Craftsmanship</h3>
              <p className="text-sm text-slate-600">Traditional techniques meet modern precision</p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Authenticity</h3>
              <p className="text-sm text-slate-600">Genuine fabrics, honest practices</p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Quality</h3>
              <p className="text-sm text-slate-600">Premium fabrics, perfect fit, lasting comfort</p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Cultural Pride</h3>
              <p className="text-sm text-slate-600">Celebrating Indian heritage with style</p>
            </div>
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-blue-100 text-primary px-4 py-1 rounded-full text-sm font-medium mb-4">
              Our Journey
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Building IndieCraft</h2>
            <p className="text-slate-600">From a small idea to a growing brand</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 text-center shadow-md">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                1
              </div>
              <h3 className="font-bold text-slate-900 mb-2">The Beginning</h3>
              <p className="text-sm text-slate-600">Founded in Kolkata with a vision to redefine ethnic wear</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-md">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                2
              </div>
              <h3 className="font-bold text-slate-900 mb-2">First Collection</h3>
              <p className="text-sm text-slate-600">Launched premium kurtas loved across Bengal & Assam</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-md">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                3
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Going Digital</h3>
              <p className="text-sm text-slate-600">Online store launch reaching customers nationwide</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-md">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Growing Strong</h3>
              <p className="text-sm text-slate-600">Expanding collection and building trust across India</p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary via-indigo-700 to-purple-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Experience IndieCraft</h2>
          <p className="text-lg text-blue-100 leading-relaxed mb-8 max-w-2xl mx-auto">
            Discover ethnic wear that celebrates your heritage with modern confidence. Quality craftsmanship, authentic designs, perfect fit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/catalogue" className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Shop Now
            </a>
            <a href="#contact" className="bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-800 transition-colors border-2 border-white/30">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Get In Touch</h2>
            <p className="text-slate-600">We're here to help with any questions</p>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            <div className="text-center bg-slate-50 rounded-xl p-6">
              <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 mb-2">Email</h3>
              <p className="text-sm text-slate-600">hello@indiecraft.in</p>
            </div>
            
            <div className="text-center bg-slate-50 rounded-xl p-6">
              <Phone className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 mb-2">Phone</h3>
              <p className="text-sm text-slate-600">+91 98765 43210</p>
            </div>
            
            <div className="text-center bg-slate-50 rounded-xl p-6">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 mb-2">Location</h3>
              <p className="text-sm text-slate-600">Kolkata, West Bengal</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center gap-3">
              <a href="#" className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center text-white hover:bg-pink-700 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center text-white hover:bg-sky-600 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white hover:bg-blue-800 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
