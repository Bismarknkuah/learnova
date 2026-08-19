/** Single source of truth for API routes, consumed by both web and mobile clients. */
export const API_VERSION = 'v1';

export const endpoints = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  tutors: {
    list: (qs = '') => `/tutors${qs ? `?${qs}` : ''}`,
    byId: (id: string) => `/tutors/${id}`,
    create: '/tutors',
  },
  bookings: {
    list: '/bookings',
    create: '/bookings',
  },
  ai: {
    ask: '/ai/ask',
    trainTwin: '/ai/twin/lessons',
  },
  payments: { balance: '/payments/balance' },
  assignments: { base: '/assignments' },
  certificates: { verify: (code: string) => `/certificates/verify/${code}` },
  notifications: { base: '/notifications' },
  classrooms: {
    list: '/classrooms',
    create: '/classrooms',
    join: (id: string) => `/classrooms/${id}/join`,
    record: (id: string) => `/classrooms/${id}/record`,
    end: (id: string) => `/classrooms/${id}/end`,
    replay: (id: string) => `/classrooms/${id}/replay`,
    bookmarks: (id: string) => `/classrooms/${id}/bookmarks`,
  },
  adaptive: {
    mastery: '/adaptive/mastery',
    recommendations: '/adaptive/recommendations',
    observe: '/adaptive/observe',
  },
  exams: { list: '/exams', create: '/exams', start: (id: string) => `/exams/${id}/start`, submit: '/exams/submit' },
  schools: { create: '/schools', campuses: '/schools/campuses', roster: '/schools/roster', stats: '/schools/stats' },
  users: { me: '/users/me', children: '/users/children' },
} as const;
