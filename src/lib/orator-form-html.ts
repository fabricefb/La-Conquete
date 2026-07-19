/* ═══════════════════════════════════════════════════════════════════
   Branded HTML Form Generator — Église Évangélique La Conquête
   Generates a standalone HTML form that can be downloaded and sent
   to orators/presidents. On submit, data is posted to Supabase REST API.
   ═══════════════════════════════════════════════════════════════════ */

const LOGO_URL = 'https://la-conquete.pages.dev/logo-conquete.png';
const CHURCH_NAME = 'Église Évangélique La Conquête';
const DEPT_NAME = 'Département de Média et Communication';

interface OratorFormParams {
  serviceId: string;
  serviceDate: string;      // YYYY-MM-DD
  serviceTime: string;      // HH:MM
  serviceType: string;      // label
  oratorName?: string;      // pre-fill
  token?: string;           // form link token (for Supabase submission)
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
}

/**
 * Generate a complete standalone HTML page with the branded orator form.
 * The form includes: Nom (2 fields), Thème, Sous-thème, 4 versets bibliques,
 * Grands points (dynamic textarea), Résumé, Remarques.
 * On submit: POSTs to Supabase REST API + offers WhatsApp fallback.
 */
export function generateOratorFormHTML(p: OratorFormParams): string {
  const dateFormatted = formatDateFr(p.serviceDate);
  const timeFormatted = p.serviceTime || '08:00';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Formulaire Orateur — ${CHURCH_NAME}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bleu: #0F2147;
    --bleu-light: #1a2d5a;
    --rouge: #E3221F;
    --rouge-hover: #c91d1a;
    --ciel: #D8E3FB;
    --or: #D4A843;
    --or-hover: #c49a3a;
    --white: #FFFFFF;
    --bg: #060D1D;
    --card-bg: #0F2147;
    --text: #F7F3EE;
    --text-muted: #A0AAC3;
    --border: rgba(255,255,255,0.08);
    --input-bg: rgba(255,255,255,0.05);
    --input-border: rgba(255,255,255,0.12);
    --accent: #6A96E8;
  }

  body {
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    line-height: 1.6;
  }

  .container {
    max-width: 680px;
    margin: 0 auto;
    padding: 0 16px;
  }

  /* ── Header ── */
  .header {
    background: linear-gradient(135deg, var(--bleu) 0%, var(--bleu-light) 100%);
    border-bottom: 3px solid var(--or);
    padding: 20px 0;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(20px);
  }
  .header-inner {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .logo {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: contain;
    border: 2px solid rgba(212,168,67,0.3);
    background: rgba(255,255,255,0.05);
    padding: 3px;
  }
  .header-text h1 {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
  }
  .header-sub {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
  }
  .header-sub span {
    font-size: 10px;
    text-transform: lowercase;
    letter-spacing: 0.5px;
    color: rgba(247,243,238,0.5);
    font-weight: 500;
  }
  .header-sub .dot {
    color: rgba(247,243,238,0.2);
  }
  .header-badge {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 20px;
    background: rgba(212,168,67,0.12);
    border: 1px solid rgba(212,168,67,0.25);
    font-size: 11px;
    font-weight: 600;
    color: var(--or);
    white-space: nowrap;
  }

  /* ── Welcome Banner ── */
  .welcome {
    margin-top: 24px;
    padding: 16px;
    border-radius: 14px;
    background: rgba(106,150,232,0.08);
    border: 1px solid rgba(106,150,232,0.15);
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 13px;
    color: rgba(247,243,238,0.8);
    line-height: 1.6;
  }
  .welcome-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: contain;
    border: 1px solid rgba(106,150,232,0.2);
    background: rgba(255,255,255,0.05);
    padding: 3px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .welcome strong {
    color: var(--text);
    font-size: 14px;
    display: block;
    margin-bottom: 3px;
  }

  /* ── Service Info ── */
  .service-info {
    margin-top: 20px;
    padding: 16px;
    border-radius: 14px;
    background: rgba(106,150,232,0.08);
    border: 1px solid rgba(106,150,232,0.15);
  }
  .service-info-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .service-info-row .icon {
    width: 16px;
    height: 16px;
    color: var(--accent);
  }
  .service-info-row .label {
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
  }
  .service-info-row .sub {
    font-size: 12px;
    color: var(--text-muted);
  }

  /* ── Form ── */
  .form-section {
    margin-top: 24px;
    padding-bottom: 100px;
  }
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .section-title::before {
    content: '';
    width: 4px;
    height: 24px;
    background: var(--or);
    border-radius: 2px;
  }

  .field-group {
    margin-bottom: 18px;
  }
  .field-group label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 7px;
  }
  .field-group label .required {
    color: var(--rouge);
  }
  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  input[type="text"],
  input[type="email"],
  input[type="tel"],
  textarea,
  select {
    width: 100%;
    padding: 12px 16px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 12px;
    color: var(--text);
    font-family: 'Poppins', sans-serif;
    font-size: 14px;
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
  }
  input:focus, textarea:focus, select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(106,150,232,0.15);
  }
  input::placeholder, textarea::placeholder {
    color: rgba(160,170,195,0.5);
  }
  textarea {
    resize: vertical;
    min-height: 100px;
  }

  /* ── Verse fields ── */
  .verses-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .verse-field {
    position: relative;
  }
  .verse-field .verse-number {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(212,168,67,0.12);
    color: var(--or);
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .verse-field input {
    padding-left: 42px;
  }

  /* ── Points ── */
  .points-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .point-item {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 14px;
    position: relative;
  }
  .point-item .point-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .point-number {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(106,150,232,0.12);
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .point-item input {
    flex: 1;
    padding: 10px 14px;
    font-size: 13px;
  }
  .point-item textarea {
    font-size: 12px;
    min-height: 60px;
    margin-top: 8px;
  }
  .btn-add-point {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: none;
    border: 1px dashed rgba(106,150,232,0.3);
    border-radius: 10px;
    color: var(--accent);
    font-family: 'Poppins', sans-serif;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 8px;
  }
  .btn-add-point:hover {
    background: rgba(106,150,232,0.08);
    border-color: rgba(106,150,232,0.5);
  }
  .btn-remove-point {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(227,34,31,0.08);
    border: none;
    color: rgba(227,34,31,0.6);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .btn-remove-point:hover {
    background: rgba(227,34,31,0.15);
    color: var(--rouge);
  }

  /* ── Action Bar ── */
  .action-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(6,13,29,0.92);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--border);
    padding: 14px 16px;
    z-index: 100;
  }
  .action-bar-inner {
    max-width: 680px;
    margin: 0 auto;
    display: flex;
    gap: 10px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 24px;
    border-radius: 14px;
    font-family: 'Poppins', sans-serif;
    font-size: 14px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.25s;
    text-decoration: none;
  }
  .btn-gold {
    flex: 1;
    background: linear-gradient(135deg, var(--or) 0%, var(--or-hover) 100%);
    color: var(--bleu);
  }
  .btn-gold:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(212,168,67,0.3);
  }
  .btn-gold:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .btn-whatsapp {
    padding: 14px 20px;
    background: rgba(37,211,102,0.12);
    border: 1px solid rgba(37,211,102,0.25);
    color: #25D366;
  }
  .btn-whatsapp:hover {
    background: rgba(37,211,102,0.2);
  }

  /* ── Success ── */
  .success-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(6,13,29,0.95);
    backdrop-filter: blur(20px);
    z-index: 200;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .success-overlay.active {
    display: flex;
  }
  .success-card {
    background: var(--card-bg);
    border: 1px solid rgba(37,211,102,0.2);
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    max-width: 420px;
    width: 100%;
  }
  .success-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(37,211,102,0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }
  .success-icon svg {
    width: 36px;
    height: 36px;
    color: #25D366;
  }
  .success-card h2 {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    color: var(--text);
    margin-bottom: 8px;
  }
  .success-card p {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.6;
  }

  /* ── Footer ── */
  .footer {
    text-align: center;
    padding: 30px 16px 20px;
    font-size: 11px;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    margin-top: 40px;
  }
  .footer a {
    color: var(--accent);
    text-decoration: none;
  }
  .footer .dept {
    font-weight: 600;
    color: var(--or);
  }

  /* ── Responsive ── */
  @media (max-width: 600px) {
    .field-row { grid-template-columns: 1fr; }
    .verses-grid { grid-template-columns: 1fr; }
    .header-badge { display: none; }
    .action-bar-inner { flex-direction: column; }
    .btn { width: 100%; }
  }

  /* ── Loading ── */
  .spinner {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Error ── */
  .error-msg {
    display: none;
    padding: 12px 16px;
    background: rgba(227,34,31,0.1);
    border: 1px solid rgba(227,34,31,0.2);
    border-radius: 12px;
    color: #f87171;
    font-size: 13px;
    margin-bottom: 16px;
  }
  .error-msg.active {
    display: block;
  }
</style>
</head>
<body>

<!-- ═══ HEADER ═══ -->
<div class="header">
  <div class="container">
    <div class="header-inner">
      <img src="${LOGO_URL}" alt="${CHURCH_NAME}" class="logo">
      <div class="header-text">
        <h1>Formulaire Orateur</h1>
        <div class="header-sub">
          <span>${CHURCH_NAME}</span>
          <span class="dot">&middot;</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
        </div>
      </div>
      <div class="header-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${dateFormatted}
      </div>
    </div>
  </div>
</div>

<!-- ═══ MAIN CONTENT ═══ -->
<div class="container">

  <!-- Welcome -->
  <div class="welcome">
    <img src="${LOGO_URL}" alt="" class="welcome-icon">
    <div>
      <strong>Merci de visiter notre plateforme</strong>
      Remplissez les informations ci-dessous pour pr&eacute;parer votre message.
      Vous pouvez aussi envoyer les informations par WhatsApp si vous pr&eacute;f&eacute;rez.
    </div>
  </div>

  <!-- Service Info -->
  <div class="service-info">
    <div class="service-info-row">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 2 4 4-4 4"/><path d="m18 6H5a2 2 0 0 0-2 2v1a6 6 0 0 0 6 6h0a6 6 0 0 1 6 6v1"/></svg>
      <span class="label">${dateFormatted} &mdash; ${timeFormatted}</span>
    </div>
    <div style="margin-left:26px">
      <span class="sub">${p.serviceType}</span>
    </div>
  </div>

  <!-- Error message -->
  <div class="error-msg" id="errorMsg"></div>

  <!-- Form -->
  <form id="oratorForm" class="form-section" onsubmit="return handleSubmit(event)">

    <div class="section-title">Informations du message</div>

    <!-- Nom de l'orateur (2 champs) -->
    <div class="field-group">
      <label>Nom de l'orateur <span class="required">*</span></label>
      <div class="field-row">
        <input type="text" id="firstName" name="first_name" placeholder="Pr&eacute;nom" required value="">
        <input type="text" id="lastName" name="last_name" placeholder="Nom de famille" required value="${p.oratorName || ''}">
      </div>
    </div>

    <!-- Thème -->
    <div class="field-group">
      <label>Th&egrave;me principal <span class="required">*</span></label>
      <input type="text" id="theme" name="theme" placeholder="Le th&egrave;me de votre message" required>
    </div>

    <!-- Sous-thème -->
    <div class="field-group">
      <label>Sous-th&egrave;me <small style="color:var(--text-muted);font-weight:400">(optionnel)</small></label>
      <input type="text" id="subTheme" name="sub_theme" placeholder="Sous-th&egrave;me ou angle sp&eacute;cifique">
    </div>

    <!-- 4 Versets bibliques -->
    <div class="field-group">
      <label>Versets bibliques <small style="color:var(--text-muted);font-weight:400">(optionnel)</small></label>
      <div class="verses-grid">
        <div class="verse-field">
          <span class="verse-number">1</span>
          <input type="text" id="verse1" name="verse1" placeholder="Ex: Jean 3:16">
        </div>
        <div class="verse-field">
          <span class="verse-number">2</span>
          <input type="text" id="verse2" name="verse2" placeholder="Ex: Romains 8:28">
        </div>
        <div class="verse-field">
          <span class="verse-number">3</span>
          <input type="text" id="verse3" name="verse3" placeholder="Ex: Psaumes 23:1">
        </div>
        <div class="verse-field">
          <span class="verse-number">4</span>
          <input type="text" id="verse4" name="verse4" placeholder="Ex: &Eacute;sa&iuml;e 40:31">
        </div>
      </div>
    </div>

    <!-- Grands points -->
    <div class="field-group">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <label style="margin:0">Les grands points du message</label>
      </div>
      <div class="points-container" id="pointsContainer">
        <div class="point-item" data-index="0">
          <button type="button" class="btn-remove-point" onclick="removePoint(0)" title="Supprimer">&times;</button>
          <div class="point-header">
            <span class="point-number">1</span>
            <input type="text" placeholder="Titre du point" class="point-title">
          </div>
          <textarea placeholder="Description / sous-points (optionnel)" class="point-desc"></textarea>
        </div>
      </div>
      <button type="button" class="btn-add-point" onclick="addPoint()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Ajouter un point
      </button>
    </div>

    <!-- Résumé -->
    <div class="field-group">
      <label>R&eacute;sum&eacute; du message <small style="color:var(--text-muted);font-weight:400">(optionnel)</small></label>
      <textarea id="summary" name="summary" rows="5" placeholder="Un r&eacute;sum&eacute; de votre message pour l'&eacute;quipe m&eacute;dia..."></textarea>
    </div>

    <!-- Remarques -->
    <div class="field-group">
      <label>Remarques / avis <small style="color:var(--text-muted);font-weight:400">(optionnel)</small></label>
      <textarea id="remarks" name="remarks" rows="3" placeholder="Informations compl&eacute;mentaires pour le d&eacute;partement m&eacute;dia..."></textarea>
    </div>
  </form>

  <!-- Footer -->
  <div class="footer">
    <p class="dept">${DEPT_NAME}</p>
    <p style="margin-top:4px">&copy; ${new Date().getFullYear()} ${CHURCH_NAME} &mdash; Tous droits r&eacute;serv&eacute;s</p>
  </div>
</div>

<!-- ═══ ACTION BAR ═══ -->
<div class="action-bar">
  <div class="action-bar-inner">
    <button type="button" class="btn btn-whatsapp" onclick="sendViaWhatsApp()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      WhatsApp
    </button>
    <button type="button" class="btn btn-gold" id="submitBtn" onclick="handleSubmit(event)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      Confirmer et envoyer
    </button>
  </div>
</div>

<!-- ═══ SUCCESS OVERLAY ═══ -->
<div class="success-overlay" id="successOverlay">
  <div class="success-card">
    <div class="success-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h2>Formulaire envoy&eacute; !</h2>
    <p>Merci ! Votre formulaire a &eacute;t&eacute; soumis avec succ&egrave;s au d&eacute;partement de m&eacute;dia.</p>
    <p style="margin-top:12px;font-size:12px;color:var(--text-muted)">Vous pouvez fermer cette page.</p>
  </div>
</div>

<script>
  // ═══ CONFIG ═══
  const CONFIG = {
    serviceId: '${p.serviceId}',
    supabaseUrl: '${p.supabaseUrl}',
    supabaseAnonKey: '${p.supabaseAnonKey}',
    token: '${p.token || ''}',
    siteUrl: '${p.siteUrl}',
    serviceDate: '${p.serviceDate}',
    serviceTime: '${p.serviceTime}',
    serviceType: '${p.serviceType.replace(/'/g, "\\'")}',
  };

  // ═══ POINTS MANAGEMENT ═══
  let pointCount = 1;

  function addPoint() {
    const container = document.getElementById('pointsContainer');
    const idx = pointCount++;
    const div = document.createElement('div');
    div.className = 'point-item';
    div.dataset.index = idx;
    div.innerHTML = \`
      <button type="button" class="btn-remove-point" onclick="removePoint(\${idx})" title="Supprimer">&times;</button>
      <div class="point-header">
        <span class="point-number">\${idx + 1}</span>
        <input type="text" placeholder="Titre du point" class="point-title">
      </div>
      <textarea placeholder="Description / sous-points (optionnel)" class="point-desc"></textarea>
    \`;
    container.appendChild(div);
    renumberPoints();
  }

  function removePoint(idx) {
    const items = document.querySelectorAll('.point-item');
    if (items.length <= 1) return;
    items.forEach(item => {
      if (parseInt(item.dataset.index) === idx) item.remove();
    });
    renumberPoints();
  }

  function renumberPoints() {
    document.querySelectorAll('.point-item').forEach((item, i) => {
      item.querySelector('.point-number').textContent = i + 1;
    });
  }

  // ═══ COLLECT FORM DATA ═══
  function collectData() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const oratorName = (firstName + ' ' + lastName).trim();

    const verses = [];
    for (let i = 1; i <= 4; i++) {
      const v = document.getElementById('verse' + i).value.trim();
      if (v) verses.push(v);
    }

    const points = [];
    document.querySelectorAll('.point-item').forEach(item => {
      const title = item.querySelector('.point-title').value.trim();
      if (title) {
        points.push({
          title: title,
          description: item.querySelector('.point-desc').value.trim() || null,
        });
      }
    });

    return {
      orator_name: oratorName,
      theme: document.getElementById('theme').value.trim(),
      sub_theme: document.getElementById('subTheme').value.trim() || null,
      verses: verses,
      points: points,
      summary: document.getElementById('summary').value.trim() || null,
      remarks: document.getElementById('remarks').value.trim() || null,
    };
  }

  // ═══ WHATSAPP FALLBACK ═══
  function sendViaWhatsApp() {
    const d = collectData();
    if (!d.orator_name || !d.theme) {
      showError('Le nom et le th\\u00e8me sont obligatoires.');
      return;
    }
    let msg = '*FORMULAIRE ORATEUR*\\n';
    msg += 'Culte: ' + CONFIG.serviceDate + ' ' + CONFIG.serviceTime + '\\n';
    msg += 'Type: ' + CONFIG.serviceType + '\\n\\n';
    msg += '*Orateur:* ' + d.orator_name + '\\n';
    msg += '*Th\\u00e8me:* ' + d.theme + '\\n';
    if (d.sub_theme) msg += '*Sous-th\\u00e8me:* ' + d.sub_theme + '\\n';
    if (d.verses.length > 0) {
      msg += '\\n*Versets bibliques:*\\n';
      d.verses.forEach((v, i) => { msg += (i + 1) + '. ' + v + '\\n'; });
    }
    if (d.points.length > 0) {
      msg += '\\n*Grands points du message:*\\n';
      d.points.forEach((p, i) => {
        msg += (i + 1) + '. ' + p.title;
        if (p.description) msg += ' \\u2014 ' + p.description;
        msg += '\\n';
      });
    }
    if (d.summary) msg += '\\n*R\\u00e9sum\\u00e9:*\\n' + d.summary + '\\n';
    if (d.remarks) msg += '\\n*Remarques:* ' + d.remarks + '\\n';

    const url = 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  }

  // ═══ SUBMIT TO SUPABASE ═══
  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const d = collectData();
    if (!d.orator_name || !d.theme) {
      showError('Le nom et le th\\u00e8me sont obligatoires. Veuillez remplir ces champs.');
      return false;
    }

    hideError();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Envoi en cours...';

    try {
      // Determine the primary bible reference (first verse or combined)
      let bible_book = null, bible_chapter = null, bible_verses = null;
      if (d.verses.length > 0) {
        // Store all verses joined with semicolons in bible_verses
        const firstVerse = d.verses[0];
        // Try to parse "Livre Chapitre:Verset" pattern
        const match = firstVerse.match(/^(.+?)\\s+(\\d+)(?::(\\d+[\\-\\d]*))?$/);
        if (match) {
          bible_book = match[1].trim();
          bible_chapter = match[2];
          bible_verses = match[3] || '';
        } else {
          bible_book = firstVerse;
        }
      }

      // 1. Upsert orator form
      const formPayload = {
        service_id: CONFIG.serviceId,
        orator_name: d.orator_name,
        theme: d.theme,
        sub_theme: d.sub_theme,
        bible_book: bible_book,
        bible_chapter: bible_chapter,
        bible_verses: bible_verses,
        summary: d.summary,
        remarks: d.remarks,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      const formRes = await fetch(CONFIG.supabaseUrl + '/rest/v1/worship_orator_forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.supabaseAnonKey,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(formPayload),
      });

      if (!formRes.ok) {
        const errData = await formRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Erreur lors de la soumission du formulaire');
      }

      const formData = await formRes.json();
      const formId = formData[0]?.id;

      // 2. Insert points
      if (formId && d.points.length > 0) {
        const pointsPayload = d.points.map((pt, i) => ({
          form_id: formId,
          title: pt.title,
          description: pt.description,
          position: i,
        }));

        const ptsRes = await fetch(CONFIG.supabaseUrl + '/rest/v1/worship_orator_points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CONFIG.supabaseAnonKey,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(pointsPayload),
        });

        if (!ptsRes.ok) {
          console.warn('Points insertion failed, but form was saved.');
        }
      }

      // 3. Update service status
      await fetch(CONFIG.supabaseUrl + '/rest/v1/worship_services?id=eq.' + CONFIG.serviceId, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.supabaseAnonKey,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          status: 'orator_submitted',
          orator_name: d.orator_name,
        }),
      });

      // 4. Mark link as used (if token provided)
      if (CONFIG.token) {
        await fetch(CONFIG.supabaseUrl + '/rest/v1/worship_form_links?token=eq.' + CONFIG.token, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CONFIG.supabaseAnonKey,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ is_used: true }),
        });
      }

      // Show success
      document.getElementById('successOverlay').classList.add('active');

    } catch (err) {
      showError(err.message || 'Une erreur est survenue. Veuillez r\\u00e9essayer ou utilisez WhatsApp.');
      btn.disabled = false;
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Confirmer et envoyer';
    }
    return false;
  }

  // ═══ ERROR DISPLAY ═══
  function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg;
    el.classList.add('active');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function hideError() {
    document.getElementById('errorMsg').classList.remove('active');
  }
</script>

</body>
</html>`;
}

/* ── Helper: Format date in French ── */
function formatDateFr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = [
    'janvier','février','mars','avril','mai','juin',
    'juillet','août','septembre','octobre','novembre','décembre',
  ];
  const weekdays = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const date = new Date(y, m - 1, d);
  return `${weekdays[date.getDay()]} ${d} ${months[m - 1]} ${y}`;
}