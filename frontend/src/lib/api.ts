const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

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
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Design {
  id: string;
  design_no: string;
  name: string;
  description: string;
  category_id: string | null;
  style_id: string | null;
  fabric_type_id: string | null;
  available_sizes: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  design_colors?: DesignColor[];
  category?: DesignCategory;
  style?: DesignStyle;
  fabric_type?: FabricType;
  order_count?: number;
  last_ordered_at?: string;
  total_quantity_sold?: number;
  is_ready_to_ship?: boolean;
}

export interface DesignColor {
  id: string;
  design_id: string;
  color_name: string;
  color_code: string | null;
  price: number;
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
  state: string;
  pincode: string;
  phone_number: string;
  gst_number: string;
  created_at: string;
  updated_at?: string;
  user_profiles?: UserProfile | null;
  // Pricing tier fields
  volume_tier_id?: string;
  relationship_tier_id?: string;
  hybrid_auto_tier_id?: string;
  hybrid_manual_override?: boolean;
  hybrid_override_tier_id?: string;
  monthly_order_count?: number;
  tier_last_updated?: string;
}

export interface ImportPartyData {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone_number: string;
  gst_number: string;
  rowNumber: number;
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
  gst_number: string;
  rowNumber: number;
}

export interface PartiesResponse {
  parties: Party[];
}


export interface Transport {
  id: number;
  transport_name: string;
  description: string;
  address: string;
  phone_number: string;
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
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send reset email');
    }

    return await response.json();
  }

  async resetPassword(access_token: string, password: string) {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }

    return await response.json();
  }

  async verifyResetToken(access_token: string) {
    const response = await fetch(`${API_URL}/api/auth/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid or expired token');
    }

    return await response.json();
  }

  async getCurrentUser() {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get user');
    }
    return await response.json();
  }

  // Alias for getCurrentUser - used in profile page
  async getProfile(): Promise<UserProfile> {
    const response = await this.getCurrentUser();
    return response.profile;
  }

  async getUsers(): Promise<UserProfile[]> {
    const response = await fetch(`${API_URL}/api/users`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }

    return await response.json();
  }

  async createUser(userData: {
    email: string;
    password: string;
    full_name: string;
    role: 'admin' | 'retailer' | 'guest';
    party_id?: string;
  }): Promise<UserProfile> {
    const response = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }

    return await response.json();
  }

  async updateUser(
    id: string,
    updates: { full_name?: string; is_active?: boolean; party_id?: string }
  ): Promise<UserProfile> {
    const response = await fetch(`${API_URL}/api/users/${id}`, {
      method: 'PATCH',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }

    return await response.json();
  }

  async getLoginHistory(limit: number = 50): Promise<LoginHistory[]> {
    const response = await fetch(`${API_URL}/api/users/login-history?limit=${limit}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch login history');
    }

    return await response.json();
  }

  async getInactiveUsers(days: number = 30): Promise<UserProfile[]> {
    const response = await fetch(`${API_URL}/api/users/inactive?days=${days}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch inactive users');
    }

    return await response.json();
  }

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/users/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }
  }



  /* Designs related Functions */

  async getDesignCategories(): Promise<DesignCategory[]> {
    const response = await fetch(`${API_URL}/api/designs/categories`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch design categories');
    }

    return await response.json();
  }

  async getDesignStyles(categoryId?: string): Promise<DesignStyle[]> {
    const url = categoryId
      ? `${API_URL}/api/designs/styles?category_id=${categoryId}`
      : `${API_URL}/api/designs/styles`;

    const response = await fetch(url, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch design styles');
    }

    return await response.json();
  }

  async getFabricTypes(): Promise<FabricType[]> {
    const response = await fetch(`${API_URL}/api/designs/fabric-types`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch fabric types');
    }

    return await response.json();
  }

  async getDesigns(categoryId?: string, fabricTypeId?: string, activeOnly?: boolean): Promise<Design[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (fabricTypeId) params.append('fabric_type_id', fabricTypeId);
    if (activeOnly) params.append('active_only', 'true');
    
    const url = params.toString() 
      ? `${API_URL}/api/designs?${params.toString()}`
      : `${API_URL}/api/designs`;

    const response = await fetch(url, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch designs');
    }

    return await response.json();
  }


  
  async getDesign(id: string): Promise<Design> {
    const response = await fetch(`${API_URL}/api/designs/${id}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch design');
    }

    return await response.json();
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
    const response = await fetch(`${API_URL}/api/designs`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(designData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create design');
    }

    return await response.json();
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
      available_sizes?: string[];
      is_active?: boolean;
    }
  ): Promise<Design> {
    const response = await fetch(`${API_URL}/api/designs/${id}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update design');
    }

    return await response.json();
  }


  
  async deleteDesign(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/designs/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete design');
    }
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
    const response = await fetch(`${API_URL}/api/designs/${designId}/colors`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(colorData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add color');
    }

    return await response.json();
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
    const response = await fetch(`${API_URL}/api/designs/colors/${colorId}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update color');
    }

    return await response.json();
  }

  async deleteDesignColor(colorId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/designs/colors/${colorId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete color');
    }
  }




  /* Cart Related Functions */

  async getCart(): Promise<CartItem[]> {
    const response = await fetch(`${API_URL}/api/cart`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch cart');
    }

    return await response.json();
  }

  async getSizeSets(): Promise<SizeSet[]> {
    const response = await fetch(`${API_URL}/api/cart/size-sets`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch size sets');
    }

    return await response.json();
  }

  async addToCart(cartData: {
    design_id: string;
    color_id: string;
    size?: string;
    size_set_id?: string;
    quantity?: number;
  }): Promise<CartItem> {
    const response = await fetch(`${API_URL}/api/cart`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cartData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add to cart');
    }

    return await response.json();
  }

  
  async updateCartItem(itemId: string, quantity: number): Promise<CartItem> {
    const response = await fetch(`${API_URL}/api/cart/${itemId}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update cart item');
    }

    return await response.json();
  }

  
  async removeFromCart(itemId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/cart/${itemId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove from cart');
    }
  }

  async clearCart(): Promise<void> {
    const response = await fetch(`${API_URL}/api/cart`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to clear cart');
    }
  }

  async checkout(checkoutData: {
    party_name: string;
    expected_delivery_date?: string;
    transport?: string;
    remarks?: string;
  }): Promise<any> {
    const response = await fetch(`${API_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to checkout');
    }

    return await response.json();
  }

  async getTransportOptions(): Promise<any[]> {
    const response = await fetch(`${API_URL}/api/transport`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch transport options');
    }

    const data = await response.json();
    return data.transportOptions || [];
  }

  /* WishList related Items */
  async getWishlist(): Promise<WishlistItem[]> {
    const response = await fetch(`${API_URL}/api/wishlist`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch wishlist');
    }

    return await response.json();
  }

  async addToWishlist(designId: string): Promise<WishlistItem> {
    const response = await fetch(`${API_URL}/api/wishlist`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ design_id: designId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add to wishlist');
    }

    return await response.json();
  }

  async removeFromWishlist(designId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/wishlist/${designId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove from wishlist');
    }
  }


/* party Related functions*/

  
  async fetchParties(): Promise<PartiesResponse> {
    const url = `${API_URL}/api/parties`;

    const response = await fetch(url, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch parties');
    }

    return await response.json();
  }

  async getPartyById(id: string): Promise<Party> {
    const response = await fetch(`${API_URL}/api/parties/${id}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch party details';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.party;
  }

  async getOrderById(id: string): Promise<Order> {
    const response = await fetch(`${API_URL}/api/orders/${id}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch order details';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  async updateParty(id: string, data: Partial<Party>): Promise<Party> {
    const response = await fetch(`${API_URL}/api/parties/${id}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update party');
    }

    return await response.json();
  }

  async deleteParty(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/parties/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to delete party';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
      }
      throw new Error(errorMessage);
    }
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
      const url = editingParty 
          ? `${API_URL}/api/parties/${editingParty.id}`
          : `${API_URL}/api/parties`;
      
      const method = editingParty ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingParty ? 'update' : 'create'} party`);
      }

    return await response.json();
  }


  async importParties(validRows: ImportPartyData[]) {
     let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of validRows) {
        try {
            const response = await fetch(`${API_URL}/api/parties`, {
            method: 'POST',
            headers: {
              ...this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: row.name,
              description: row.description,
              address: row.address,
              city: row.city,
              state: row.state,
              pincode: row.pincode,
              phone_number: row.phone_number,
              gst_number: row.gst_number
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json();
            errors.push(`Row ${row.rowNumber}: ${errorData.error || 'Failed to create party'}`);
            errorCount++;
          }
           } catch (err) {
          errors.push(`Row ${row.rowNumber}: Network error`);
          errorCount++;
        }
      }

    return {
      successCount: successCount,
      errors: errors
    }

  }

  async importTransports(validRows: ImportTransportData[]) {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      try {
        const response = await fetch(`${API_URL}/api/transport`, {
          method: 'POST',
          headers: {
            ...this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transport_name: row.transport_name,
            description: row.description,
            address: row.address,
            city: row.city,
            state: row.state,
            district: row.district,
            pincode: row.pincode,
            phone_number: row.phone_number,
            gst_number: row.gst_number
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          const errorData = await response.json();
          errors.push(`Row ${row.rowNumber}: ${errorData.error || 'Failed to create transport'}`);
          errorCount++;
        }
      } catch (err) {
        errors.push(`Row ${row.rowNumber}: Network error`);
        errorCount++;
      }
    }

    return {
      successCount: successCount,
      errors: errors
    }
  }


  /* Transport related functions */

  async fetchTransports(): Promise<TransportListResponse> {
    const url = `${API_URL}/api/transport`;

    const response = await fetch(url, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch transports');
    }

    return await response.json();
  }


  async deleteTransport(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/transport/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete transport');
    }
  }

  
  async createOrEditTransport(formData: {
     transport_name: string,
    description: string,
    address: string,
    phone_number: string,
    gst_number: string,
    state: string,
    district: string,
    city: string,
    pincode: string
  }, editingTransport: Transport | null): Promise<{ message: string; transport: Transport }> {
      const url = editingTransport 
          ? `${API_URL}/api/transport/${editingTransport.id}`
          : `${API_URL}/api/transport`;
      
      const method = editingTransport ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingTransport ? 'update' : 'create'} transport option`);
      }

    return await response.json();
  }


  /* Location related functions */

  async fetchStates(): Promise<{ states: string[] }> {
    const response = await fetch(`${API_URL}/api/locations/states`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch states');
    }

    return await response.json();
  }

  async fetchDistricts(state: string): Promise<{ districts: string[] }> {
    const response = await fetch(`${API_URL}/api/locations/districts?state=${encodeURIComponent(state)}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch districts');
    }

    return await response.json();
  }

  async fetchCities(district: string): Promise<{ cities: Array<{ city_name: string; zipcode: string; is_major_city: boolean }> }> {
    const response = await fetch(`${API_URL}/api/locations/cities?district=${encodeURIComponent(district)}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch cities');
    }

    return await response.json();
  }


/* Orders related function */
  async fetchOrders(): Promise<OrdersResponse> {
    const url = `${API_URL}/api/orders`;

    const response = await fetch(url, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch orders');
    }

    return await response.json();
  }

  async createOrder(orderData: CreateOrderData): Promise<Order> {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create order');
    }

    return await response.json();
  }

  async updateOrder(id: string, orderData: CreateOrderData): Promise<Order> {
    const response = await fetch(`${API_URL}/api/orders/${id}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update order');
    }

    return await response.json();
  }

  async deleteOrder(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/orders/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete order');
    }
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

}

export const api = new ApiClient();
