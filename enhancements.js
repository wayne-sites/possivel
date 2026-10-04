(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const config = window.POSSIVEL_SUPABASE || {};

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value;
  }

  function openAI() {
    const dialog = $('#aiDialog');
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    setTimeout(() => $('#aiPrompt')?.focus(), 30);
  }

  function closeAI() {
    const dialog = $('#aiDialog');
    if (dialog?.open) dialog.close();
  }

  function setupPriceAndPayment() {
    setText('#proPrice', config.proPriceLabel || 'R$ 15,99/mês');

    const provider = $('#paymentProvider');
    if (provider) {
      provider.value = 'mercadopago';
      const pix = provider.querySelector('option[value="pix"]');
      if (pix) pix.remove();
    }
  }

  function setupPasswordHardening() {
    const authForm = $('#authForm');
    const authPassword = $('#authPassword');
    const resetPassword = $('#newPassword');

    if (resetPassword) {
      resetPassword.minLength = 8;
      resetPassword.autocomplete = 'new-password';
    }

    const syncAuthPassword = () => {
      if (!authForm || !authPassword) return;
      const signup = authForm.dataset.mode === 'signup';
      authPassword.minLength = signup ? 8 : 6;
      authPassword.autocomplete = signup ? 'new-password' : 'current-password';
    };

    $$('[data-auth-mode]').forEach((button) => {
      button.addEventListener('click', () => setTimeout(syncAuthPassword, 0));
    });
    syncAuthPassword();

    authForm?.addEventListener('submit', (event) => {
      if (authForm.dataset.mode !== 'signup') return;
      if ((authPassword?.value || '').length >= 8) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setText('#authError', 'Para novas contas, use uma senha com pelo menos 8 caracteres.');
      authPassword?.focus();
    }, true);

    $('#resetPasswordForm')?.addEventListener('submit', (event) => {
      if ((resetPassword?.value || '').length >= 8) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setText('#resetPasswordError', 'Use uma senha com pelo menos 8 caracteres.');
      resetPassword?.focus();
    }, true);
  }

  function setupAI() {
    const buttons = [$('#aiTopButton'), ...$$('[data-action="ai"]')].filter(Boolean);
    buttons.forEach((button) => button.addEventListener('click', openAI));

    $('#aiClose')?.addEventListener('click', closeAI);
    $('#aiDialog')?.addEventListener('click', (event) => {
      if (event.target === $('#aiDialog')) closeAI();
    });

    $$('.ai-suggestion').forEach((button) => {
      button.addEventListener('click', () => {
        const prompt = $('#aiPrompt');
        const mode = $('#aiMode');
        if (prompt && button.dataset.prompt) prompt.value = button.dataset.prompt;
        if (mode && button.dataset.mode) mode.value = button.dataset.mode;
        prompt?.focus();
      });
    });

    const form = $('#aiForm');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const prompt = $('#aiPrompt');
      const mode = $('#aiMode');
      const submit = $('#aiSubmit');
      const result = $('#aiResult');
      const status = $('#aiStatus');
      const message = String(prompt?.value || '').trim();

      if (message.length < 3) {
        setText('#aiStatus', 'Conte um pouco mais sobre o que você quer tornar possível.');
        prompt?.focus();
        return;
      }

      if (!window.supabase || !config.url || !config.anonKey || !config.aiFunctionName) {
        setText('#aiStatus', 'A Possível IA ainda não está conectada ao backend.');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Pensando...';
      status.textContent = 'Criando um caminho útil e seguro...';
      result.hidden = true;
      result.textContent = '';

      try {
        const client = window.supabase.createClient(config.url, config.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
        });
        const { data: { session } } = await client.auth.getSession();
        if (!session) {
          status.textContent = 'Entre na sua conta para usar a Possível IA.';
          return;
        }

        const { data, error } = await client.functions.invoke(config.aiFunctionName, {
          body: { message, mode: mode?.value || 'path' }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.answer) throw new Error('A Possível IA não retornou uma resposta.');

        result.textContent = String(data.answer);
        result.hidden = false;
        const sourceLabel = data.source === 'provider' ? 'modo avançado' : 'motor inteligente local';
        const remaining = Number.isFinite(Number(data.remaining)) ? ` · ${data.remaining} usos restantes hoje` : '';
        status.textContent = `Possível IA · ${sourceLabel}${remaining}`;
      } catch (error) {
        console.error('possivel ai:', error);
        status.textContent = error?.message || 'Não foi possível usar a Possível IA agora.';
      } finally {
        submit.disabled = false;
        submit.textContent = 'Transformar com IA';
      }
    });
  }

  function setupUX() {
    document.documentElement.classList.add('enhanced-ui');

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && $('#aiDialog')?.open) closeAI();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        $('#searchInput')?.focus();
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('unhandled promise rejection:', event.reason);
    });

    $$('.post, .panel, .person-card, .listing-card, .cause-card, .plan-card').forEach((node) => {
      node.setAttribute('tabindex', '0');
    });
  }

  function init() {
    setupPriceAndPayment();
    setupPasswordHardening();
    setupAI();
    setupUX();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
