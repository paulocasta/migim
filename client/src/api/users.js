import api from './client';

export const usersApi = {
  list: (role) =>
    api.get('/users', { params: role ? { role } : {} }).then((r) => r.data.users),
  getById: (id) =>
    api.get(`/users/${id}`).then((r) => r.data.user),
  create: (data) =>
    api.post('/users', data).then((r) => r.data.user),
  update: (id, data) =>
    api.put(`/users/${id}`, data).then((r) => r.data.user),
  setActivo: (id, activo) =>
    api.patch(`/users/${id}/activo`, { activo }).then((r) => r.data.user),
};
