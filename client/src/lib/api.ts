export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export function getMultipartAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}
