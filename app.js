(() => {
  'use strict';

  const cfg = window.MMHA_CONFIG;
  if (!cfg?.supabaseUrl || !cfg?.supabasePublishableKey) {
    alert('Falta la configuración de Supabase.');
    return;
  }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
  const state = {
    session: null, profile: null, clinics: [], selectedClinic: 'all',
    catalog: [], stock: [], lots: [], movements: [], suppliers: [], users: [], transfers: [], transferLots: [], transferDestinations: [], auditRows: []
  };
  const $ = (id) => document.getElementById(id);

  function setMessage(element, text = '', kind = '') {
    element.textContent = text;
    element.className = `form-message ${kind}`.trim();
  }
  function showAuth() { $('authScreen').hidden = false; $('appScreen').hidden = true; }
  function showApp() { $('authScreen').hidden = true; $('appScreen').hidden = false; }
  function clinicName(id) { return state.clinics.find(c => c.id === id)?.name || 'Clínica'; }
  function formatQty(value) { return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
  }

  function selectedClinicLabel() {
    if (state.selectedClinic === 'all') return 'Vista consolidada';
    return state.clinics.find(clinic => clinic.id === state.selectedClinic)?.name || 'Clínica';
  }

  function inventoryExportRows() {
    return [...state.stock].sort((a, b) => {
      const clinicCompare = String(a.clinic_name || '').localeCompare(String(b.clinic_name || ''), 'es');
      if (clinicCompare) return clinicCompare;
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    });
  }

  function inventoryStatus(item) {
    const quantity = Number(item?.quantity || 0);
    const minimum = Number(item?.minimum_stock || 0);
    if (quantity <= 0) return 'Agotado';
    if (quantity <= minimum) return 'Stock bajo';
    return 'Disponible';
  }

  function exportFileStem() {
    const clinic = selectedClinicLabel()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'Inventario';
    const date = new Date().toISOString().slice(0, 10);
    return `Inventario-${clinic}-${date}`;
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportInventoryCsv() {
    const rows = inventoryExportRows();
    if (!rows.length) {
      alert('No hay inventario para exportar en la clínica seleccionada.');
      return;
    }

    const header = ['Clínica', 'Código', 'Producto', 'Categoría', 'Stock actual', 'Stock mínimo', 'Unidad', 'Estado'];
    const lines = [header, ...rows.map(item => [
      item.clinic_name || '',
      item.product_code || '',
      item.name || '',
      item.category || '',
      formatQty(item.quantity),
      formatQty(item.minimum_stock),
      item.unit || '',
      inventoryStatus(item)
    ])].map(row => row.map(csvCell).join(','));

    // BOM keeps accented Spanish text readable when the CSV is opened in Excel.
    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFileStem()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportInventoryPdf() {
    const rows = inventoryExportRows();
    if (!rows.length) {
      alert('No hay inventario para exportar en la clínica seleccionada.');
      return;
    }

    const clinic = selectedClinicLabel();
    const generated = new Intl.DateTimeFormat('es-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date());
    const reportWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!reportWindow) {
      alert('El navegador bloqueó la ventana del reporte. Permite ventanas emergentes e inténtalo nuevamente.');
      return;
    }

    const tableRows = rows.map(item => `
      <tr>
        <td>${escapeHtml(item.clinic_name || '')}</td>
        <td>${escapeHtml(item.product_code || '')}</td>
        <td>${escapeHtml(item.name || '')}</td>
        <td>${escapeHtml(item.category || '')}</td>
        <td class="num">${escapeHtml(formatQty(item.quantity))}</td>
        <td class="num">${escapeHtml(formatQty(item.minimum_stock))}</td>
        <td>${escapeHtml(item.unit || '')}</td>
        <td>${escapeHtml(inventoryStatus(item))}</td>
      </tr>`).join('');

    reportWindow.document.write(`<!doctype html>
      <html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(exportFileStem())}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        @page { size: landscape; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #17202a; background: #fff; }
        .report { padding: 22px; }
        .report-head { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 3px solid #0f4c5c; padding-bottom: 14px; margin-bottom: 18px; }
        h1 { margin: 0 0 5px; font-size: 24px; color: #0f4c5c; }
        .subtitle { margin: 0; font-size: 15px; font-weight: 700; }
        .meta { text-align: right; color: #52606d; font-size: 12px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #eef5f6; color: #173b45; text-align: left; font-weight: 700; border-bottom: 1px solid #b7cbd0; padding: 7px 6px; }
        td { border-bottom: 1px solid #dfe7ec; padding: 6px; vertical-align: top; }
        tbody tr:nth-child(even) { background: #fafcfc; }
        .num { text-align: right; }
        .report-footer { margin-top: 12px; color: #667085; font-size: 10px; }
        .print-bar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 14px; }
        button { border: 0; border-radius: 7px; padding: 9px 13px; background: #0f4c5c; color: white; font-weight: 700; cursor: pointer; }
        @media print { .print-bar { display: none; } .report { padding: 0; } }
      </style></head><body>
      <main class="report">
        <div class="print-bar"><button onclick="window.print()">Guardar como PDF / Imprimir</button></div>
        <header class="report-head">
          <div><h1>Yandi Inventory</h1><p class="subtitle">Reporte de inventario actual · ${escapeHtml(clinic)}</p></div>
          <div class="meta">Generado: ${escapeHtml(generated)}<br>Productos: ${rows.length}</div>
        </header>
        <table><thead><tr><th>Clínica</th><th>Código</th><th>Producto</th><th>Categoría</th><th>Stock</th><th>Mínimo</th><th>Unidad</th><th>Estado</th></tr></thead>
        <tbody>${tableRows}</tbody></table>
        <div class="report-footer">Este reporte refleja el inventario cargado en el Dashboard al momento de generarse.</div>
      </main></body></html>`);
    reportWindow.document.close();
    reportWindow.focus();
  }

  function normalizeWebsiteUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    try {
      const url = new URL(candidate);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return '';
      return url.toString();
    } catch {
      return '';
    }
  }

  function supplierWebsiteLink(supplier, label = 'Abrir sitio') {
    const url = normalizeWebsiteUrl(supplier?.website);
    if (!url) return '';

    return `<a class="small secondary supplier-website-button" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  }

  function isMultidoseProduct(product) {
    return normalizeProductSearch(product?.dosage_form) === 'vial multidosis';
  }

  function productVolumeMl(product) {
    if (!isMultidoseProduct(product)) return null;
    if (normalizeProductSearch(product?.volume_unit) !== 'ml') return null;

    const volume = Number(product?.volume);
    return Number.isFinite(volume) && volume > 0 ? volume : null;
  }

  function receivingStockQuantity(product, containerQuantity) {
    const quantity = Number(containerQuantity || 0);
    const volume = productVolumeMl(product);
    return volume ? quantity * volume : quantity;
  }

  function normalizeProductSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function injectProductSearchStyles() {
    if (document.getElementById('hrfcProductSearchStyles')) return;

    const style = document.createElement('style');
    style.id = 'hrfcProductSearchStyles';
    style.textContent = `
      .hrfc-product-search-wrapper { position: relative; display: block; width: 100%; }
      .hrfc-product-search-input { width: 100%; margin-top: 6px; }
      .hrfc-product-search-select { display: none !important; }
      .hrfc-product-search-suggestions {
        position: absolute; top: calc(100% + 6px); left: 0; right: 0;
        z-index: 1600; max-height: 320px; overflow-y: auto;
        background: #fff; border: 1px solid #cbd5e1; border-radius: 10px;
        box-shadow: 0 12px 28px rgba(15, 23, 42, .16);
      }
      .hrfc-product-search-option {
        display: flex; width: 100%; padding: 12px 14px;
        flex-direction: column; align-items: flex-start; gap: 4px;
        background: #fff; border: 0; border-bottom: 1px solid #e5e7eb;
        border-radius: 0; color: #172033; text-align: left; cursor: pointer;
      }
      .hrfc-product-search-option:last-child { border-bottom: 0; }
      .hrfc-product-search-option:hover,
      .hrfc-product-search-option:focus { background: #eef8fb; outline: none; }
      .hrfc-product-search-option strong { font-size: .94rem; }
      .hrfc-product-search-option span { color: #64748b; font-size: .81rem; }
      .hrfc-product-search-empty { padding: 14px; color: #64748b; }
    `;
    document.head.appendChild(style);
  }

  function productSearchParts(selectId) {
    return {
      select: $(selectId),
      input: $(`${selectId}SearchInput`),
      suggestions: $(`${selectId}SearchSuggestions`)
    };
  }

  function renderProductSearchSuggestions(selectId, showAll = false) {
    const { select, input, suggestions } = productSearchParts(selectId);
    if (!select || !input || !suggestions) return;

    const query = normalizeProductSearch(input.value);
    if (!query && !showAll) {
      suggestions.hidden = true;
      suggestions.innerHTML = '';
      return;
    }

    const options = [...select.options]
      .filter(option => option.value)
      .filter(option => !query || normalizeProductSearch(option.textContent).includes(query))
      .slice(0, 12);

    if (!options.length) {
      suggestions.hidden = false;
      suggestions.innerHTML = '<div class="hrfc-product-search-empty">No se encontraron productos.</div>';
      return;
    }

    suggestions.hidden = false;
    suggestions.innerHTML = options.map(option => `
      <button type="button"
        class="hrfc-product-search-option"
        data-product-search-value="${escapeHtml(option.value)}">
        <strong>${escapeHtml(option.textContent.trim())}</strong>
        <span>Seleccionar producto</span>
      </button>
    `).join('');
  }

  function selectProductSearchOption(selectId, value) {
    const { select, input, suggestions } = productSearchParts(selectId);
    if (!select || !input || !suggestions) return;

    const option = [...select.options].find(item => item.value === value);
    if (!option) return;

    select.value = value;
    input.value = option.textContent.trim();
    input.dataset.selectedValue = value;
    suggestions.hidden = true;
    suggestions.innerHTML = '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function clearProductSearch(selectId, clearSelection = true) {
    const { select, input, suggestions } = productSearchParts(selectId);

    if (input) {
      input.value = '';
      input.dataset.selectedValue = '';
    }
    if (suggestions) {
      suggestions.hidden = true;
      suggestions.innerHTML = '';
    }
    if (clearSelection && select) {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function syncProductSearch(selectId) {
    const { select, input } = productSearchParts(selectId);
    if (!select || !input) return;

    const selected = select.selectedOptions?.[0];
    if (selected?.value) {
      input.value = selected.textContent.trim();
      input.dataset.selectedValue = selected.value;
    } else if (input.dataset.selectedValue) {
      input.value = '';
      input.dataset.selectedValue = '';
    }
  }

  function makeProductSelectSearchable(selectId, placeholder) {
    const select = $(selectId);
    if (!select || select.dataset.searchReady === 'true') return;

    injectProductSearchStyles();
    const label = select.closest('label');
    if (!label) return;

    label.classList.add('hrfc-product-search-wrapper');

    const input = document.createElement('input');
    input.id = `${selectId}SearchInput`;
    input.type = 'search';
    input.className = 'hrfc-product-search-input';
    input.placeholder = placeholder;
    input.autocomplete = 'off';

    const suggestions = document.createElement('div');
    suggestions.id = `${selectId}SearchSuggestions`;
    suggestions.className = 'hrfc-product-search-suggestions';
    suggestions.hidden = true;

    label.insertBefore(input, select);
    label.insertBefore(suggestions, select);
    select.classList.add('hrfc-product-search-select');
    select.dataset.searchReady = 'true';

    input.addEventListener('focus', () => renderProductSearchSuggestions(selectId, true));

    input.addEventListener('input', () => {
      if (input.dataset.selectedValue) {
        select.value = '';
        input.dataset.selectedValue = '';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      renderProductSearchSuggestions(selectId, true);
    });

    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        suggestions.hidden = true;
        return;
      }
      if (event.key !== 'Enter') return;

      const first = suggestions.querySelector('[data-product-search-value]');
      if (!first) return;

      event.preventDefault();
      selectProductSearchOption(selectId, first.dataset.productSearchValue);
    });

    suggestions.addEventListener('click', event => {
      const button = event.target.closest('[data-product-search-value]');
      if (!button) return;
      selectProductSearchOption(selectId, button.dataset.productSearchValue);
    });

    select.addEventListener('change', () => syncProductSearch(selectId));
  }

  function initializeProductSearches() {
    makeProductSelectSearchable(
      'receivingProduct',
      'Buscar por nombre, código o concentración...'
    );
    makeProductSelectSearchable(
      'assignmentProduct',
      'Buscar producto para agregar al inventario...'
    );

    makeProductSelectSearchable(
      'consumptionProduct',
      'Buscar producto para registrar salida...'
    );

    makeProductSelectSearchable(
      'transferProduct',
      'Buscar producto para transferir...'
    );

    document.addEventListener('click', event => {
      if (event.target.closest('.hrfc-product-search-wrapper')) return;
      document.querySelectorAll('.hrfc-product-search-suggestions')
        .forEach(box => { box.hidden = true; });
    });
  }

  function isAdmin() { return state.profile?.role === 'admin'; }
  function isManager() { return state.profile?.role === 'manager'; }
  function isStaff() { return state.profile?.role === 'staff'; }
  function assignedClinicIds() { return state.clinics.map(c => c.id); }
  function primaryClinicId() { return state.clinics[0]?.id || ''; }

  function activeClinicId() {
  if (state.selectedClinic && state.selectedClinic !== 'all') {
    return state.selectedClinic;
  }

  return primaryClinicId();
}
  function isManagerOrAdmin() { return ['manager', 'admin'].includes(state.profile?.role); }

  function applyRoleVisibility() {
    document.querySelectorAll('.admin-only').forEach(el => { el.hidden = !isAdmin(); });
    document.querySelectorAll('.manager-admin-only').forEach(el => { el.hidden = !(isAdmin() || isManager()); });

    const selector = $('clinicSelector');
    const fixed = $('fixedClinicDisplay');
    const fixedName = $('fixedClinicName');

    if (isStaff()) {
  const hasMultipleClinics = state.clinics.length > 1;

  selector.hidden = !hasMultipleClinics;
  fixed.hidden = hasMultipleClinics;

  if (hasMultipleClinics) {
    if (!state.selectedClinic || state.selectedClinic === 'all') {
      state.selectedClinic = primaryClinicId();
    }

    selector.value = state.selectedClinic;
  } else {
    state.selectedClinic = primaryClinicId();
    selector.value = state.selectedClinic;
    fixedName.textContent = state.clinics[0]?.name || 'Clínica';
  }
} else {
  selector.hidden = false;
  fixed.hidden = true;
}
    // Catalog is available to Manager/Admin; Suppliers and Users remain Admin only.
    document.querySelectorAll('[data-view="catalogView"]').forEach(el => {
      el.hidden = !(isAdmin() || isManager());
    });

    document.querySelectorAll('[data-view="suppliersView"], [data-view="usersView"]').forEach(el => {
      el.hidden = !isAdmin();
    });

    if (isStaff() && ['catalogView','suppliersView','usersView'].includes(document.querySelector('.app-view:not([hidden])')?.id)) {
      switchView('dashboardView');
    }

    enforceClinicScope();
  }

  function enforceClinicScope() {
    const clinicId = activeClinicId();
    if (!isStaff() || !clinicId) return;

    ['assignmentClinic','receivingClinic','consumptionClinic'].forEach(id => {
      const control = $(id);
      if (control) control.value = clinicId;
    });

    if ($('transferOriginName')) {
      $('transferOriginName').value = state.clinics[0]?.name || '';
    }
  }

  async function apiRequest(action, payload = {}) {
    const token = state.session?.access_token;
    const response = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action, ...payload })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación.');
    return body;
  }

  async function signIn(event) {
    event.preventDefault();
    setMessage($('loginMessage'));
    $('loginButton').disabled = true;
    const { error } = await sb.auth.signInWithPassword({
      email: $('loginEmail').value.trim(),
      password: $('loginPassword').value
    });
    $('loginButton').disabled = false;
    if (error) setMessage($('loginMessage'), 'Correo o contraseña incorrectos.', 'error');
  }

  async function signOut() {
    const button = $('logoutBtn');
    button.disabled = true;

    try {
      await sb.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Remove only Supabase authentication tokens; preserve unrelated app settings.
    Object.keys(localStorage).forEach(key => {
      if (/^sb-.*-auth-token$/i.test(key)) localStorage.removeItem(key);
    });
    Object.keys(sessionStorage).forEach(key => {
      if (/^sb-.*-auth-token$/i.test(key)) sessionStorage.removeItem(key);
    });

    state.session = null;
    state.profile = null;
    state.clinics = [];
    state.selectedClinic = 'all';
    state.catalog = [];
    state.stock = [];
    state.lots = [];
    state.movements = [];
    state.suppliers = [];
    state.users = [];
    state.transfers = [];
    state.transferLots = [];
    state.transferDestinations = [];

    $('loginForm').reset();
    $('loginEmail').value = '';
    $('loginPassword').value = '';
    setMessage($('loginMessage'));
    showAuth();

    button.disabled = false;
    window.history.replaceState(null, '', window.location.pathname);
    setTimeout(() => $('loginEmail').focus(), 0);
  }

  async function loadIdentity() {
    const userId = state.session.user.id;
    const { data: profile, error: profileError } = await sb
      .from('profiles')
      .select('id, full_name, role, active, organization_id')
      .eq('id', userId)
      .single();
    if (profileError || !profile?.active) throw new Error('El perfil no está activo o no pudo cargarse.');
    state.profile = profile;

    const { data: assignments, error: assignmentError } = await sb
      .from('profile_clinics')
      .select('clinic_id, clinics(id,name,code,active)')
      .eq('profile_id', userId);
    if (assignmentError) throw assignmentError;
    state.clinics = (assignments || []).map(x => x.clinics).filter(Boolean);
    if (!state.clinics.length) throw new Error('El usuario no tiene clínicas asignadas.');

    $('userName').textContent = `${profile.full_name} · ${profile.role}`;
    const options = state.clinics.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    $('clinicSelector').innerHTML = `<option value="all">Vista consolidada</option>${options}`;
    $('assignmentClinic').innerHTML = options;
    state.selectedClinic = 'all';
  }

  async function loadData() {
    let stockQuery = sb.from('current_stock').select('*').order('name');
    let lotQuery = sb.from('lots').select('id,clinic_id,product_id,lot_number,expiration_date,quantity,created_at').order('created_at');
    let movementQuery = sb.from('inventory_movements')
      .select('id,clinic_id,product_id,movement_type,quantity,previous_quantity,resulting_quantity,reason,created_at,products(name)')
      .order('created_at', { ascending: false }).limit(100);

    if (state.selectedClinic !== 'all') {
      stockQuery = stockQuery.eq('clinic_id', state.selectedClinic);
      lotQuery = lotQuery.eq('clinic_id', state.selectedClinic);
      movementQuery = movementQuery.eq('clinic_id', state.selectedClinic);
    }

    const supplierQuery = sb.from('suppliers')
      .select('id,name,supplier_type,primary_contact,phone,email,website,account_number,typical_delivery_days,preferred,active,notes')
      .eq('organization_id', state.profile.organization_id)
      .order('preferred', { ascending: false })
      .order('name');

    const catalogQuery = sb.from('products')
      .select('id,product_code,name,base_name,strength,strength_unit,volume,volume_unit,dosage_form,category,unit,requires_lot,requires_expiration,supplier,unit_cost,notes,active')
      .eq('organization_id', state.profile.organization_id)
      .order('name');

    const [catalogRes, stockRes, lotRes, movementRes, supplierRes] = await Promise.all([
      catalogQuery, stockQuery, lotQuery, movementQuery, supplierQuery
    ]);
    for (const result of [catalogRes, stockRes, lotRes, movementRes, supplierRes]) {
      if (result.error) throw result.error;
    }
    state.catalog = catalogRes.data || [];
    state.stock = stockRes.data || [];
    state.lots = lotRes.data || [];
    state.movements = movementRes.data || [];
    state.suppliers = supplierRes.data || [];
    try {
      const { data: destinationClinics, error: destinationError } = await sb
        .from('clinics')
        .select('id,name,active,organization_id')
        .eq('organization_id', state.profile.organization_id)
        .eq('active', true)
        .order('name');
      if (destinationError) throw destinationError;
      state.transferDestinations = destinationClinics || [];
    } catch (error) {
      console.error('Transfer destination load error:', error);
      state.transferDestinations = [...state.clinics];
    }
    try {
      const { data: transferData, error: transferError } = await sb
        .from('inventory_transfers')
        .select('id,organization_id,from_clinic_id,to_clinic_id,product_id,quantity,comment,status,problem_note,created_by,received_by,created_at,received_at,products(name,unit),from_clinic:clinics!inventory_transfers_from_clinic_id_fkey(name),to_clinic:clinics!inventory_transfers_to_clinic_id_fkey(name)')
        .order('created_at', { ascending: false });
      if (transferError) throw transferError;
      state.transfers = transferData || [];

      const transferIds = state.transfers.map(transfer => transfer.id);
      if (transferIds.length) {
        const { data: transferLotData, error: transferLotError } = await sb
          .from('inventory_transfer_lots')
          .select('id,transfer_id,source_lot_id,lot_number,expiration_date,quantity')
          .in('transfer_id', transferIds)
          .order('expiration_date', { ascending: true });

        if (transferLotError) throw transferLotError;
        state.transferLots = transferLotData || [];
      } else {
        state.transferLots = [];
      }
    } catch (error) {
      console.error('Transfer load error:', error);
      state.transfers = [];
      state.transferLots = [];
    }
    if (isAdmin()) {
      try {
        const { data: auditData, error: auditError } = await sb
          .from('inventory_audit_view')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(2000);
        if (auditError) throw auditError;
        state.auditRows = auditData || [];
      } catch (error) {
        console.error('Audit load error:', error);
        state.auditRows = [];
      }
    } else {
      state.auditRows = [];
    }
    if (isAdmin()) {
      try {
        const userResult = await apiRequest('list');
        state.users = userResult.users || [];
      } catch (error) {
        console.error('Users load error:', error);
        state.users = [];
      }
    } else {
      state.users = [];
    }
    renderAll();
  }

  async function addLocation(event) {
    event.preventDefault();
    setMessage($("locationMessage"));
    const name = $("newLocationName").value.trim();
    const { error } = await sb.rpc("add_clinic", { p_name: name, p_code: $("newLocationCode").value.trim() || name });
    if (error) return setMessage($("locationMessage"), error.message, "error");
    $("addLocationDialog").close();
    $("addLocationForm").reset();
    await loadIdentity();
    await loadData();
  }

  function renderAll() {
    renderDashboard();
    renderCatalog();
    renderClinicInventory();
    renderMovementOptions();
    renderSuppliers();
    renderUsers();
    renderReceiving();
    renderConsumption();
    renderTransfers();
    renderAudit();
    applyRoleVisibility();
  }


  function formatExpirationStatus(expirationDate) {
    if (!expirationDate) return { label: 'Sin vencimiento', className: '' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiration = new Date(`${expirationDate}T00:00:00`);
    const days = Math.ceil((expiration - today) / 86400000);

    if (days < 0) return { label: `Vencido · ${expirationDate}`, className: 'expired' };
    if (days <= 30) return { label: `Vence pronto · ${expirationDate}`, className: 'expiring' };
    return { label: `Vence ${expirationDate}`, className: '' };
  }

  function productLotsForClinic(productId, clinicId) {
    return state.lots
      .filter(lot =>
        lot.product_id === productId &&
        lot.clinic_id === clinicId &&
        Number(lot.quantity) > 0
      )
      .sort((a, b) => {
        const aDate = a.expiration_date ? new Date(`${a.expiration_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.expiration_date ? new Date(`${b.expiration_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate || new Date(a.created_at || 0) - new Date(b.created_at || 0);
      });
  }

  function openLotDetails(productId, clinicId) {
    const stock = state.stock.find(item =>
      item.product_id === productId && item.clinic_id === clinicId
    );
    const product = state.catalog.find(item => item.id === productId);
    const clinic = state.transferDestinations.find(item => item.id === clinicId)
      || state.clinics.find(item => item.id === clinicId);
    const lots = productLotsForClinic(productId, clinicId);

    $('lotDetailsTitle').textContent = product?.name || stock?.name || 'Detalle de lotes';
    $('lotDetailsSubtitle').textContent =
      `${clinic?.name || stock?.clinic_name || 'Clínica'} · Stock total: ${formatQty(stock?.quantity || 0)} ${stock?.unit || product?.unit || ''}`;

    $('lotDetailsBody').innerHTML = lots.length
      ? lots.map(lot => {
          const expiration = formatExpirationStatus(lot.expiration_date);
          return `
            <article class="lot-detail-card ${expiration.className}">
              <div>
                <strong>Lote ${escapeHtml(lot.lot_number || 'Sin número')}</strong>
                <span>${escapeHtml(expiration.label)}</span>
              </div>
              <strong>${formatQty(lot.quantity)} ${escapeHtml(stock?.unit || product?.unit || '')}</strong>
            </article>
          `;
        }).join('')
      : '<p class="empty">Este producto no tiene lotes con stock disponible en esta clínica.</p>';

    const dialog = $('lotDetailsDialog');
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute('open', '');
  }

  function dashboardTransferClinicId() {
    if (isStaff()) return primaryClinicId();

    if (state.selectedClinic && state.selectedClinic !== 'all') {
      return state.selectedClinic;
    }

    return primaryClinicId();
  }

  function dashboardPendingTransfers() {
    const clinicId = dashboardTransferClinicId();

    return state.transfers.filter(transfer =>
      transfer.status === 'pending' &&
      transfer.to_clinic_id === clinicId
    );
  }

  function openPendingTransfersFromDashboard() {
    switchView('transfersView');

    setTimeout(() => {
      $('incomingTransfers')?.closest('.panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 50);
  }

  function renderDashboard() {
    const search = $('search').value.trim().toLowerCase();
    const low = state.stock.filter(p => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.minimum_stock));
    const out = state.stock.filter(p => Number(p.quantity) <= 0);
    const expiring = state.lots.filter(l => {
      if (!l.expiration_date || Number(l.quantity) <= 0) return false;
      const days = Math.ceil((new Date(`${l.expiration_date}T00:00:00`) - new Date()) / 86400000);
      return days >= 0 && days <= 30;
    });

    const pendingTransfers = dashboardPendingTransfers();

    $('stats').innerHTML = [
      ['catalog', 'Catálogo', state.catalog.length],
      ['active', 'Productos activos', state.stock.length],
      ['low', 'Stock bajo', low.length],
      ['expiring', 'Vencen ≤30 días', expiring.length]
    ].map(([filter,label,value]) =>
      `<button type="button" class="stat-card stat-action ${state.dashboardFilter === filter ? 'active' : ''}" data-dashboard-filter="${filter}">
        <span>${label}</span><strong>${value}</strong>
      </button>`
    ).join('') + `
      <button
        type="button"
        class="stat-card stat-action transfer-pending-card ${pendingTransfers.length > 0 ? 'has-pending' : ''}"
        data-dashboard-action="pending-transfers">
        <span>Transferencias pendientes</span>
        <strong>${pendingTransfers.length}</strong>
      </button>
    `;

    const alerts = [
      ...out.map(p => ({type:'out', productId:p.product_id, clinicId:p.clinic_id, text:`${p.name}: agotado en ${p.clinic_name}.`})),
      ...low.map(p => ({type:'low', productId:p.product_id, clinicId:p.clinic_id, text:`${p.name} (${p.clinic_name}): quedan ${formatQty(p.quantity)} ${p.unit}(s); mínimo ${formatQty(p.minimum_stock)}.`})),
      ...expiring.map(l => {
        const product = state.catalog.find(p => p.id === l.product_id);
        const clinic = state.clinics.find(c => c.id === l.clinic_id);
        return {type:'expiring', productId:l.product_id, clinicId:l.clinic_id, text:`${product?.name || 'Producto'} (${clinic?.name || ''}), lote ${l.lot_number || 'sin número'} vence el ${l.expiration_date}.`};
      })
    ];

    $('alertCount').textContent = alerts.length;
    $('alerts').innerHTML = alerts.map(a =>
      `<button type="button" class="alert ${a.type === 'expiring' ? 'info' : a.type === 'low' ? 'warning' : 'danger'} alert-clickable"
        data-alert-product="${a.productId || ''}" data-alert-clinic="${a.clinicId || ''}" data-alert-type="${a.type}">
        ${escapeHtml(a.text)}
      </button>`
    ).join('') || '<p class="empty">No hay alertas activas.</p>';

    let visible = [...state.stock];
    if (state.dashboardFilter === 'low') visible = visible.filter(p => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.minimum_stock));
    if (state.dashboardFilter === 'expiring') {
      const keys = new Set(expiring.map(l => `${l.clinic_id}:${l.product_id}`));
      visible = visible.filter(p => keys.has(`${p.clinic_id}:${p.product_id}`));
    }
    if (state.dashboardFilter === 'active') visible = visible.filter(p => Number(p.quantity) >= 0);
    if (search) {
      visible = visible.filter(p => `${p.name} ${p.category} ${p.supplier || ''} ${p.product_code || ''} ${p.clinic_name || ''}`.toLowerCase().includes(search));
    }

    $('inventoryBody').innerHTML = visible.map(p => {
      const status = Number(p.quantity) <= 0 ? ['Agotado','out'] : Number(p.quantity) <= Number(p.minimum_stock) ? ['Stock bajo','low'] : ['Disponible','ok'];
      const highlighted = state.highlightedProductId === `${p.clinic_id}:${p.product_id}` ? ' row-highlight' : '';
      return `<tr class="${highlighted}" data-row-key="${p.clinic_id}:${p.product_id}">
        <td>${escapeHtml(p.clinic_name)}</td><td>${escapeHtml(p.product_code || '')}</td>
        <td><button type="button" class="product-lot-link" data-lot-product="${p.product_id}" data-lot-clinic="${p.clinic_id}">${escapeHtml(p.name)}</button></td><td>${escapeHtml(p.category)}</td>
        <td>${formatQty(p.quantity)}</td><td>${formatQty(p.minimum_stock)}</td>
        <td>${escapeHtml(p.unit)}</td><td><span class="status ${status[1]}">${status[0]}</span></td>
        <td><button type="button" class="row-menu-button" data-quick-product="${p.product_id}" data-quick-clinic="${p.clinic_id}">⋮</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="9" class="empty">No hay productos para este filtro.</td></tr>';

    const labels = {
      catalog: 'Mostrando todos los productos del inventario',
      active: 'Mostrando productos activos',
      low: 'Mostrando productos con stock bajo',
      expiring: 'Mostrando productos que vencen en 30 días o menos'
    };
    const filterText = labels[state.dashboardFilter] || '';
    $('activeFilterBanner').hidden = !filterText;
    $('activeFilterText').textContent = filterText;
  }

  function applyDashboardFilter(filter) {
    state.dashboardFilter = filter === 'catalog' ? 'all' : filter;
    state.highlightedProductId = null;
    renderDashboard();
    document.querySelector('#inventoryBody')?.closest('.panel')?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function focusDashboardProduct(productId, clinicId, filter) {
    state.dashboardFilter = filter || 'all';
    state.highlightedProductId = `${clinicId}:${productId}`;
    renderDashboard();
    const row = document.querySelector(`[data-row-key="${clinicId}:${productId}"]`);
    if (row) {
      row.scrollIntoView({behavior:'smooth', block:'center'});
      setTimeout(() => row.classList.remove('row-highlight'), 3500);
    }
  }

  function openQuickAction(productId, clinicId) {
    switchView('inventoryView');
    const option = [...$('movementProduct').options].find(opt => opt.value === productId && opt.dataset.clinic === clinicId);
    if (option) {
      option.selected = true;
      populateLots();
      $('movementForm').scrollIntoView({behavior:'smooth', block:'start'});
    }
  }

  function renderCatalog() {
    const search = $('catalogSearch').value.trim().toLowerCase();
    const visible = state.catalog.filter(p => !search || `${p.product_code} ${p.name} ${p.category} ${p.supplier || ''} ${p.unit}`.toLowerCase().includes(search));
    $('catalogBody').innerHTML = visible.map(p => `<tr>
      <td>${escapeHtml(p.product_code)}</td><td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category)}</td><td>${escapeHtml(p.unit)}</td>
      <td>${p.requires_lot ? 'Sí' : 'No'}</td><td>${p.requires_expiration ? 'Sí' : 'No'}</td>
      <td>${escapeHtml(p.supplier || '')}</td>
      <td><span class="status ${p.active ? 'ok' : 'out'}">${p.active ? 'Activo' : 'Inactivo'}</span></td>
      <td class="row-actions">${isAdmin() ? `
        <button type="button" class="small secondary" data-edit-product="${p.id}">Editar</button>
        <button type="button" class="small ${p.active ? 'danger-button' : ''}" data-toggle-product="${p.id}">${p.active ? 'Desactivar' : 'Activar'}</button>
        <button type="button" class="small permanent-delete-button" data-delete-product="${p.id}">Borrar</button>
        <button type="button" class="small purge-test-button" data-purge-product="${p.id}">Purgar prueba</button>
      ` : '<span class="muted-text">Solo lectura</span>'}</td>
    </tr>`).join('') || '<tr><td colspan="9" class="empty">No hay productos registrados.</td></tr>';

    renderAssignmentOptions();
  }


  function renderAssignmentOptions() {
    const clinicId = $('assignmentClinic').value;
    const assignedIds = new Set(
      state.stock
        .filter(item => item.clinic_id === clinicId)
        .map(item => item.product_id)
    );
    const available = state.catalog
      .filter(product => product.active && !assignedIds.has(product.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    $('assignmentProduct').innerHTML =
      '<option value="">Selecciona un producto</option>' +
      available.map(product =>
        `<option value="${product.id}" data-lot="${product.requires_lot}" data-expiration="${product.requires_expiration}" data-unit="${escapeHtml(product.unit || '')}" data-dosage-form="${escapeHtml(product.dosage_form || '')}" data-volume="${escapeHtml(product.volume || '')}" data-volume-unit="${escapeHtml(product.volume_unit || '')}">${escapeHtml(product.product_code)} — ${escapeHtml(product.name)} — ${escapeHtml(product.unit)}</option>`
      ).join('');
    $('saveAssignmentBtn').disabled = available.length === 0;
    if (!available.length) {
      setMessage(
        $('assignmentMessage'),
        clinicId ? 'Todos los productos activos ya están asignados a esta clínica.' : 'Selecciona una clínica.',
        'success'
      );
    } else if ($('assignmentMessage').textContent.includes('Todos los productos')) {
      setMessage($('assignmentMessage'));
    }
    updateAssignmentRequirements();
    syncProductSearch('assignmentProduct');
  }

  function renderClinicInventory() {
    const search = $('clinicInventorySearch')?.value.trim().toLowerCase() || '';
    const visible = state.stock.filter(item =>
      !search ||
      `${item.product_code || ''} ${item.name} ${item.category || ''} ${item.clinic_name || ''}`.toLowerCase().includes(search)
    );
    $('clinicInventoryBody').innerHTML = visible.map(item => {
      const quantity = Number(item.quantity || 0);
      const minimum = Number(item.minimum_stock || 0);
      const status = quantity <= 0
        ? ['Agotado', 'out']
        : quantity <= minimum
          ? ['Stock bajo', 'low']
          : ['Disponible', 'ok'];
      return `<tr>
        <td>${escapeHtml(item.clinic_name)}</td>
        <td>${escapeHtml(item.product_code || '')}</td>
        <td><button type="button" class="product-lot-link" data-lot-product="${item.product_id}" data-lot-clinic="${item.clinic_id}">${escapeHtml(item.name)}</button></td>
        <td>${formatQty(quantity)}</td>
        <td>${formatQty(minimum)}</td>
        <td>${escapeHtml(item.unit)}</td>
        <td><span class="status ${status[1]}">${status[0]}</span></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="empty">Todavía no hay productos asignados a esta clínica.</td></tr>';
  }

  function resetProductForm() {
    $('catalogForm').reset();
    $('catalogProductId').value = '';
    $('productFormTitle').textContent = 'Nuevo producto';
    $('saveCatalogBtn').textContent = 'Guardar producto';
    $('cancelCatalogEditBtn').hidden = true;
    setMessage($('catalogMessage'));
    renderSuppliers();
  }

  function editProduct(id) {
    if (!isAdmin()) return alert('Solo el administrador puede editar productos.');
    const product = state.catalog.find(item => item.id === id);
    if (!product) return;
    $('catalogProductId').value = product.id;
    $('catalogName').value = product.base_name || product.name;
    $('catalogCategory').value = product.category;
    $('catalogStrength').value = product.strength || '';
    $('catalogStrengthUnit').value = product.strength_unit || '';
    $('catalogVolume').value = product.volume || '';
    $('catalogVolumeUnit').value = product.volume_unit || '';
    $('catalogDosageForm').value = product.dosage_form || '';
    $('catalogUnit').value = product.unit;
    updateMedicationFields();
    $('catalogSupplier').value = product.supplier || '';
    $('catalogRequiresLot').checked = product.requires_lot;
    $('catalogRequiresExpiration').checked = product.requires_expiration;
    $('productFormTitle').textContent = `Editar ${product.name}`;
    $('saveCatalogBtn').textContent = 'Guardar cambios';
    $('cancelCatalogEditBtn').hidden = false;
    setMessage($('catalogMessage'), `Editando ${product.product_code}.`, 'success');
    $('catalogName').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }




  function friendlyProductDeletionError(error) {
    const message = String(error?.message || '');

    if (
      message.includes('inventory_transfer_lots_source_lot_id_fkey') ||
      message.toLowerCase().includes('transferencia')
    ) {
      return 'No se puede eliminar este producto porque participó en una transferencia entre clínicas. Desactívelo para conservar la trazabilidad.';
    }

    if (
      message.includes('inventory_movements') ||
      message.toLowerCase().includes('historial de movimientos')
    ) {
      return 'No se puede eliminar este producto porque tiene entradas, salidas o ajustes registrados. Desactívelo para conservar el historial.';
    }

    if (
      message.includes('inventory_receipts') ||
      message.toLowerCase().includes('recepciones')
    ) {
      return 'No se puede eliminar este producto porque tiene recepciones registradas. Desactívelo para conservar el historial.';
    }

    if (
      message.includes('inventory_consumptions') ||
      message.toLowerCase().includes('salidas registradas')
    ) {
      return 'No se puede eliminar este producto porque tiene salidas registradas. Desactívelo para conservar el historial.';
    }

    if (
      message.includes('clinic_products') ||
      message.toLowerCase().includes('asignado a una clínica')
    ) {
      return 'No se puede eliminar este producto porque está asignado a una clínica. Si ya no se utilizará, desactívelo.';
    }

    if (
      message.includes('lots') ||
      message.toLowerCase().includes('lotes')
    ) {
      return 'No se puede eliminar este producto porque tiene lotes registrados. Si ya no se utilizará, desactívelo.';
    }

    return message || 'No fue posible eliminar el producto.';
  }

  async function purgeTestProduct(id) {
    if (!isAdmin()) return alert('Solo el administrador puede purgar productos de prueba.');

    const product = state.catalog.find(item => item.id === id);
    if (!product) return;

    const phrase = `PURGAR ${product.product_code}`;
    const confirmation = prompt(
      `ELIMINAR PRODUCTO Y TODO SU HISTORIAL DE PRUEBA\n\n` +
      `Producto: ${product.name}\nCódigo: ${product.product_code}\n\n` +
      `Esto borrará permanentemente stock, lotes, entradas, salidas y movimientos relacionados.\n` +
      `No debe usarse con información real.\n\n` +
      `Para confirmar, escribe exactamente:\n${phrase}`
    );

    if (confirmation !== phrase) return;

    try {
      const { error } = await sb.rpc('purge_test_catalog_product', {
        p_product_id: id
      });
      if (error) throw error;

      alert('Producto de prueba y su historial fueron eliminados.');
      if ($('catalogProductId').value === id) resetProductForm();
      await loadData();
    } catch (error) {
      alert(friendlyProductDeletionError(error));
    }
  }

  async function deleteProductPermanently(id) {
    if (!isAdmin()) return alert('Solo el administrador puede borrar productos.');

    const product = state.catalog.find(item => item.id === id);
    if (!product) return;

    const confirmation = prompt(
      `BORRADO PERMANENTE\n\nProducto: ${product.name}\n\n` +
      `Esta acción solo funcionará si el producto no tiene stock, lotes ni historial.\n` +
      `Para confirmar, escribe exactamente: BORRAR`
    );

    if (confirmation !== 'BORRAR') return;

    try {
      const { error } = await sb.rpc('delete_catalog_product_permanently', {
        p_product_id: id
      });
      if (error) throw error;

      alert('Producto borrado permanentemente.');
      if ($('catalogProductId').value === id) resetProductForm();
      await loadData();
    } catch (error) {
      alert(friendlyProductDeletionError(error));
    }
  }

  async function toggleProduct(id) {
    if (!isAdmin()) return alert('Solo el administrador puede activar o desactivar productos.');
    const product = state.catalog.find(item => item.id === id);
    if (!product) return;
    const action = product.active ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${action} ${product.name}?`)) return;
    const { error } = await sb.rpc('set_product_active', { p_product_id: id, p_active: !product.active });
    if (error) return alert(error.message);
    await loadData();
  }

  function renderSuppliers() {
    const search = $('supplierSearch')?.value.trim().toLowerCase() || '';
    const visible = state.suppliers.filter(s => !search || `${s.name} ${s.supplier_type} ${s.primary_contact || ''}`.toLowerCase().includes(search));

    if ($('supplierBody')) {
      $('supplierBody').innerHTML = visible.map(supplier => `<tr>
        <td>${escapeHtml(supplier.name)}</td><td>${escapeHtml(supplier.supplier_type)}</td>
        <td>${escapeHtml(supplier.primary_contact || '')}</td><td>${escapeHtml(supplier.phone || '')}</td>
        <td>${escapeHtml(supplier.email || '')}</td>
        <td>${supplierWebsiteLink(supplier) || '<span class="muted-text">No registrado</span>'}</td>
        <td><span class="status ${supplier.active ? 'ok' : 'out'}">${supplier.active ? 'Activo' : 'Inactivo'}</span></td>
        <td class="row-actions">
          <button type="button" class="small secondary" data-edit-supplier="${supplier.id}">Editar</button>
          <button type="button" class="small ${supplier.active ? 'danger-button' : ''}" data-toggle-supplier="${supplier.id}">${supplier.active ? 'Desactivar' : 'Activar'}</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="8" class="empty">No hay proveedores registrados.</td></tr>';
    }

    if ($('preferredSuppliers')) {
      const preferred = state.suppliers.filter(s => s.preferred && s.active);
      $('preferredSuppliers').innerHTML = preferred.map(s => `
        <div class="supplier-card">
          <strong>${escapeHtml(s.name)}</strong>
          <span>${escapeHtml(s.supplier_type)}${s.notes ? ` · ${escapeHtml(s.notes)}` : ''}</span>
          ${supplierWebsiteLink(s, 'Abrir portal')}
        </div>
      `).join('') || '<p class="empty">No hay proveedores preferidos.</p>';
    }

    if ($('catalogSupplier')) {
      const current = $('catalogSupplier').value;
      $('catalogSupplier').innerHTML = '<option value="">Sin proveedor</option>' + state.suppliers
        .filter(supplier => supplier.active)
        .map(supplier => `<option value="${escapeHtml(supplier.name)}">${escapeHtml(supplier.name)}</option>`)
        .join('');
      if ([...$('catalogSupplier').options].some(option => option.value === current)) $('catalogSupplier').value = current;
    }
  }

  function resetSupplierForm() {
    $('supplierForm').reset();
    $('supplierId').value = '';
    $('saveSupplierBtn').textContent = 'Guardar proveedor';
    $('cancelSupplierEditBtn').hidden = true;
    setMessage($('supplierMessage'));
  }

  function editSupplier(id) {
    const supplier = state.suppliers.find(item => item.id === id);
    if (!supplier) return;
    $('supplierId').value = supplier.id;
    $('supplierName').value = supplier.name;
    $('supplierType').value = supplier.supplier_type;
    $('supplierContact').value = supplier.primary_contact || '';
    $('supplierPhone').value = supplier.phone || '';
    $('supplierEmail').value = supplier.email || '';
    $('supplierWebsite').value = supplier.website || '';
    $('saveSupplierBtn').textContent = 'Guardar cambios';
    $('cancelSupplierEditBtn').hidden = false;
    setMessage($('supplierMessage'), `Editando ${supplier.name}.`, 'success');
    $('supplierName').focus();
  }

  async function saveSupplier(event) {
    event.preventDefault();
    setMessage($('supplierMessage'));
    $('saveSupplierBtn').disabled = true;
    const supplierId = $('supplierId').value;
    const rpcName = supplierId ? 'update_supplier' : 'create_supplier_simple';
    const rawWebsite = $('supplierWebsite').value.trim();
    const website = normalizeWebsiteUrl(rawWebsite);

    if (rawWebsite && !website) {
      $('saveSupplierBtn').disabled = false;
      return setMessage(
        $('supplierMessage'),
        'El sitio web no es válido. Usa una dirección como proveedor.com o https://proveedor.com.',
        'error'
      );
    }

    const params = {
      p_name: $('supplierName').value.trim(),
      p_supplier_type: $('supplierType').value,
      p_primary_contact: $('supplierContact').value.trim() || null,
      p_phone: $('supplierPhone').value.trim() || null,
      p_email: $('supplierEmail').value.trim() || null,
      p_website: website || null
    };
    if (supplierId) params.p_supplier_id = supplierId;
    const { error } = await sb.rpc(rpcName, params);
    $('saveSupplierBtn').disabled = false;
    if (error) return setMessage($('supplierMessage'), error.message, 'error');
    resetSupplierForm();
    setMessage($('supplierMessage'), supplierId ? 'Proveedor actualizado.' : 'Proveedor guardado.', 'success');
    await loadData();
  }

  async function toggleSupplier(id) {
    const supplier = state.suppliers.find(item => item.id === id);
    if (!supplier) return;
    const action = supplier.active ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${action} a ${supplier.name}?`)) return;
    const { error } = await sb.rpc('set_supplier_active', {
      p_supplier_id: id,
      p_active: !supplier.active
    });
    if (error) return alert(error.message);
    await loadData();
  }

  function renderMovementOptions() {
    $('movementBody').innerHTML = state.movements.map(m => {
      const previous = Number(m.previous_quantity || 0);
      const resulting = Number(m.resulting_quantity || 0);
      const delta = resulting - previous;
      const change = `${delta > 0 ? '+' : ''}${formatQty(delta)}`;
      return `<tr>
        <td>${escapeHtml(clinicName(m.clinic_id))}</td>
        <td>${new Date(m.created_at).toLocaleString()}</td>
        <td>${escapeHtml(m.products?.name || '')}</td>
        <td><span class="movement-type ${escapeHtml(m.movement_type)}">${movementLabel(m.movement_type)}</span></td>
        <td>${change}</td>
        <td>${formatQty(previous)}</td>
        <td>${formatQty(resulting)}</td>
        <td>${escapeHtml(m.reason)}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="8" class="empty">Todavía no hay movimientos.</td></tr>';

    $('movementProduct').innerHTML = state.stock.map(p =>
      `<option value="${p.product_id}" data-clinic="${p.clinic_id}" data-quantity="${Number(p.quantity || 0)}" data-minimum="${Number(p.minimum_stock || 0)}" data-name="${escapeHtml(p.name)}" data-clinic-name="${escapeHtml(p.clinic_name)}" data-unit="${escapeHtml(p.unit)}">${escapeHtml(p.clinic_name)} — ${escapeHtml(p.name)} — ${formatQty(p.quantity)} ${escapeHtml(p.unit)}(s)</option>`
    ).join('');
    populateLots();
    updateMovementQuantityLabel();
  }

  function movementLabel(type) {
    return type === 'entrada' ? 'Entrada' : type === 'salida' ? 'Salida' : 'Ajuste';
  }

  function updateAssignmentRequirements() {
    const option = $('assignmentProduct').selectedOptions[0];
    const requiresLot = option?.dataset.lot === 'true';
    const requiresExpiration = option?.dataset.expiration === 'true';
    const unit = option?.dataset.unit || '';

    $('assignmentLot').required = requiresLot;
    $('assignmentExpiration').required = requiresExpiration;
    $('assignmentLotLabel').style.opacity = requiresLot ? '1' : '.65';
    $('assignmentExpirationLabel').style.opacity = requiresExpiration ? '1' : '.65';

    if ($('assignmentQuantityLabel')) {
      $('assignmentQuantityLabel').textContent = unit
        ? `Cantidad actual (${unit})`
        : 'Cantidad actual';
    }
    if ($('assignmentMinimumLabel')) {
      $('assignmentMinimumLabel').textContent = unit
        ? `Nivel mínimo (${unit})`
        : 'Nivel mínimo';
    }
  }

  function populateLots() {
    const option = $('movementProduct').selectedOptions[0];
    if (!option) {
      $('movementLot').innerHTML = '';
      updateMovementPreview();
      return;
    }
    const lots = state.lots.filter(l => l.product_id === option.value && l.clinic_id === option.dataset.clinic);
    $('movementLot').innerHTML = lots.map(l =>
      `<option value="${l.id}" data-quantity="${Number(l.quantity || 0)}">${escapeHtml(l.lot_number || 'Sin lote')} — ${formatQty(l.quantity)} disponibles${l.expiration_date ? ` — vence ${escapeHtml(l.expiration_date)}` : ''}</option>`
    ).join('');
    updateMovementPreview();
  }

  function updateMovementPreview() {
    const productOption = $('movementProduct').selectedOptions[0];
    const lotOption = $('movementLot').selectedOptions[0];
    if (!productOption) {
      $('previewProduct').textContent = '—';
      $('previewClinic').textContent = '—';
      $('previewQuantity').textContent = '—';
      $('previewMinimum').textContent = '—';
      $('previewStatus').textContent = '—';
      return;
    }
    const quantity = lotOption ? Number(lotOption.dataset.quantity || 0) : Number(productOption.dataset.quantity || 0);
    const minimum = Number(productOption.dataset.minimum || 0);
    $('previewProduct').textContent = productOption.dataset.name || '—';
    $('previewClinic').textContent = productOption.dataset.clinicName || '—';
    $('previewQuantity').textContent = `${formatQty(quantity)} ${productOption.dataset.unit || ''}`;
    $('previewMinimum').textContent = formatQty(minimum);
    const status = quantity <= 0 ? 'Agotado' : quantity <= minimum ? 'Stock bajo' : 'Disponible';
    $('previewStatus').textContent = status;
    $('previewStatus').className = `preview-status ${quantity <= 0 ? 'out' : quantity <= minimum ? 'low' : 'ok'}`;
  }

  function updateMovementQuantityLabel() {
    const isAdjustment = $('movementType').value === 'ajuste';
    $('movementQuantityLabel').childNodes[0].nodeValue = isAdjustment ? 'Conteo físico ' : 'Cantidad ';
    $('movementQuantity').min = isAdjustment ? '0' : '0.01';
    $('movementQuantity').placeholder = isAdjustment ? 'Cantidad contada físicamente' : '';
    $('adjustmentPreview').hidden = !isAdjustment;
    updateAdjustmentPreview();
  }

  function updateAdjustmentPreview() {
    if ($('movementType').value !== 'ajuste') return;

    const lotOption = $('movementLot').selectedOptions[0];
    const current = Number(lotOption?.dataset.quantity || 0);
    const raw = $('movementQuantity').value;
    const counted = raw === '' ? null : Number(raw);

    $('adjustmentCurrent').textContent = formatQty(current);
    $('adjustmentCounted').textContent = counted === null || !Number.isFinite(counted) ? '—' : formatQty(counted);
    $('adjustmentDifference').textContent = counted === null || !Number.isFinite(counted)
      ? '—'
      : `${counted - current > 0 ? '+' : ''}${formatQty(counted - current)}`;
    $('adjustmentFinal').textContent = counted === null || !Number.isFinite(counted) ? '—' : formatQty(counted);

    if (counted === null || !Number.isFinite(counted)) {
      $('adjustmentExplanation').textContent = 'Introduce el conteo físico.';
      $('adjustmentExplanation').className = '';
    } else if (counted === current) {
      $('adjustmentExplanation').textContent = 'No hay cambios en el inventario.';
      $('adjustmentExplanation').className = 'adjustment-neutral';
    } else if (counted > current) {
      $('adjustmentExplanation').textContent = `Se agregarán ${formatQty(counted - current)} unidades.`;
      $('adjustmentExplanation').className = 'adjustment-positive';
    } else {
      $('adjustmentExplanation').textContent = `Se descontarán ${formatQty(current - counted)} unidades.`;
      $('adjustmentExplanation').className = 'adjustment-negative';
    }
  }



  function isMedicationCategory() {
    return $('catalogCategory').value === 'Medicamentos';
  }

  function buildStructuredProductName() {
    const base = $('catalogName').value.trim();
    if (!isMedicationCategory()) return base;

    const strength = $('catalogStrength').value.trim();
    const strengthUnit = $('catalogStrengthUnit').value;
    const volume = $('catalogVolume').value.trim();
    const volumeUnit = $('catalogVolumeUnit').value;
    const dosageForm = $('catalogDosageForm').value;

    const parts = [base];
    if (strength && strengthUnit) parts.push(`${strength} ${strengthUnit}`);
    if (dosageForm) parts.push(dosageForm);
    if (volume && volumeUnit) parts.push(`${volume} ${volumeUnit}`);

    return parts.filter(Boolean).join(' · ');
  }

  function updateMedicationFields() {
    const medication = isMedicationCategory();
    $('medicationFields').hidden = !medication;

    ['catalogStrength','catalogStrengthUnit','catalogVolume','catalogVolumeUnit','catalogDosageForm']
      .forEach(id => { $(id).required = medication; });

    if ($('catalogDosageForm').value === 'Vial multidosis') {
      $('catalogVolumeUnit').value = 'mL';
      $('catalogUnit').value = 'mL';
    }

    $('generatedProductName').textContent = buildStructuredProductName() || '—';
    showDuplicateSuggestions();
  }

  function normalizedMedicationKey(product) {
    return [
      product.base_name || product.name || '',
      product.strength || '',
      product.strength_unit || '',
      product.volume || '',
      product.volume_unit || '',
      product.dosage_form || ''
    ].map(value => String(value).toLowerCase().replace(/[^a-z0-9%]+/g, '')).join('|');
  }

  function showDuplicateSuggestions() {
    if (!isAdmin()) return;

    const box = $('duplicateSuggestions');
    const rawName = $('catalogName').value.trim();
    const generatedName = buildStructuredProductName();

    if (rawName.length < 3) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    const normalizedRaw = rawName.toLowerCase().replace(/[^a-z0-9%]+/g, '');
    const currentStructuredKey = [
      rawName,
      $('catalogStrength').value,
      $('catalogStrengthUnit').value,
      $('catalogVolume').value,
      $('catalogVolumeUnit').value,
      $('catalogDosageForm').value
    ].map(value => String(value || '').toLowerCase().replace(/[^a-z0-9%]+/g, '')).join('|');

    const editingId = $('catalogProductId').value;
    const matches = state.catalog.filter(product => {
      if (editingId && product.id === editingId) return false;
      const candidateName = (product.base_name || product.name || '').toLowerCase().replace(/[^a-z0-9%]+/g, '');
      const sameStructured = isMedicationCategory() && currentStructuredKey === normalizedMedicationKey(product);
      const similarName = candidateName.includes(normalizedRaw) || normalizedRaw.includes(candidateName);
      return sameStructured || similarName;
    }).slice(0, 6);

    if (!matches.length) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    box.hidden = false;
    box.innerHTML = `
      <strong>Revisa antes de crear: podría existir ya.</strong>
      ${matches.map(product =>
        `<button type="button" data-existing-product="${product.id}">
          ${escapeHtml(product.name)} · ${escapeHtml(product.unit)}
        </button>`
      ).join('')}
    `;

    $('generatedProductName').textContent = generatedName || '—';
  }

  async function createCatalogProduct(event) {
    event.preventDefault();
    if (!isAdmin()) return setMessage($('catalogMessage'), 'Solo el administrador puede crear o editar productos.', 'error');
    if (isMedicationCategory()) {
      const requiredMedicationFields = [
        $('catalogStrength').value.trim(),
        $('catalogStrengthUnit').value,
        $('catalogVolume').value.trim(),
        $('catalogVolumeUnit').value,
        $('catalogDosageForm').value
      ];
      if (requiredMedicationFields.some(value => !value)) {
        return setMessage(
          $('catalogMessage'),
          'Para medicamentos completa concentración, unidad, volumen y presentación.',
          'error'
        );
      }
    }
    if ($('catalogDosageForm').value === 'Vial multidosis') {
      const volume = Number($('catalogVolume').value);
      if (!Number.isFinite(volume) || volume <= 0 || $('catalogVolumeUnit').value !== 'mL') {
        return setMessage(
          $('catalogMessage'),
          'El vial multidosis requiere un volumen válido en mL.',
          'error'
        );
      }
      $('catalogUnit').value = 'mL';
    }
    setMessage($('catalogMessage'));
    $('saveCatalogBtn').disabled = true;
    const productId = $('catalogProductId').value;
    const params = {
      p_base_name: $('catalogName').value.trim(),
      p_strength: isMedicationCategory() ? $('catalogStrength').value.trim() : null,
      p_strength_unit: isMedicationCategory() ? $('catalogStrengthUnit').value : null,
      p_volume: isMedicationCategory() ? $('catalogVolume').value.trim() : null,
      p_volume_unit: isMedicationCategory() ? $('catalogVolumeUnit').value : null,
      p_dosage_form: isMedicationCategory() ? $('catalogDosageForm').value : null,
      p_category: $('catalogCategory').value,
      p_unit: $('catalogUnit').value,
      p_requires_lot: $('catalogRequiresLot').checked,
      p_requires_expiration: $('catalogRequiresExpiration').checked,
      p_supplier: $('catalogSupplier').value || null
    };
    if (productId) params.p_product_id = productId;
    const { error } = await sb.rpc(productId ? 'update_catalog_product' : 'create_catalog_product_simple', params);
    $('saveCatalogBtn').disabled = false;
    if (error) return setMessage($('catalogMessage'), error.message, 'error');
    resetProductForm();
    setMessage($('catalogMessage'), productId ? 'Producto actualizado.' : 'Producto creado.', 'success');
    await loadData();
  }

  async function assignProduct(event) {
    event.preventDefault();
    setMessage($('assignmentMessage'));
    const clinicId = $('assignmentClinic').value;
    const productId = $('assignmentProduct').value;
    if (!clinicId || !productId) {
      return setMessage($('assignmentMessage'), 'Selecciona una clínica y un producto.', 'error');
    }
    $('saveAssignmentBtn').disabled = true;
    const { error } = await sb.rpc('add_catalog_product_to_clinic', {
      p_clinic_id: clinicId,
      p_product_id: productId,
      p_initial_quantity: Number($('assignmentQuantity').value),
      p_minimum_stock: Number($('assignmentMinimum').value),
      p_lot_number: $('assignmentLot').value.trim() || null,
      p_expiration_date: $('assignmentExpiration').value || null
    });
    if (error) {
      $('saveAssignmentBtn').disabled = false;
      return setMessage($('assignmentMessage'), error.message, 'error');
    }
    $('assignmentQuantity').value = '';
    $('assignmentMinimum').value = '';
    $('assignmentLot').value = '';
    $('assignmentExpiration').value = '';
    clearProductSearch('assignmentProduct');
    setMessage($('assignmentMessage'), 'Producto agregado al inventario de la clínica.', 'success');
    await loadData();
  }

  async function createMovement(event) {
    event.preventDefault();
    setMessage($('movementMessage'));
    const option = $('movementProduct').selectedOptions[0];
    const lotOption = $('movementLot').selectedOptions[0];
    if (!option || !lotOption) {
      return setMessage($('movementMessage'), 'Selecciona un producto y un lote.', 'error');
    }
    const type = $('movementType').value;
    const quantity = Number($('movementQuantity').value);
    if (!Number.isFinite(quantity) || quantity < 0 || (type !== 'ajuste' && quantity <= 0)) {
      return setMessage($('movementMessage'), type === 'ajuste' ? 'El conteo físico no puede ser negativo.' : 'La cantidad debe ser mayor que cero.', 'error');
    }
    if (type === 'ajuste') {
      const currentLotQuantity = Number(lotOption.dataset.quantity || 0);
      if (quantity === currentLotQuantity) {
        return setMessage($('movementMessage'), 'No hay cambios en el inventario.', 'error');
      }
    }
    $('saveMovementBtn').disabled = true;
    const { error } = await sb.rpc('record_inventory_movement', {
      p_clinic_id: option.dataset.clinic,
      p_product_id: option.value,
      p_lot_id: lotOption.value,
      p_type: type,
      p_quantity: quantity,
      p_reason: $('movementReason').value.trim()
    });
    $('saveMovementBtn').disabled = false;
    if (error) return setMessage($('movementMessage'), error.message, 'error');
    $('movementQuantity').value = '';
    $('movementReason').value = '';
    setMessage($('movementMessage'), 'Movimiento guardado y stock actualizado.', 'success');
    await loadData();
  }





  function syncConsumptionClinicWithHeader() {
    const mainClinic = $('clinicSelector');
    if (!mainClinic || !$('consumptionClinic')) return;
    if (mainClinic.value && mainClinic.value !== 'all') {
      $('consumptionClinic').value = mainClinic.value;
      updateConsumptionProducts();
    }
  }

  function renderConsumption() {
    if (!$('consumptionClinic')) return;
    $('consumptionClinic').innerHTML = state.clinics.map(clinic =>
      `<option value="${clinic.id}">${escapeHtml(clinic.name)}</option>`
    ).join('');
    updateConsumptionProducts();
    syncConsumptionClinicWithHeader();
  }

  function updateConsumptionProducts() {
    const clinicId = isStaff() ? activeClinicId() : $('consumptionClinic').value;
    const products = state.stock.filter(item => item.clinic_id === clinicId && Number(item.quantity) > 0);
    $('consumptionProduct').innerHTML =
      '<option value="">Selecciona producto</option>' +
      products.map(item =>
        `<option value="${item.product_id}">${escapeHtml(item.product_code || '')} — ${escapeHtml(item.name)}</option>`
      ).join('');
    updateConsumptionInfo();
    syncProductSearch('consumptionProduct');
  }

  function getConsumptionStock(clinicId, productId) {
    return state.stock.find(item => item.clinic_id === clinicId && item.product_id === productId);
  }

  function getConsumptionLots(clinicId, productId) {
    return state.lots
      .filter(lot => lot.clinic_id === clinicId && lot.product_id === productId && Number(lot.quantity) > 0)
      .sort((a, b) => {
        const aDate = a.expiration_date ? new Date(`${a.expiration_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.expiration_date ? new Date(`${b.expiration_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate || new Date(a.created_at || 0) - new Date(b.created_at || 0);
      });
  }

  function updateConsumptionInfo() {
    const clinicId = isStaff() ? activeClinicId() : $('consumptionClinic').value;
    const productId = $('consumptionProduct').value;
    const stock = getConsumptionStock(clinicId, productId);
    const lots = getConsumptionLots(clinicId, productId);
    const nextLot = lots[0];

    $('consumptionUnit').textContent = stock?.unit || '—';
    $('consumptionAvailable').textContent = stock ? `${formatQty(stock.quantity)} ${stock.unit}` : '—';

    $('consumptionNextLot').textContent = nextLot
      ? `${nextLot.lot_number || 'Sin lote'} · ${formatQty(nextLot.quantity)} ${stock?.unit || ''}`
      : '—';

    $('consumptionNextExpiration').textContent = nextLot?.expiration_date
      ? `Vence ${nextLot.expiration_date}`
      : nextLot ? 'Sin vencimiento registrado' : '';

    $('consumptionSummaryClinic').textContent =
      state.clinics.find(item => item.id === clinicId)?.name || '—';
    $('consumptionSummaryProduct').textContent = stock?.name || '—';
    $('consumptionSummaryCurrent').textContent =
      stock ? `${formatQty(stock.quantity)} ${stock.unit}` : '—';

    const lotsPreview = $('consumptionLotsPreview');
    if (lots.length && stock) {
      lotsPreview.hidden = false;
      lotsPreview.innerHTML = `
        <strong>Lotes disponibles</strong>
        ${lots.map(lot => `
          <div class="lot-preview-row">
            <span>${escapeHtml(lot.lot_number || 'Sin lote')}</span>
            <span>${formatQty(lot.quantity)} ${escapeHtml(stock.unit)}</span>
            <span>${lot.expiration_date ? `Vence ${escapeHtml(lot.expiration_date)}` : 'Sin vencimiento'}</span>
          </div>
        `).join('')}
      `;
    } else {
      lotsPreview.hidden = true;
      lotsPreview.innerHTML = '';
    }

    updateConsumptionMath();
  }

  function updateConsumptionMath() {
    const clinicId = isStaff() ? activeClinicId() : $('consumptionClinic').value;
    const productId = $('consumptionProduct').value;
    const stock = getConsumptionStock(clinicId, productId);
    const outgoing = Number($('consumptionQuantity').value || 0);
    const current = Number(stock?.quantity || 0);

    $('consumptionSummaryOutgoing').textContent =
      outgoing > 0 && stock ? `${formatQty(outgoing)} ${stock.unit}` : '—';

    $('consumptionSummaryAfter').textContent =
      outgoing > 0 && stock && outgoing <= current
        ? `${formatQty(current - outgoing)} ${stock.unit}`
        : outgoing > current && stock
          ? 'Stock insuficiente'
          : '—';
  }

  async function consumeStock(event) {
    event.preventDefault();
    setMessage($('consumptionMessage'));
    $('consumptionSuccessCard').hidden = true;

    const clinicId = isStaff() ? activeClinicId() : $('consumptionClinic').value;
    const productId = $('consumptionProduct').value;
    const quantity = Number($('consumptionQuantity').value);
    const stock = getConsumptionStock(clinicId, productId);

    if (!clinicId || !productId) {
      return setMessage($('consumptionMessage'), 'Selecciona clínica y producto.', 'error');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return setMessage($('consumptionMessage'), 'La cantidad debe ser mayor que cero.', 'error');
    }
    if (!stock || quantity > Number(stock.quantity)) {
      return setMessage(
        $('consumptionMessage'),
        `Stock insuficiente. Disponible: ${formatQty(stock?.quantity || 0)} ${stock?.unit || ''}.`,
        'error'
      );
    }

    $('saveConsumptionBtn').disabled = true;
    $('saveConsumptionBtn').textContent = 'Guardando...';

    try {
      const { data, error } = await sb.rpc('consume_inventory_stock', {
        p_clinic_id: clinicId,
        p_product_id: productId,
        p_quantity: quantity,
        p_reason: $('consumptionReason').value,
        p_notes: $('consumptionNotes').value.trim() || null
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      $('consumptionSuccessCard').hidden = false;
      const usedLotText = result?.lots_used || '';
      const usedLotsDetailed = usedLotText
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => {
          const lotNumber = item.split(':')[0]?.trim();
          const lot = state.lots.find(l =>
            l.clinic_id === clinicId &&
            l.product_id === productId &&
            (l.lot_number || 'sin lote') === lotNumber
          );
          return lot
            ? `${item}${lot.expiration_date ? ` · vence ${lot.expiration_date}` : ''}`
            : item;
        })
        .join('<br>');

      $('consumptionSuccessCard').innerHTML = `
        <strong>Salida registrada</strong>
        <p>${escapeHtml(stock.name)} · ${formatQty(quantity)} ${escapeHtml(stock.unit)}</p>
        <p>Stock: ${formatQty(result?.previous_quantity || 0)} → ${formatQty(result?.resulting_quantity || 0)}</p>
        <p><strong>Lotes utilizados</strong><br>${usedLotsDetailed || 'Sin lote registrado'}</p>
      `;

      $('consumptionQuantity').value = '';
      $('consumptionNotes').value = '';
      setMessage($('consumptionMessage'), 'Salida guardada y stock actualizado.', 'success');
      const selectedProductId = productId;
      await loadData();
      $('consumptionProduct').value = selectedProductId;
      syncProductSearch('consumptionProduct');
      updateConsumptionInfo();
    } catch (error) {
      setMessage($('consumptionMessage'), error.message, 'error');
    } finally {
      $('saveConsumptionBtn').disabled = false;
      $('saveConsumptionBtn').textContent = 'Registrar salida';
    }
  }



  function renderAudit() {
    if (!isAdmin() || !$('auditBody')) return;

    if (!$('auditClinic').dataset.ready) {
      $('auditClinic').innerHTML = '<option value="">Todas</option>' +
        state.transferDestinations.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

      $('auditUser').innerHTML = '<option value="">Todos</option>' +
        state.users.map(u => `<option value="${u.id}">${escapeHtml(u.full_name)}</option>`).join('');

      $('auditProduct').innerHTML = '<option value="">Todos</option>' +
        state.catalog
          .slice()
          .sort((a,b) => a.name.localeCompare(b.name))
          .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
          .join('');

      $('auditClinic').dataset.ready = 'true';
    }

    const clinicId = $('auditClinic').value;
    const userId = $('auditUser').value;
    const productId = $('auditProduct').value;
    const type = $('auditType').value;
    const from = $('auditDateFrom').value;
    const to = $('auditDateTo').value;
    const search = $('auditSearch').value.trim().toLowerCase();

    const rows = state.auditRows.filter(row => {
      if (clinicId && row.clinic_id !== clinicId) return false;
      if (userId && row.performed_by !== userId) return false;
      if (productId && row.product_id !== productId) return false;
      if (type && row.movement_type !== type) return false;

      const rowDate = row.created_at?.slice(0,10) || '';
      if (from && rowDate < from) return false;
      if (to && rowDate > to) return false;

      if (search) {
        const haystack = `${row.product_name || ''} ${row.user_name || ''} ${row.clinic_name || ''} ${row.reason || ''} ${row.lot_number || ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    $('auditBody').innerHTML = rows.map(row => {
      const previous = Number(row.previous_quantity || 0);
      const resulting = Number(row.resulting_quantity || 0);
      const delta = resulting - previous;
      const sign = delta > 0 ? '+' : '';
      return `<tr>
        <td>${row.created_at ? new Date(row.created_at).toLocaleString() : ''}</td>
        <td>${escapeHtml(row.clinic_name || '')}</td>
        <td>${escapeHtml(row.user_name || '')}</td>
        <td>${escapeHtml(row.product_name || '')}</td>
        <td><span class="movement-type ${escapeHtml(row.movement_type || '')}">${movementLabel(row.movement_type)}</span></td>
        <td>${sign}${formatQty(delta)}</td>
        <td>${formatQty(previous)}</td>
        <td>${formatQty(resulting)}</td>
        <td>${escapeHtml(row.lot_number || 'Sin lote')}</td>
        <td>${escapeHtml(row.expiration_date || '—')}</td>
        <td>${escapeHtml(row.reason || '')}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="11" class="empty">No hay registros para estos filtros.</td></tr>';

    const localDateKey = value => {
      if (!value) return '';

      const date = new Date(value);

      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('-');
    };

    const today = localDateKey(new Date());

    const todayRows = state.auditRows.filter(
      row => localDateKey(row.created_at) === today
    );

    $('auditTodayCount').textContent = todayRows.length;
    $('auditTodayEntries').textContent = todayRows.filter(row => row.movement_type === 'entrada').length;
    $('auditTodayExits').textContent = todayRows.filter(row => row.movement_type === 'salida').length;
    $('auditPendingTransfers').textContent = state.transfers.filter(t => t.status === 'pending').length;
  }

  function clearAuditFilters() {
    $('auditClinic').value = '';
    $('auditUser').value = '';
    $('auditProduct').value = '';
    $('auditType').value = '';
    $('auditDateFrom').value = '';
    $('auditDateTo').value = '';
    $('auditSearch').value = '';
    renderAudit();
  }

  function transferOriginClinicId() {
    if (isStaff()) return primaryClinicId();
    const selected = $('clinicSelector').value;
    return selected && selected !== 'all' ? selected : primaryClinicId();
  }

  function transferLotsForSelection() {
    const originId = transferOriginClinicId();
    const productId = $('transferProduct').value;
    return productLotsForClinic(productId, originId);
  }

  function updateTransferLots() {
    const lots = transferLotsForSelection();
    const previousLotId = $('transferLot').value;

    $('transferLot').innerHTML =
      '<option value="">Selecciona lote</option>' +
      lots.map(lot => `
        <option
          value="${lot.id}"
          data-quantity="${Number(lot.quantity || 0)}"
          data-expiration="${escapeHtml(lot.expiration_date || '')}"
          data-lot-number="${escapeHtml(lot.lot_number || '')}">
          ${escapeHtml(lot.lot_number || 'Sin número')} — ${formatQty(lot.quantity)} disponibles${lot.expiration_date ? ` — vence ${escapeHtml(lot.expiration_date)}` : ''}
        </option>
      `).join('');

    if (lots.some(lot => lot.id === previousLotId)) {
      $('transferLot').value = previousLotId;
    }

    updateTransferLotInfo();
  }

  function updateTransferLotInfo() {
    const option = $('transferLot').selectedOptions[0];
    const box = $('transferLotInfo');

    if (!option?.value) {
      box.hidden = true;
      box.textContent = '';
      return;
    }

    const quantity = Number(option.dataset.quantity || 0);
    const expiration = option.dataset.expiration || '';
    box.hidden = false;
    box.textContent =
      `Lote ${option.dataset.lotNumber || 'sin número'} · Disponible ${formatQty(quantity)}${expiration ? ` · Vence ${expiration}` : ''}`;
  }

  function transferLotsMarkup(transferId, unit) {
    const lots = state.transferLots.filter(lot => lot.transfer_id === transferId);
    if (!lots.length) return '<p><strong>Lote:</strong> No registrado</p>';

    return `
      <div class="transfer-lots-summary">
        <strong>Lote transferido</strong>
        ${lots.map(lot => `
          <span>${escapeHtml(lot.lot_number || 'Sin número')} · ${formatQty(lot.quantity)} ${escapeHtml(unit || '')}${lot.expiration_date ? ` · vence ${escapeHtml(lot.expiration_date)}` : ''}</span>
        `).join('')}
      </div>
    `;
  }

  function renderTransfers() {
    if (!$('transferForm')) return;

    const originId = transferOriginClinicId();
    const origin = state.clinics.find(c => c.id === originId);
    $('transferOriginName').value = origin?.name || '';

    $('transferDestination').innerHTML =
      '<option value="">Selecciona destino</option>' +
      state.transferDestinations
        .filter(c => c.id !== originId)
        .map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
        .join('');

    const available = state.stock
      .filter(item => item.clinic_id === originId && Number(item.quantity) > 0)
      .sort((a,b) => a.name.localeCompare(b.name));

    $('transferProduct').innerHTML =
      '<option value="">Selecciona producto</option>' +
      available.map(item =>
        `<option value="${item.product_id}">${escapeHtml(item.name)} — ${formatQty(item.quantity)} ${escapeHtml(item.unit)}</option>`
      ).join('');

    syncProductSearch('transferProduct');
    updateTransferLots();

    const incoming = state.transfers.filter(t =>
      t.to_clinic_id === originId && t.status === 'pending'
    );

    $('incomingTransfers').innerHTML = incoming.map(t => `
      <article class="transfer-card">
        <h3>${escapeHtml(t.products?.name || '')}</h3>
        <p><strong>Origen:</strong> ${escapeHtml(t.from_clinic?.name || '')}</p>
        <p><strong>Cantidad:</strong> ${formatQty(t.quantity)} ${escapeHtml(t.products?.unit || '')}</p>
        ${transferLotsMarkup(t.id, t.products?.unit)}
        <p><strong>Comentario:</strong> ${escapeHtml(t.comment || '')}</p>
        <div class="transfer-actions">
          <button type="button" data-accept-transfer="${t.id}">Recibir</button>
          <button type="button" class="secondary" data-problem-transfer="${t.id}">Reportar problema</button>
        </div>
      </article>
    `).join('') || '<p class="empty">No hay transferencias pendientes.</p>';

    $('transferHistoryBody').innerHTML = state.transfers.map(t => `
      <tr>
        <td>${new Date(t.created_at).toLocaleString()}</td>
        <td>${escapeHtml(t.products?.name || '')}</td>
        <td>${escapeHtml(t.from_clinic?.name || '')}</td>
        <td>${escapeHtml(t.to_clinic?.name || '')}</td>
        <td>${formatQty(t.quantity)} ${escapeHtml(t.products?.unit || '')}</td>
        <td>${state.transferLots.filter(lot => lot.transfer_id === t.id).map(lot => `${escapeHtml(lot.lot_number || 'Sin número')} (${formatQty(lot.quantity)})`).join('<br>') || '—'}</td>
        <td><span class="status ${t.status === 'completed' ? 'ok' : t.status === 'problem' ? 'out' : 'low'}">${transferStatusLabel(t.status)}</span></td>
        <td>${escapeHtml(t.problem_note || t.comment || '')}</td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="empty">No hay transferencias.</td></tr>';
  }

  function transferStatusLabel(status) {
    return status === 'completed' ? 'Recibida' : status === 'problem' ? 'Problema' : 'Pendiente';
  }

  async function createTransfer(event) {
    event.preventDefault();
    setMessage($('transferMessage'));

    const originId = transferOriginClinicId();
    const destinationId = $('transferDestination').value;
    const productId = $('transferProduct').value;
    const lotId = $('transferLot').value;
    const quantity = Number($('transferQuantity').value);
    const comment = $('transferComment').value.trim();

    if (!originId || !destinationId || !productId || !lotId || !comment) {
      return setMessage($('transferMessage'), 'Completa todos los campos, incluido el lote.', 'error');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return setMessage($('transferMessage'), 'La cantidad debe ser mayor que cero.', 'error');
    }

    $('saveTransferBtn').disabled = true;
    try {
      const selectedLot = $('transferLot').selectedOptions[0];
      const availableInLot = Number(selectedLot?.dataset.quantity || 0);

      if (quantity > availableInLot) {
        throw new Error(`Ese lote solo tiene ${formatQty(availableInLot)} disponibles.`);
      }

      const { error } = await sb.rpc('create_inventory_transfer_from_lot', {
        p_from_clinic_id: originId,
        p_to_clinic_id: destinationId,
        p_product_id: productId,
        p_lot_id: lotId,
        p_quantity: quantity,
        p_comment: comment
      });
      if (error) throw error;

      $('transferQuantity').value = '';
      $('transferLot').value = '';
      $('transferComment').value = '';
      clearProductSearch('transferProduct');
      updateTransferLotInfo();
      setMessage($('transferMessage'), 'Transferencia enviada y pendiente de recepción.', 'success');
      await loadData();
    } catch (error) {
      setMessage($('transferMessage'), error.message, 'error');
    } finally {
      $('saveTransferBtn').disabled = false;
    }
  }

  async function acceptTransfer(id) {
    if (!confirm('¿Confirmas que la mercancía llegó físicamente a la clínica?')) return;
    const { error } = await sb.rpc('accept_inventory_transfer', { p_transfer_id: id });
    if (error) return alert(error.message);
    await loadData();
  }

  async function reportTransferProblem(id) {
    const note = prompt('Describe el problema:');
    if (!note?.trim()) return;
    const { error } = await sb.rpc('report_inventory_transfer_problem', {
      p_transfer_id: id,
      p_problem_note: note.trim()
    });
    if (error) return alert(error.message);
    await loadData();
  }

  function updateReceivingSupplierPortal() {
    const supplier = state.suppliers.find(item => item.id === $('receivingSupplier')?.value);
    const url = normalizeWebsiteUrl(supplier?.website);
    const link = $('receivingSupplierPortal');

    if (!link) return;

    if (!url) {
      link.hidden = true;
      link.removeAttribute('href');
      return;
    }

    link.href = url;
    link.textContent = `Abrir portal de ${supplier.name}`;
    link.hidden = false;
  }

  function renderReceiving() {
    if (!$('receivingClinic')) return;

    $('receivingClinic').innerHTML = state.clinics.map(clinic =>
      `<option value="${clinic.id}">${escapeHtml(clinic.name)}</option>`
    ).join('');
$('receivingClinic').value = activeClinicId();
    $('receivingSupplier').innerHTML =
      '<option value="">Selecciona proveedor</option>' +
      state.suppliers.filter(s => s.active).map(s =>
        `<option value="${s.id}">${escapeHtml(s.name)}</option>`
      ).join('');

    updateReceivingProducts();
    updateReceivingProductInfo();
    updateReceivingSupplierPortal();
  }

  function updateReceivingProducts() {
    const clinicId = isStaff() ? activeClinicId() : $('receivingClinic').value;
    const assignedIds = new Set(
      state.stock.filter(item => item.clinic_id === clinicId).map(item => item.product_id)
    );

    const products = state.catalog.filter(product => product.active && assignedIds.has(product.id));
    $('receivingProduct').innerHTML =
      '<option value="">Selecciona producto</option>' +
      products.map(product =>
        `<option value="${product.id}">${escapeHtml(product.product_code || '')} — ${escapeHtml(product.name)}</option>`
      ).join('');

    updateReceivingProductInfo();
    syncProductSearch('receivingProduct');
  }

  function currentReceivingStock(clinicId, productId) {
    return state.stock.find(item => item.clinic_id === clinicId && item.product_id === productId);
  }

  function updateReceivingProductInfo() {
    const clinicId = isStaff() ? activeClinicId() : $('receivingClinic').value;
    const productId = $('receivingProduct').value;
    const product = state.catalog.find(item => item.id === productId);
    const stock = currentReceivingStock(clinicId, productId);

    $('receivingCategory').textContent = product?.category || '—';
    $('receivingUnit').textContent = product?.unit || '—';
    $('receivingPreferredSupplier').textContent = product?.supplier || '—';

    const requiresLot = !!product?.requires_lot;
    const requiresExpiration = !!product?.requires_expiration;
    $('receivingLotLabel').hidden = !requiresLot;
    $('receivingExpirationLabel').hidden = !requiresExpiration;
    $('receivingLot').required = requiresLot;
    $('receivingExpiration').required = requiresExpiration;

    if (product?.supplier) {
      const supplier = state.suppliers.find(item =>
        item.name.toLowerCase() === product.supplier.toLowerCase()
      );
      if (supplier) $('receivingSupplier').value = supplier.id;
    }

    updateReceivingSupplierPortal();

    $('receivingSummaryClinic').textContent =
      state.clinics.find(item => item.id === clinicId)?.name || '—';
    $('receivingSummaryProduct').textContent = product?.name || '—';
    $('receivingSummaryCurrent').textContent =
      stock ? `${formatQty(stock.quantity)} ${stock.unit}` : '—';

    const multidose = isMultidoseProduct(product);
    const volumeMl = productVolumeMl(product);

    if ($('receivingQuantityLabel')) {
      $('receivingQuantityLabel').textContent = multidose
        ? 'Cantidad de viales recibidos'
        : 'Cantidad recibida';
    }

    if ($('receivingConversionHint')) {
      if (multidose && volumeMl) {
        $('receivingConversionHint').hidden = false;
        $('receivingConversionHint').textContent =
          `Cada vial contiene ${formatQty(volumeMl)} mL. El inventario se almacenará y descontará en mL.`;
      } else {
        $('receivingConversionHint').hidden = true;
        $('receivingConversionHint').textContent = '';
      }
    }

    updateReceivingMath();
  }

  function updateReceivingMath() {
    const clinicId = isStaff() ? activeClinicId() : $('receivingClinic').value;
    const productId = $('receivingProduct').value;
    const product = state.catalog.find(item => item.id === productId);
    const stock = currentReceivingStock(clinicId, productId);
    const containers = Number($('receivingQuantity').value || 0);
    const incomingStock = receivingStockQuantity(product, containers);
    const current = Number(stock?.quantity || 0);
    const volumeMl = productVolumeMl(product);

    $('receivingSummaryIncoming').textContent =
      containers > 0 && stock
        ? volumeMl
          ? `${formatQty(containers)} vial(es) = ${formatQty(incomingStock)} mL`
          : `${formatQty(incomingStock)} ${stock.unit}`
        : '—';

    $('receivingSummaryAfter').textContent =
      containers > 0 && stock
        ? `${formatQty(current + incomingStock)} ${stock.unit}`
        : '—';

    if ($('receivingConversionHint') && volumeMl) {
      $('receivingConversionHint').hidden = false;
      $('receivingConversionHint').textContent = containers > 0
        ? `${formatQty(containers)} vial(es) × ${formatQty(volumeMl)} mL = ${formatQty(incomingStock)} mL que se añadirán al inventario.`
        : `Cada vial contiene ${formatQty(volumeMl)} mL.`;
    }
  }

  async function receiveStock(event) {
    event.preventDefault();
    setMessage($('receivingMessage'));
    $('receivingSuccessCard').hidden = true;

    const clinicId = isStaff() ? activeClinicId() : $('receivingClinic').value;
    const productId = $('receivingProduct').value;
    const supplierId = $('receivingSupplier').value;
    const quantity = Number($('receivingQuantity').value);
    const product = state.catalog.find(item => item.id === productId);
    const supplier = state.suppliers.find(item => item.id === supplierId);

    if (!clinicId || !productId || !supplierId) {
      return setMessage($('receivingMessage'), 'Selecciona clínica, proveedor y producto.', 'error');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return setMessage($('receivingMessage'), 'La cantidad debe ser mayor que cero.', 'error');
    }
    if (product?.requires_lot && !$('receivingLot').value.trim()) {
      return setMessage($('receivingMessage'), 'Este producto requiere número de lote.', 'error');
    }
    if (product?.requires_expiration && !$('receivingExpiration').value) {
      return setMessage($('receivingMessage'), 'Este producto requiere fecha de vencimiento.', 'error');
    }
    if ($('receivingExpiration').value) {
      const expiration = new Date(`${$('receivingExpiration').value}T00:00:00`);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (expiration < today) {
        return setMessage($('receivingMessage'), 'No se puede recibir un producto ya vencido.', 'error');
      }
    }

    $('saveReceivingBtn').disabled = true;
    try {
      const { data, error } = await sb.rpc('receive_inventory_stock', {
        p_clinic_id: clinicId,
        p_product_id: productId,
        p_supplier_id: supplierId,
        p_quantity: quantity,
        p_lot_number: $('receivingLot').value.trim() || null,
        p_expiration_date: $('receivingExpiration').value || null,
        p_invoice_number: $('receivingInvoice').value.trim() || null,
        p_notes: $('receivingNotes').value.trim() || null
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      $('receivingSuccessCard').hidden = false;
      const receivedStockQuantity = receivingStockQuantity(product, quantity);
      const receivedVolumeMl = productVolumeMl(product);

      $('receivingSuccessCard').innerHTML = `
        <strong>Recepción registrada</strong>
        <p>${escapeHtml(product.name)} · ${
          receivedVolumeMl
            ? `${formatQty(quantity)} vial(es) = ${formatQty(receivedStockQuantity)} mL`
            : `${formatQty(quantity)} ${escapeHtml(product.unit)}`
        }</p>
        <p>Proveedor: ${escapeHtml(supplier.name)}</p>
        <p>Stock: ${formatQty(result?.previous_quantity || 0)} → ${formatQty(result?.resulting_quantity || 0)} ${escapeHtml(product.unit)}</p>
        ${$('receivingLot').value ? `<p>Lote: ${escapeHtml($('receivingLot').value)}</p>` : ''}
        ${$('receivingExpiration').value ? `<p>Vence: ${escapeHtml($('receivingExpiration').value)}</p>` : ''}
      `;

      $('receivingQuantity').value = '';
      $('receivingInvoice').value = '';
      $('receivingLot').value = '';
      $('receivingExpiration').value = '';
      $('receivingNotes').value = '';
      clearProductSearch('receivingProduct');
      setMessage($('receivingMessage'), 'Recepción guardada y stock actualizado.', 'success');
      await loadData();
    } catch (error) {
      setMessage($('receivingMessage'), error.message, 'error');
    } finally {
      $('saveReceivingBtn').disabled = false;
    }
  }

  function renderUsers() {
    if (!isAdmin() || !$('usersBody')) return;
    const search = $('userSearch').value.trim().toLowerCase();
    const visible = state.users.filter(user =>
      !search || `${user.full_name} ${user.email} ${user.role} ${user.clinic_names || ''}`.toLowerCase().includes(search)
    );
    $('usersBody').innerHTML = visible.map(user => `<tr>
      <td>${escapeHtml(user.full_name)}</td>
      <td>${escapeHtml(user.email || '')}</td>
      <td>${escapeHtml(user.role)}</td>
      <td>${escapeHtml(user.clinic_names || '')}</td>
      <td><span class="status ${user.active ? 'ok' : 'out'}">${user.active ? 'Activo' : 'Inactivo'}</span></td>
      <td class="row-actions">
        <button type="button" class="small secondary" data-edit-user="${user.id}">Editar permisos</button>
        <button type="button" class="small secondary" data-reset-user="${user.id}">Contraseña</button>
        ${user.id !== state.profile.id ? `<button type="button" class="small ${user.active ? 'danger-button' : ''}" data-toggle-user="${user.id}">${user.active ? 'Desactivar' : 'Activar'}</button>` : ''}
      </td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">No hay usuarios.</td></tr>';

    $('newUserClinics').innerHTML = state.clinics.map(clinic =>
      `<label class="check-label"><input type="checkbox" value="${clinic.id}" /> ${escapeHtml(clinic.name)}</label>`
    ).join('');
  }


  function closeEditUserDialog() {
    const dialog = $('editUserDialog');
    if (dialog?.open) dialog.close();
    $('editUserForm').reset();
    $('editUserId').value = '';
    setMessage($('editUserMessage'));
  }

  function openEditUserDialog(userId) {
    const user = state.users.find(item => item.id === userId);
    if (!user) return;

    $('editUserId').value = user.id;
    $('editUserName').value = user.full_name || '';
    $('editUserRole').value = user.role;
    $('editUserEmail').textContent = user.email || '';

    const assignedIds = new Set(user.clinic_ids || []);
    $('editUserClinics').innerHTML = state.clinics.map(clinic => `
      <label class="check-label">
        <input type="checkbox" value="${clinic.id}" ${assignedIds.has(clinic.id) ? 'checked' : ''} />
        ${escapeHtml(clinic.name)}
      </label>
    `).join('');

    const editingSelf = user.id === state.profile.id;
    $('editUserRole').disabled = editingSelf;
    $('editUserWarning').hidden = !editingSelf;
    $('editUserWarning').textContent = editingSelf
      ? 'Por seguridad, no puedes cambiar tu propio rol de administrador.'
      : '';

    setMessage($('editUserMessage'));

    const dialog = $('editUserDialog');
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute('open', '');
  }

  async function saveEditedUser(event) {
    event.preventDefault();
    setMessage($('editUserMessage'));

    const userId = $('editUserId').value;
    const user = state.users.find(item => item.id === userId);
    if (!user) {
      return setMessage($('editUserMessage'), 'Usuario no encontrado.', 'error');
    }

    const clinicIds = [...$('editUserClinics').querySelectorAll('input:checked')]
      .map(input => input.value);

    if (!clinicIds.length) {
      return setMessage(
        $('editUserMessage'),
        'Selecciona al menos una clínica.',
        'error'
      );
    }

    const nextRole = userId === state.profile.id
      ? user.role
      : $('editUserRole').value;

    if (!confirm(
      `¿Confirmas guardar estos cambios para ${user.full_name}?\n\n` +
      `Rol: ${user.role} → ${nextRole}\n` +
      `Clínicas asignadas: ${clinicIds.length}`
    )) return;

    $('saveEditUserBtn').disabled = true;
    $('saveEditUserBtn').textContent = 'Guardando...';

    try {
      await apiRequest('updateUser', {
        userId,
        fullName: $('editUserName').value.trim(),
        role: nextRole,
        clinicIds
      });

      const result = await apiRequest('list');
      state.users = result.users || [];
      renderUsers();
      closeEditUserDialog();
      alert('Permisos del usuario actualizados.');
    } catch (error) {
      setMessage($('editUserMessage'), error.message, 'error');
    } finally {
      $('saveEditUserBtn').disabled = false;
      $('saveEditUserBtn').textContent = 'Guardar cambios';
    }
  }

  async function createUser(event) {
    event.preventDefault();
    setMessage($('userMessage'));
    const clinicIds = [...$('newUserClinics').querySelectorAll('input:checked')].map(input => input.value);
    if (!clinicIds.length) return setMessage($('userMessage'), 'Selecciona al menos una clínica.', 'error');
    $('createUserBtn').disabled = true;
    try {
      await apiRequest('create', {
        fullName: $('newUserName').value.trim(),
        email: $('newUserEmail').value.trim(),
        role: $('newUserRole').value,
        password: $('newUserPassword').value,
        clinicIds
      });
      event.target.reset();
      setMessage($('userMessage'), 'Usuario creado. Entrará con la contraseña temporal.', 'success');
      const result = await apiRequest('list');
      state.users = result.users || [];
      renderUsers();
    } catch (error) {
      setMessage($('userMessage'), error.message, 'error');
    } finally {
      $('createUserBtn').disabled = false;
    }
  }

  async function toggleUser(userId) {
    const user = state.users.find(item => item.id === userId);
    if (!user) return;
    const next = !user.active;
    if (!confirm(`¿Deseas ${next ? 'activar' : 'desactivar'} a ${user.full_name}?`)) return;
    try {
      await apiRequest('setActive', { userId, active: next });
      const result = await apiRequest('list');
      state.users = result.users || [];
      renderUsers();
    } catch (error) {
      alert(error.message);
    }
  }

  async function resetUserPassword(userId) {
    const user = state.users.find(item => item.id === userId);
    if (!user) return;
    const password = prompt(`Nueva contraseña temporal para ${user.full_name} (mínimo 10 caracteres):`);
    if (!password) return;
    if (password.length < 10) return alert('La contraseña debe tener al menos 10 caracteres.');
    try {
      await apiRequest('resetPassword', { userId, password });
      alert('Contraseña temporal actualizada.');
    } catch (error) {
      alert(error.message);
    }
  }

  function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(view => { view.hidden = view.id !== viewId; });
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === viewId));
  }

  async function initializeSession(session) {
    state.session = session;
    if (!session) {
      state.session = null;
      $('loginPassword').value = '';
      showAuth();
      return;
    }
    try {
      await loadIdentity();
      showApp();
      await loadData();
    } catch (error) {
      console.error(error);
      await sb.auth.signOut();
      showAuth();
      setMessage($('loginMessage'), error.message || 'No fue posible cargar el perfil.', 'error');
    }
  }

  $('loginForm').addEventListener('submit', signIn);
  $('logoutBtn').addEventListener('click', signOut);
  $('addLocationBtn').addEventListener('click', () => $('addLocationDialog').showModal());
  $('cancelLocationBtn').addEventListener('click', () => $('addLocationDialog').close());
  $('addLocationForm').addEventListener('submit', addLocation);
  $('clinicSelector').addEventListener('change', async (e) => { state.selectedClinic = e.target.value; await loadData(); });
  $('search').addEventListener('input', renderDashboard);
  $('exportInventoryCsv').addEventListener('click', exportInventoryCsv);
  $('exportInventoryPdf').addEventListener('click', exportInventoryPdf);

  $('stats').addEventListener('click', event => {
    const actionCard = event.target.closest('[data-dashboard-action]');

    if (actionCard?.dataset.dashboardAction === 'pending-transfers') {
      openPendingTransfersFromDashboard();
      return;
    }

    const card = event.target.closest('[data-dashboard-filter]');
    if (card) applyDashboardFilter(card.dataset.dashboardFilter);
  });
  $('clearDashboardFilter').addEventListener('click', () => {
    state.dashboardFilter = 'all';
    renderDashboard();
  });
  $('alerts').addEventListener('click', event => {
    const alert = event.target.closest('[data-alert-product]');
    if (!alert) return;
    const filter = alert.dataset.alertType === 'expiring' ? 'expiring' : alert.dataset.alertType === 'low' ? 'low' : 'all';
    focusDashboardProduct(alert.dataset.alertProduct, alert.dataset.alertClinic, filter);
  });
  $('alertCount').addEventListener('click', () => {
    document.querySelector('.alerts-panel')?.scrollIntoView({behavior:'smooth', block:'start'});
  });
  $('inventoryBody').addEventListener('click', event => {
    const lotButton = event.target.closest('[data-lot-product]');
    if (lotButton) {
      openLotDetails(lotButton.dataset.lotProduct, lotButton.dataset.lotClinic);
      return;
    }

    const button = event.target.closest('[data-quick-product]');
    if (button) openQuickAction(button.dataset.quickProduct, button.dataset.quickClinic);
  });

  $('clinicInventoryBody').addEventListener('click', event => {
    const lotButton = event.target.closest('[data-lot-product]');
    if (lotButton) openLotDetails(lotButton.dataset.lotProduct, lotButton.dataset.lotClinic);
  });

  $('closeLotDetailsBtn').addEventListener('click', () => $('lotDetailsDialog').close());
  $('lotDetailsDialog').addEventListener('click', event => {
    if (event.target === $('lotDetailsDialog')) $('lotDetailsDialog').close();
  });

  $('catalogSearch').addEventListener('input', renderCatalog);
  $('catalogForm').addEventListener('submit', createCatalogProduct);
  $('catalogName').addEventListener('input', updateMedicationFields);
  $('catalogCategory').addEventListener('change', updateMedicationFields);
  ['catalogStrength','catalogStrengthUnit','catalogVolume','catalogVolumeUnit','catalogDosageForm'].forEach(id => {
    $(id).addEventListener('input', updateMedicationFields);
    $(id).addEventListener('change', updateMedicationFields);
  });
  $('duplicateSuggestions').addEventListener('click', event => {
    const button = event.target.closest('[data-existing-product]');
    if (button) editProduct(button.dataset.existingProduct);
  });
  $('userForm').addEventListener('submit', createUser);
  ['auditClinic','auditUser','auditProduct','auditType','auditDateFrom','auditDateTo'].forEach(id => {
    $(id).addEventListener('change', renderAudit);
  });
  $('auditSearch').addEventListener('input', renderAudit);
  $('clearAuditFilters').addEventListener('click', clearAuditFilters);
  $('transferForm').addEventListener('submit', createTransfer);
  $('transferProduct').addEventListener('change', updateTransferLots);
  $('transferLot').addEventListener('change', updateTransferLotInfo);
  $('incomingTransfers').addEventListener('click', event => {
    const accept = event.target.closest('[data-accept-transfer]');
    const problem = event.target.closest('[data-problem-transfer]');
    if (accept) acceptTransfer(accept.dataset.acceptTransfer);
    if (problem) reportTransferProblem(problem.dataset.problemTransfer);
  });
  $('receivingForm').addEventListener('submit', receiveStock);
  $('consumptionForm').addEventListener('submit', consumeStock);
  $('consumptionClinic').addEventListener('change', () => {
    clearProductSearch('consumptionProduct');
    updateConsumptionProducts();
  });
  $('consumptionProduct').addEventListener('change', updateConsumptionInfo);
  $('consumptionQuantity').addEventListener('input', updateConsumptionMath);
  $('clinicSelector').addEventListener('change', syncConsumptionClinicWithHeader);

  $('receivingClinic').addEventListener('change', () => {
    clearProductSearch('receivingProduct');
    updateReceivingProducts();
  });
  $('receivingSupplier').addEventListener('change', updateReceivingSupplierPortal);
  $('receivingProduct').addEventListener('change', updateReceivingProductInfo);
  $('receivingQuantity').addEventListener('input', updateReceivingMath);

  $('userSearch').addEventListener('input', renderUsers);
  $('usersBody').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-user]');
    const toggle = event.target.closest('[data-toggle-user]');
    const reset = event.target.closest('[data-reset-user]');

    if (edit) openEditUserDialog(edit.dataset.editUser);
    if (toggle) toggleUser(toggle.dataset.toggleUser);
    if (reset) resetUserPassword(reset.dataset.resetUser);
  });

  $('editUserForm').addEventListener('submit', saveEditedUser);
  $('cancelEditUserBtn').addEventListener('click', closeEditUserDialog);
  $('editUserDialog').addEventListener('click', event => {
    if (event.target === $('editUserDialog')) closeEditUserDialog();
  });

  $('cancelCatalogEditBtn').addEventListener('click', resetProductForm);
  $('catalogBody').addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-product]');
    const toggleButton = event.target.closest('[data-toggle-product]');
    const deleteButton = event.target.closest('[data-delete-product]');
    const purgeButton = event.target.closest('[data-purge-product]');
    if (editButton) editProduct(editButton.dataset.editProduct);
    if (toggleButton) toggleProduct(toggleButton.dataset.toggleProduct);
    if (deleteButton) deleteProductPermanently(deleteButton.dataset.deleteProduct);
    if (purgeButton) purgeTestProduct(purgeButton.dataset.purgeProduct);
  });
  $('assignmentForm').addEventListener('submit', assignProduct);
  $('assignmentProduct').addEventListener('change', updateAssignmentRequirements);
  $('assignmentClinic').addEventListener('change', () => {
    clearProductSearch('assignmentProduct');
    renderAssignmentOptions();
    updateAssignmentRequirements();
  });
  $('clinicInventorySearch').addEventListener('input', renderClinicInventory);
  $('movementForm').addEventListener('submit', createMovement);
  $('movementProduct').addEventListener('change', populateLots);
  $('movementLot').addEventListener('change', () => { updateMovementPreview(); updateAdjustmentPreview(); });
  $('movementType').addEventListener('change', updateMovementQuantityLabel);
  $('movementQuantity').addEventListener('input', updateAdjustmentPreview);
  $('supplierForm').addEventListener('submit', saveSupplier);
  $('cancelSupplierEditBtn').addEventListener('click', resetSupplierForm);
  $('supplierBody').addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-supplier]');
    const toggleButton = event.target.closest('[data-toggle-supplier]');
    if (editButton) editSupplier(editButton.dataset.editSupplier);
    if (toggleButton) toggleSupplier(toggleButton.dataset.toggleSupplier);
  });
  $('supplierSearch').addEventListener('input', renderSuppliers);
  document.querySelectorAll('.nav-button').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  document.querySelectorAll('[data-helper-view]').forEach(button => {
    button.addEventListener('click', () => {
      switchView(button.dataset.helperView);
      const targetId = button.dataset.helperTarget;
      if (targetId) {
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 50);
      }
    });
  });

  initializeProductSearches();

  sb.auth.onAuthStateChange((_event, session) => initializeSession(session));
  sb.auth.getSession().then(({ data }) => initializeSession(data.session));
})();
