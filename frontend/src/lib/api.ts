import { API_URL } from '../config/backend';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'retailer' | 'guest';
  party_id?: string | null;
  parties?: {
    id?: string;
    party_id?: string;
    name: string | null;
  } | null;
  is_active: boolean;
  can_order_individual_sizes?: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface LoginHistory {
  id: string;
  user_id: string;
  login_time: string;
  logout_time?: string | null;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failed';
  user: {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'retailer' | 'guest';
  };
}

export interface DesignCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesignStyle {
  id: string;
  category_id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FabricType {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Design {
  id: string;
  design_no: string;
  name: string;
  description: string;
  category_id: string | null;
  style_id: string | null;
  fabric_type_id: string | null;
  brand_id?: string | null;
  available_sizes: string[];
  whatsapp_image_url?: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  design_colors?: DesignColor[];
  category?: DesignCategory;
  style?: DesignStyle;
  fabric_type?: FabricType;
  brand?: Brand;
  order_count?: number;
  last_ordered_at?: string;
  total_quantity_sold?: number;
  is_ready_to_ship?: boolean;
  views?: number;
}

export interface DesignColor {
  id: string;
  design_id: string;
  color_name: string;
  color_code: string | null;
  in_stock: boolean;
  stock_quantity: number;
  size_quantities?: {
    S: number;
    M: number;
    L: number;
    XL: number;
    XXL: number;
    XXXL: number;
  };
  image_urls: string[];
  video_urls?: string[];
  created_at: string;
  updated_at: string;
}

export interface SizeSet {
  id: string;
  name: string;
  sizes: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  design_id: string;
  color_id: string;
  size: string;
  size_set_id: string | null;
  is_set_order: boolean;
  quantity: number;
  created_at: string;
  updated_at: string;
  design: Design;
  color: DesignColor;
  size_set?: SizeSet;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  design_id: string;
  created_at: string;
  design: Design;
}

export interface Party {
  id: string;
  party_id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  phone_number: string;
  email_id: string;
  gst_number: string;
  grade: string;
  preferred_transport_1?: string;
  preferred_transport_2?: string;
  default_discount?: string;
  created_at: string;
  updated_at?: string;
  user_profiles?: UserProfile | null;
}

export interface ImportPartyData {
  name: string;
  description: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  phone_number: string;
  email_id: string;
  gst_number: string;
  grade: string;
  rowNumber: number;
}

export interface PartyPhoneNumber {
  id?: string;
  party_id?: string;
  phone_number: string;
  contact_name: string;
  designation: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ImportTransportData {
  transport_name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  district: string;
  pincode: string;
  phone_number: string;
  email_id: string;
  gst_number: string;
  rowNumber: number;
}

export interface PartiesResponse {
  parties: Party[];
}

export interface Transport {
  id: string;
  transport_name: string;
  description: string;
  address: string;
  phone_number: string;
  email_id: string;
  gst_number: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  created_at: string;
  updated_at: string;
}

export interface TransportListResponse {
  transportOptions: Transport[];
}

export interface OrderItem {
  id: string;
  design_number: string;
  color: string;
  sizes_quantities: { size: string; quantity: number }[];
  is_from_size_set?: boolean;
  size_set_name?: string | null;
}

export interface OrderRemark {
  id: string;
  remark: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  party_name: string;
  date_of_order: string;
  expected_delivery_date: string | null;
  transport: string;
  remarks: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
  order_remarks?: OrderRemark[];
}

export interface OrdersResponse {
  orders: Order[];
}

export interface CreateOrderData {
  party_name: string;
  date_of_order: string;
  expected_delivery_date?: string;
  transport: string;
  remarks: string;
  status: string;
  order_items: Array<{
    design_number: string;
    color: string;
    sizes_quantities: { size: string; quantity: number }[];
  }>;
  order_remarks: string[];
}


class ApiClient {
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    if (!token) return {};
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Central fetch wrapper — handles auth headers, JSON parsing, and error extraction.
   * All API methods should use this instead of raw fetch.
   */
  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      auth?: boolean;
      errorMsg?: string;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, auth = true, errorMsg = 'Request failed' } = options;

    const headers: Record<string, string> = {};
    if (auth) Object.assign(headers, this.getAuthHeader());
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      let serverError: string | undefined;
      try {
        const errData = await response.json();
        serverError = errData.error;
      } catch { /* non-JSON error body */ }
      throw new Error(serverError || errorMsg);
    }

    // Some DELETE endpoints return no body (204)
    const text = await response.text();
    return text ? JSON.parse(text) : (undefined as unknown as T);
  }

  /*   User Related Functions */
  
  async login(credentials: LoginCredentials) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    return data;
  }

  async logout() {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Logout failed');
    }

    return await response.json();
  }

  async forgotPassword(email: string) {
    return this.request('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false, errorMsg: 'Failed to send reset email' });
  }

  async resetPassword(access_token: string, password: string) {
    return this.request('/api/auth/reset-password', { method: 'POST', body: { access_token, password }, auth: false, errorMsg: 'Failed to reset password' });
  }

  async verifyResetToken(access_token: string) {
    return this.request('/api/auth/verify-reset-token', { method: 'POST', body: { access_token }, auth: false, errorMsg: 'Invalid or expired token' });
  }

  async getCurrentUser() {
    return this.request('/api/auth/me', { errorMsg: 'Failed to get user' });
  }

  // Alias for getCurrentUser - used in profile page
  async getProfile(): Promise<UserProfile> {
    const response: any = await this.getCurrentUser();
    return response.profile;
  }

  async getUsers(): Promise<UserProfile[]> {
    return this.request('/api/users', { errorMsg: 'Failed to fetch users' });
  }

  async createUser(userData: {
    email: string;
    password: string;
    full_name: string;
    role: 'admin' | 'retailer' | 'guest';
    party_id?: string;
  }): Promise<UserProfile> {
    return this.request('/api/users', { method: 'POST', body: userData, errorMsg: 'Failed to create user' });
  }

  async updateUser(
    id: string,
    updates: { full_name?: string; is_active?: boolean; party_id?: string; can_order_individual_sizes?: boolean }
  ): Promise<UserProfile> {
    return this.request(`/api/users/${id}`, { method: 'PATCH', body: updates, errorMsg: 'Failed to update user' });
  }

  async getLoginHistory(limit: number = 50): Promise<LoginHistory[]> {
    return this.request(`/api/users/login-history?limit=${limit}`, { errorMsg: 'Failed to fetch login history' });
  }

  async getInactiveUsers(days: number = 30): Promise<UserProfile[]> {
    return this.request(`/api/users/inactive?days=${days}`, { errorMsg: 'Failed to fetch inactive users' });
  }

  async deleteUser(id: string): Promise<void> {
    return this.request(`/api/users/${id}`, { method: 'DELETE', errorMsg: 'Failed to delete user' });
  }



  /* Designs related Functions */

  async getDesignCategories(): Promise<DesignCategory[]> {
    return this.request('/api/designs/categories', { errorMsg: 'Failed to fetch design categories' });
  }

  async getDesignStyles(categoryId?: string): Promise<DesignStyle[]> {
    const qs = categoryId ? `?category_id=${categoryId}` : '';
    return this.request(`/api/designs/styles${qs}`, { errorMsg: 'Failed to fetch design styles' });
  }

  async getFabricTypes(): Promise<FabricType[]> {
    return this.request('/api/designs/fabric-types', { errorMsg: 'Failed to fetch fabric types' });
  }

  async getBrands(): Promise<Brand[]> {
    return this.request('/api/brands', { errorMsg: 'Failed to fetch brands' });
  }

  async createBrand(brand: Partial<Brand>): Promise<Brand> {
    return this.request('/api/brands', { method: 'POST', body: brand, errorMsg: 'Failed to create brand' });
  }

  async updateBrand(id: string, brand: Partial<Brand>): Promise<Brand> {
    return this.request(`/api/brands/${id}`, { method: 'PUT', body: brand, errorMsg: 'Failed to update brand' });
  }

  async deleteBrand(id: string): Promise<void> {
    return this.request(`/api/brands/${id}`, { method: 'DELETE', errorMsg: 'Failed to delete brand' });
  }

  async getDesigns(categoryId?: string, fabricTypeId?: string, brandId?: string, styleId?: string, activeOnly?: boolean): Promise<Design[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (fabricTypeId) params.append('fabric_type_id', fabricTypeId);
    if (brandId) params.append('brand_id', brandId);
    if (styleId) params.append('style_id', styleId);
    if (activeOnly) params.append('active_only', 'true');
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/api/designs${qs}`, { errorMsg: 'Failed to fetch designs' });
  }

  async getDesign(id: string): Promise<Design> {
    return this.request(`/api/designs/${id}`, { errorMsg: 'Failed to fetch design' });
  }


  
  async createDesign(designData: {
    design_no: string;
    name: string;
    description?: string;
    category_id?: string;
    style_id?: string;
    fabric_type_id?: string;
    available_sizes?: string[];
    colors?: Array<{
      color_name: string;
      color_code?: string;
      price?: number;
      in_stock?: boolean;
      stock_quantity?: number;
      size_quantities?: {
        S: number;
        M: number;
        L: number;
        XL: number;
        XXL: number;
        XXXL: number;
      };
      image_urls?: string[];
    }>;
  }): Promise<Design> {
    return this.request('/api/designs', { method: 'POST', body: designData, errorMsg: 'Failed to create design' });
  }


  
  async updateDesign(
    id: string,
    updates: {
      design_no?: string;
      name?: string;
      description?: string;
      category_id?: string;
      style_id?: string;
      fabric_type_id?: string;
      brand_id?: string;
      available_sizes?: string[];
      whatsapp_image_url?: string;
      price?: number;
      is_active?: boolean;
    }
  ): Promise<Design> {
    return this.request(`/api/designs/${id}`, { method: 'PUT', body: updates, errorMsg: 'Failed to update design' });
  }


  
  async searchDesigns(query: string): Promise<Design[]> {
    if (!query || query.trim().length === 0) return [];
    return this.request(`/api/designs/search?q=${encodeURIComponent(query)}`, { errorMsg: 'Failed to search designs' });
  }

  async deleteDesign(id: string): Promise<void> {
    return this.request(`/api/designs/${id}`, { method: 'DELETE', errorMsg: 'Failed to delete design' });
  }


  async addDesignColor(
    designId: string,
    colorData: {
      color_name: string;
      color_code?: string;
      price?: number;
      in_stock?: boolean;
      stock_quantity?: number;
      size_quantities?: {
        S: number;
        M: number;
        L: number;
        XL: number;
        XXL: number;
        XXXL: number;
      };
      image_urls?: string[];
    }
  ): Promise<DesignColor> {
    return this.request(`/api/designs/${designId}/colors`, { method: 'POST', body: colorData, errorMsg: 'Failed to add color' });
  }

  async updateDesignColor(
    colorId: string,
    updates: {
      color_name?: string;
      color_code?: string;
      price?: number;
      in_stock?: boolean;
      stock_quantity?: number;
      size_quantities?: {
        S: number;
        M: number;
        L: number;
        XL: number;
        XXL: number;
        XXXL: number;
      };
      image_urls?: string[];
    }
  ): Promise<DesignColor> {
    return this.request(`/api/designs/colors/${colorId}`, { method: 'PUT', body: updates, errorMsg: 'Failed to update color' });
  }

  async deleteDesignColor(colorId: string): Promise<void> {
    return this.request(`/api/designs/colors/${colorId}`, { method: 'DELETE', errorMsg: 'Failed to delete color' });
  }




  /* Cart Related Functions */

  async getCart(): Promise<CartItem[]> {
    return this.request('/api/cart', { errorMsg: 'Failed to fetch cart' });
  }

  async getSizeSets(): Promise<SizeSet[]> {
    return this.request('/api/cart/size-sets', { errorMsg: 'Failed to fetch size sets' });
  }

  async addToCart(cartData: {
    design_id: string;
    color_id: string;
    size?: string;
    size_set_id?: string;
    quantity?: number;
  }): Promise<CartItem> {
    return this.request('/api/cart', { method: 'POST', body: cartData, errorMsg: 'Failed to add to cart' });
  }

  async updateCartItem(itemId: string, quantity: number): Promise<CartItem> {
    return this.request(`/api/cart/${itemId}`, { method: 'PUT', body: { quantity }, errorMsg: 'Failed to update cart item' });
  }

  async removeFromCart(itemId: string): Promise<void> {
    return this.request(`/api/cart/${itemId}`, { method: 'DELETE', errorMsg: 'Failed to remove from cart' });
  }

  async clearCart(): Promise<void> {
    return this.request('/api/cart', { method: 'DELETE', errorMsg: 'Failed to clear cart' });
  }

  async checkout(checkoutData: {
    party_name: string;
    expected_delivery_date?: string;
    transport?: string;
    remarks?: string;
    discount_tier?: string;
    discount_percentage?: number;
  }): Promise<any> {
    return this.request('/api/orders/checkout', { method: 'POST', body: checkoutData, errorMsg: 'Failed to checkout' });
  }

  async getTransportOptions(): Promise<any[]> {
    const data: any = await this.request('/api/transport', { errorMsg: 'Failed to fetch transport options' });
    return data.transportOptions || [];
  }

  /* WishList related Items */
  async getWishlist(): Promise<WishlistItem[]> {
    return this.request('/api/wishlist', { errorMsg: 'Failed to fetch wishlist' });
  }

  async addToWishlist(designId: string): Promise<WishlistItem> {
    return this.request('/api/wishlist', { method: 'POST', body: { design_id: designId }, errorMsg: 'Failed to add to wishlist' });
  }

  async removeFromWishlist(designId: string): Promise<void> {
    return this.request(`/api/wishlist/${designId}`, { method: 'DELETE', errorMsg: 'Failed to remove from wishlist' });
  }


/* party Related functions*/

  async fetchParties(): Promise<PartiesResponse> {
    return this.request('/api/parties', { errorMsg: 'Failed to fetch parties' });
  }

  async getPartyById(id: string): Promise<Party> {
    const data: any = await this.request(`/api/parties/${id}`, { errorMsg: 'Failed to fetch party details' });
    return data.party;
  }

  async getOrderById(id: string): Promise<Order> {
    return this.request(`/api/orders/${id}`, { errorMsg: 'Failed to fetch order details' });
  }

  async updateParty(id: string, data: Partial<Party>): Promise<Party> {
    return this.request(`/api/parties/${id}`, { method: 'PUT', body: data, errorMsg: 'Failed to update party' });
  }

  async deleteParty(id: string): Promise<void> {
    return this.request(`/api/parties/${id}`, { method: 'DELETE', errorMsg: 'Failed to delete party' });
  }

  
  async createOrEditParty(formData: {
     name: string,
    description: string,
    address: string,
    city: string,
    state: string,
    pincode: string,
    phone_number: string,
    gst_number: string,
    volume_tier_id?: string,
    relationship_tier_id?: string,
    hybrid_auto_tier_id?: string,
    hybrid_manual_override?: boolean,
    hybrid_override_tier_id?: string,
    monthly_order_count?: number
  }, editingParty: Party | null): Promise<Party> {
    const path = editingParty ? `/api/parties/${editingParty.id}` : '/api/parties';
    const method = editingParty ? 'PUT' : 'POST';
    return this.request(path, { method, body: formData, errorMsg: `Failed to ${editingParty ? 'update' : 'create'} party` });
  }


  async importParties(validRows: ImportPartyData[]) {
    let successCount = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      try {
        await this.request('/api/parties', {
          method: 'POST',
          body: { name: row.name, description: row.description, address: row.address, city: row.city, state: row.state, pincode: row.pincode, phone_number: row.phone_number, gst_number: row.gst_number },
          errorMsg: 'Failed to create party'
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Row ${row.rowNumber}: ${err.message || 'Network error'}`);
      }
    }

    return { successCount, errors };
  }

  async fetchPartyPhoneNumbers(partyId: string): Promise<{ phoneNumbers: PartyPhoneNumber[] }> {
    return this.request(`/api/party-phone-numbers/${partyId}`, { errorMsg: 'Failed to fetch phone numbers' });
  }

  async savePartyPhoneNumbers(partyId: string, phoneNumbers: PartyPhoneNumber[]): Promise<void> {
    return this.request(`/api/party-phone-numbers/${partyId}`, { 
      method: 'POST', 
      body: { phoneNumbers }, 
      errorMsg: 'Failed to save phone numbers' 
    });
  }

  async importTransports(validRows: ImportTransportData[]) {
    let successCount = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      try {
        await this.request('/api/transport', {
          method: 'POST',
          body: { transport_name: row.transport_name, description: row.description, address: row.address, city: row.city, state: row.state, district: row.district, pincode: row.pincode, phone_number: row.phone_number, email_id: row.email_id, gst_number: row.gst_number },
          errorMsg: 'Failed to create transport'
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Row ${row.rowNumber}: ${err.message || 'Network error'}`);
      }
    }

    return { successCount, errors };
  }


  /* Transport related functions */

  async fetchTransports(): Promise<TransportListResponse> {
    return this.request('/api/transport', { errorMsg: 'Failed to fetch transports' });
  }

  async deleteTransport(id: string): Promise<void> {
    return this.request(`/api/transport/${id}`, { method: 'DELETE', errorMsg: 'Failed to delete transport' });
  }

  async createOrEditTransport(formData: {
     transport_name: string,
    description: string,
    address: string,
    phone_number: string,
    email_id: string,
    gst_number: string,
    state: string,
    district: string,
    city: string,
    pincode: string
  }, editingTransport: Transport | null): Promise<{ message: string; transport: Transport }> {
    const path = editingTransport ? `/api/transport/${editingTransport.id}` : '/api/transport';
    const method = editingTransport ? 'PUT' : 'POST';
    return this.request(path, { method, body: formData, errorMsg: `Failed to ${editingTransport ? 'update' : 'create'} transport option` });
  }


  /* Location related functions */

  async fetchStates(): Promise<{ states: string[] }> {
    return this.request('/api/locations/states', { errorMsg: 'Failed to fetch states' });
  }

  async fetchDistricts(state: string): Promise<{ districts: string[] }> {
    return this.request(`/api/locations/districts?state=${encodeURIComponent(state)}`, { errorMsg: 'Failed to fetch districts' });
  }

  async fetchCities(district: string): Promise<{ cities: Array<{ city_name: string; zipcode: string; is_major_city: boolean }> }> {
    return this.request(`/api/locations/cities?district=${encodeURIComponent(district)}`, { errorMsg: 'Failed to fetch cities' });
  }

  async fetchLocationByPincode(pincode: string): Promise<{ found: boolean; state?: string; district?: string; city?: string; pincode?: string; message?: string }> {
    return this.request(`/api/locations/pincode/${encodeURIComponent(pincode)}`, { errorMsg: 'Failed to fetch location by pincode' });
  }


/* Orders related function */
  async fetchOrders(): Promise<OrdersResponse> {
    return this.request('/api/orders', { errorMsg: 'Failed to fetch orders' });
  }

  async createOrder(orderData: CreateOrderData): Promise<Order> {
    return this.request('/api/orders', { method: 'POST', body: orderData, errorMsg: 'Failed to create order' });
  }

  async updateOrder(id: string, orderData: CreateOrderData): Promise<Order> {
    return this.request(`/api/orders/${id}`, { method: 'PUT', body: orderData, errorMsg: 'Failed to update order' });
  }

  async deleteOrder(id: string): Promise<void> {
    return this.request(`/api/orders/${id}`, { method: 'DELETE', errorMsg: 'Failed to delete order' });
  }

  async deleteOrderItem(orderId: string, itemId: string): Promise<void> {
    return this.request(`/api/orders/${orderId}/items/${itemId}`, { method: 'DELETE', errorMsg: 'Failed to delete order item' });
  }

  async updateOrderItemSizes(orderId: string, itemId: string, sizesQuantities: { size: string; quantity: number }[]): Promise<void> {
    return this.request(`/api/orders/${orderId}/items/${itemId}`, { method: 'PATCH', body: { sizes_quantities: sizesQuantities }, errorMsg: 'Failed to update order item' });
  }

  async addItemsToOrder(orderId: string, items: { design_number: string; color: string; sizes_quantities: { size: string; quantity: number }[] }[]): Promise<{ items: OrderItem[] }> {
    return this.request(`/api/orders/${orderId}/items`, { method: 'POST', body: { items }, errorMsg: 'Failed to add items to order' });
  }

  async completeOrder(order: Order): Promise<Order> {
    const orderData: CreateOrderData = {
      party_name: order.party_name,
      date_of_order: order.date_of_order,
      expected_delivery_date: order.expected_delivery_date || undefined,
      transport: order.transport,
      remarks: order.remarks,
      status: 'completed',
      order_items: order.order_items.map(item => ({
        design_number: item.design_number,
        color: item.color,
        sizes_quantities: item.sizes_quantities
      })),
      order_remarks: order.order_remarks?.map(r => r.remark) || []
    };

    return await this.updateOrder(order.id, orderData);
  }

  async getDashboardKpis(): Promise<any> {
    return this.request('/api/admin/kpis', { errorMsg: 'Failed to fetch KPIs' });
  }

  async getTopViewedDesigns(): Promise<any[]> {
    return this.request('/api/admin/designs/top-viewed', { errorMsg: 'Failed to fetch top viewed designs' });
  }

  async getTopOrderedDesigns(): Promise<any[]> {
    return this.request('/api/admin/designs/top-ordered', { errorMsg: 'Failed to fetch top ordered designs' });
  }

  async getMostSharedDesigns(): Promise<any[]> {
    return this.request('/api/admin/designs/most-shared', { errorMsg: 'Failed to fetch most shared designs' });
  }

  async getActiveParties(): Promise<any[]> {
    return this.request('/api/admin/parties/active', { errorMsg: 'Failed to fetch active parties' });
  }

  async getStagnantParties(): Promise<any[]> {
    return this.request('/api/admin/parties/stagnant', { errorMsg: 'Failed to fetch stagnant parties' });
  }

  async getColorTrends(): Promise<any[]> {
    return this.request('/api/admin/trends/colors', { errorMsg: 'Failed to fetch color trends' });
  }

  async getWhatsAppEngagement(): Promise<any> {
    return this.request('/api/admin/engagement/whatsapp', { errorMsg: 'Failed to fetch WhatsApp engagement' });
  }

  async getDashboardAlerts(): Promise<any[]> {
    return this.request('/api/admin/alerts', { errorMsg: 'Failed to fetch alerts' });
  }

}

export const api = new ApiClient();
