// DEMO MODE: Supabase bypassed — returns a stub client
export async function createClient() {
  const noopQuery: any = {
    select: () => noopQuery,
    insert: () => noopQuery,
    update: () => noopQuery,
    delete: () => noopQuery,
    upsert: () => noopQuery,
    eq: () => noopQuery,
    neq: () => noopQuery,
    in: () => noopQuery,
    not: () => noopQuery,
    is: () => noopQuery,
    gte: () => noopQuery,
    lte: () => noopQuery,
    gt: () => noopQuery,
    lt: () => noopQuery,
    ilike: () => noopQuery,
    like: () => noopQuery,
    contains: () => noopQuery,
    order: () => noopQuery,
    limit: () => noopQuery,
    range: () => noopQuery,
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (v: { data: any[]; error: null }) => any) =>
      Promise.resolve(resolve({ data: [], error: null })),
  }

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: { message: 'Demo mode' } }),
      signOut: async () => ({ error: null }),
    },
    from: (_table: string) => noopQuery,
  } as any
}
