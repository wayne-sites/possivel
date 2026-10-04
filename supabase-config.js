window.POSSIVEL_SUPABASE = {
  url: 'https://nwymsiuwiqyvvmdagzeg.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eW1zaXV3aXF5dnZtZGFnemVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NDk1MTEsImV4cCI6MjEwMTEyNTUxMX0.PRlMlBncRxJDcbYtteGkQM86vcDlTSyPexsQB402I6Y',
  checkoutFunctionUrl: 'https://nwymsiuwiqyvvmdagzeg.supabase.co/functions/v1/create-subscription-checkout',
  paymentFunctionUrl: 'https://nwymsiuwiqyvvmdagzeg.supabase.co/functions/v1/create-payment-checkout',
  callFunctionUrl: 'https://nwymsiuwiqyvvmdagzeg.supabase.co/functions/v1/create-call-room',
  aiFunctionName: 'possivel-ai',
  proPriceLabel: 'R$ 15,99/mês'
};

// Ajustes de compatibilidade do cliente Supabase.
// 1) resolve explicitamente posts -> autor no PostgREST;
// 2) reaproveita o cliente principal nos módulos extras;
// 3) valida/renova uma sessão persistida antes de o app usar o JWT no banco.
(() => {
  const sdk = window.supabase;
  if (!sdk?.createClient || sdk.__possivelClientFixes) return;

  const originalCreateClient = sdk.createClient.bind(sdk);

  sdk.createClient = (...args) => {
    const client = originalCreateClient(...args);
    if (!window.POSSIVEL_DB) window.POSSIVEL_DB = client;

    const originalFrom = client.from.bind(client);
    const originalGetSession = client.auth.getSession.bind(client.auth);
    const originalGetUser = client.auth.getUser.bind(client.auth);
    const originalRefreshSession = client.auth.refreshSession.bind(client.auth);
    const originalSignOut = client.auth.signOut.bind(client.auth);
    let validatedAccessToken = null;
    let validationInFlight = null;

    function invalidSessionError(error) {
      const status = Number(error?.status || 0);
      const code = String(error?.code || '').toLowerCase();
      const message = String(error?.message || '').toLowerCase();
      return status === 401 || status === 403 || code.includes('jwt') ||
        message.includes('jwt') || message.includes('token') ||
        message.includes('session') || message.includes('refresh');
    }

    async function validateStoredSession(result) {
      const session = result?.data?.session || null;
      if (!session?.access_token) return result;
      if (validatedAccessToken === session.access_token) return result;

      try {
        const { data: userData, error: userError } = await originalGetUser(session.access_token);
        if (!userError && userData?.user) {
          validatedAccessToken = session.access_token;
          return result;
        }

        if (!invalidSessionError(userError)) return result;

        const refreshed = await originalRefreshSession();
        if (!refreshed.error && refreshed.data?.session?.access_token) {
          validatedAccessToken = refreshed.data.session.access_token;
          return { data: { session: refreshed.data.session }, error: null };
        }

        await originalSignOut({ scope: 'local' });
        validatedAccessToken = null;
        return { data: { session: null }, error: null };
      } catch (error) {
        // Em falha de rede, preserva a sessão e deixa o app tentar normalmente.
        return result;
      }
    }

    client.auth.getSession = async (...sessionArgs) => {
      const result = await originalGetSession(...sessionArgs);
      if (!result?.data?.session) return result;
      if (!validationInFlight) {
        validationInFlight = validateStoredSession(result).finally(() => { validationInFlight = null; });
      }
      return validationInFlight;
    };

    client.from = (relation) => {
      const builder = originalFrom(relation);
      if (relation !== 'posts' || typeof builder?.select !== 'function') return builder;

      const originalSelect = builder.select.bind(builder);
      builder.select = (columns = '*', options) => {
        const resolvedColumns = typeof columns === 'string'
          ? columns.replace(/\bprofiles\(/g, 'profiles!posts_author_id_fkey(')
          : columns;
        return originalSelect(resolvedColumns, options);
      };
      return builder;
    };

    return client;
  };

  sdk.__possivelClientFixes = true;
})();

(() => {
  const loadExperience = () => {
    if (!document.querySelector('script[data-possivel-experience]')) {
      const script = document.createElement('script');
      script.src = 'site-experience.js?v=20260809-4';
      script.dataset.possivelExperience = 'true';
      script.defer = true;
      document.head.append(script);
    }

    if (!document.querySelector('script[data-possivel-messages-filter]')) {
      const script = document.createElement('script');
      script.src = 'messages-filter.js?v=20260809-4';
      script.dataset.possivelMessagesFilter = 'true';
      script.defer = true;
      document.head.append(script);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadExperience, { once: true });
  else loadExperience();
})();
