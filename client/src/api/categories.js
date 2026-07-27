import api from './client';

export const categoriesApi = {
  list: () => api.get('/categories').then((r) => r.data.categories),
  create: (data) => api.post('/categories', data).then((r) => r.data.category),
  update: (id, data) => api.put(`/categories/${id}`, data).then((r) => r.data.category),
  remove: (id) => api.delete(`/categories/${id}`),
};
