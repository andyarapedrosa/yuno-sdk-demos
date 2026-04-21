/**
 * Cinépolis Go — Yuno SDK Lite Integration
 * Arquivo de referência para o time de desenvolvimento
 */

// 1. Carregar o SDK via script tag no HTML:
//    <script src="https://sdk-web.y.uno/v1/static/js/main.min.js"></script>

// ── Inicialização ────────────────────────────────────────────────────────────
const yuno = Yuno.initialize(PUBLIC_API_KEY);

// ── Configurar o checkout ANTES de montar ───────────────────────────────────
yuno.startCheckout({
  checkoutSession,              // obtido do backend Cinépolis
  countryCode: 'MX',
  language: 'es',
  showLoading: true,
  showPaymentStatus: false,     // Cinépolis exibe sua própria tela de status
  showPayButton: false,         // botão customizado da Cinépolis ("Pagar MXN 844.00")

  renderMode: {
    type: 'element',
    elementSelector: {
      apmForm: '#yuno-payment-form',    // div onde lista de métodos é renderizada
      actionForm: '#yuno-action-form',  // div para formulários de ação (OTP, redirect)
    },
  },

  card: {
    type: 'extends',            // formulário expandido inline (não step)
    cardSaveEnable: true,       // permite salvar cartão para próxima compra
    styles: `
      /* Personalização do iframe do cartão com cores da Cinépolis */
      body { background: #1A1A1A; font-family: -apple-system, sans-serif; }
      .Yuno-input__container { background: #242424; border-color: #2E2E2E; border-radius: 12px; }
      .Yuno-input__container:focus-within { border-color: #E30613; }
      .Yuno-input__label { color: #8A8A8A; }
      .Yuno-input__element { color: #FFFFFF; }
      .Yuno-button { background: #E30613; border-radius: 16px; font-weight: 700; }
    `,
  },

  // Callback principal: chamado após geração do One Time Token
  async yunoCreatePayment(oneTimeToken) {
    try {
      // Chamar backend da Cinépolis para criar o pagamento na Yuno
      const result = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oneTimeToken,
          checkoutSession,
          amount: 844_00,           // centavos
          currency: 'MXN',
          orderId: currentOrderId,
        }),
      }).then(r => r.json());

      // Continuar o fluxo caso o método precise de ação adicional
      // (ex: 3DS, redirect, OTP)
      yuno.continuePayment({ showPaymentStatus: false });

    } catch (err) {
      console.error('[Cinépolis] Erro ao criar pagamento', err);
      showErrorToast('Não foi possível processar o pagamento. Tente novamente.');
    }
  },

  // Chamado quando o usuário seleciona um método de pagamento
  yunoPaymentMethodSelected(data) {
    console.log('[Cinépolis] Método selecionado:', data.paymentMethodType);
    // Habilitar/desabilitar botão "Pagar" conforme necessidade
    updatePayButton(data.paymentMethodType !== null);
  },

  // Callback de status final
  yunoPaymentResult(data) {
    const { status } = data;
    if (status === 'APPROVED' || status === 'SUCCESS') {
      router.push('/confirmacao');
    } else if (status === 'REJECTED' || status === 'ERROR') {
      showErrorModal(status);
    }
  },

  onLoading({ isLoading, type }) {
    if (type === 'ONE_TIME_TOKEN') {
      setPayButtonLoading(isLoading);
    }
  },
});

// ── Montar o componente lite na div #yuno-payment-form ───────────────────────
await yuno.mountCheckoutLite({
  paymentMethodType: 'CARD',    // abre diretamente no formulário de cartão
  // vaultedToken: 'xxx',       // passar caso usuário tenha cartão salvo
});

// ── Gatilho do botão customizado "Pagar MXN 844.00" ─────────────────────────
document.getElementById('btn-pay').addEventListener('click', () => {
  yuno.submitOneTimeTokenForm();
  // O SDK irá chamar yunoCreatePayment() com o token gerado
});
