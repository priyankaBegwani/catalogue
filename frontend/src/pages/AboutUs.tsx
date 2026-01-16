import { Heart, Award, Users, Target, Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';

export function AboutUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              About Indie Craft
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Where traditional craftsmanship meets contemporary design. We are dedicated to bringing you 
              exquisite, handcrafted pieces that tell stories of heritage, artistry, and passion.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 to-transparent"></div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  Founded in 2020, Indie Craft began as a small workshop with a big dream: to preserve 
                  traditional craftsmanship while embracing modern design sensibilities. Our journey started 
                  with just three artisans and a shared passion for creating beautiful, meaningful pieces.
                </p>
                <p>
                  Today, we've grown into a collective of over 50 skilled artisans, designers, and 
                  craftspeople, each bringing their unique expertise and cultural heritage to every 
                  piece we create. From hand-woven textiles to intricately carved woodwork, our 
                  collection celebrates the diversity of traditional crafts.
                </p>
                <p>
                  We believe that every piece should have a story to tell. That's why we work closely 
                  with our artisans, ensuring that their techniques, traditions, and cultural narratives 
                  are preserved and celebrated in every creation.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl overflow-hidden shadow-2xl">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center p-8">
                    <Heart className="w-24 h-24 text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Crafted with Love</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Our Values</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              The principles that guide everything we do, from sourcing materials to customer service.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Artisan First</h3>
              <p className="text-slate-600">
                We prioritize our artisans' welfare, ensuring fair wages, safe working conditions, 
                and recognition for their incredible skills.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Quality Excellence</h3>
              <p className="text-slate-600">
                Every piece undergoes rigorous quality checks to ensure it meets our exacting 
                standards of craftsmanship and durability.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Community Focus</h3>
              <p className="text-slate-600">
                We believe in building sustainable communities by supporting local artisans and 
                preserving traditional craft techniques.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Sustainability</h3>
              <p className="text-slate-600">
                We're committed to environmentally responsible practices, from sustainable material 
                sourcing to eco-friendly packaging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Artisans</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-blue-100">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">25+</div>
              <div className="text-blue-100">Craft Traditions</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15+</div>
              <div className="text-blue-100">Countries Served</div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Meet Our Team</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              The passionate individuals behind Indie Craft, dedicated to bringing you the best in 
              traditional craftsmanship.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  JD
                </div>
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">Jane Doe</h3>
                <p className="text-slate-600 mb-3">Founder & Creative Director</p>
                <p className="text-slate-500 text-sm">
                  With over 15 years in design and craftsmanship, Jane leads our creative vision 
                  and ensures every piece meets our exacting standards.
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="aspect-square bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  RS
                </div>
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">Raj Singh</h3>
                <p className="text-slate-600 mb-3">Master Artisan</p>
                <p className="text-slate-500 text-sm">
                  A third-generation craftsman, Raj brings traditional techniques and contemporary 
                  design sensibilities to every creation.
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="aspect-square bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  AC
                </div>
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">Alice Chen</h3>
                <p className="text-slate-600 mb-3">Operations Manager</p>
                <p className="text-slate-500 text-sm">
                  Alice ensures smooth operations from artisan workshops to your doorstep, maintaining 
                  our commitment to quality and timely delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Get In Touch</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              We'd love to hear from you. Whether you have questions, feedback, or want to 
              collaborate, we're here to help.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Email</h3>
              <p className="text-slate-600">hello@indiecraft.com</p>
              <p className="text-slate-600">support@indiecraft.com</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Phone</h3>
              <p className="text-slate-600">+91 98765 43210</p>
              <p className="text-slate-600">Mon-Sat: 9AM-6PM</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Visit Us</h3>
              <p className="text-slate-600">123 Craft Street</p>
              <p className="text-slate-600">Mumbai, Maharashtra 400001</p>
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Follow Us</h3>
            <div className="flex justify-center gap-4">
              <a href="#" className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform">
                <Facebook className="w-6 h-6" />
              </a>
              <a href="#" className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="#" className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="#" className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform">
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
