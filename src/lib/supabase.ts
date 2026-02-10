// Stub file - Application uses MongoDB via backend API, not Supabase
// Keeping this file to maintain backward compatibility with existing component imports
// These imports should be gradually removed and replaced with API calls

export const supabase = {
  channel: () => ({
    on: () => ({
      subscribe: () => ({
        unsubscribe: () => {}
      })
    })
  }),
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () => Promise.resolve({ data: null, error: null })
      }),
      order: () => ({
        limit: () => Promise.resolve({ data: null, error: null })
      })
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: null })
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null })
    })
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      download: () => Promise.resolve(new Blob()),
      remove: () => Promise.resolve({ data: null, error: null })
    })
  },
  auth: {
    admin: {
      createUser: () => Promise.resolve({ data: { user: null }, error: null })
    }
  }
};
