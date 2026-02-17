const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadDesignImage(
  file: File,
  designNo: string,
  colorName: string
): Promise<string> {
  // Get upload URL from backend
  const response = await fetch(`${API_URL}/api/storage/upload-url`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      designNo,
      colorName,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get upload URL');
  }

  const { uploadUrl, publicUrl, token, storageType, key } = await response.json();

  // Upload file based on storage type
  if (storageType === 'local') {
    // Local storage requires FormData with file and key
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', key);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Local storage upload error:', errorText);
      throw new Error('Failed to upload file to local storage');
    }

    const result = await uploadResponse.json();
    return result.publicUrl;
  } else if (storageType === 'supabase' && token) {
    // Supabase requires token in URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Supabase upload error:', errorText);
      throw new Error('Failed to upload file to Supabase storage');
    }
  } else {
    // CDN (Wasabi) upload
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('CDN upload error:', errorText);
      throw new Error('Failed to upload file to CDN storage');
    }
  }

  return publicUrl;
}

export async function deleteDesignImage(imageUrl: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/storage/delete`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete image');
  }
}
