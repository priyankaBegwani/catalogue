import { API_URL } from '../config/backend';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadDesignImage(
  file: File,
  designNo: string,
  colorName: string
): Promise<string> {
  // Direct upload to backend - backend handles storage
  const formData = new FormData();
  formData.append('file', file);
  formData.append('designNo', designNo);
  formData.append('colorName', colorName);

  const response = await fetch(`${API_URL}/api/storage/upload`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Failed to upload image');
  }

  const { publicUrl } = await response.json();
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
