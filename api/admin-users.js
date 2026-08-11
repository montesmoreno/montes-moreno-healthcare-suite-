const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

async function supabase(path, options = {}, token = SERVICE_ROLE) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': token === SERVICE_ROLE ? SERVICE_ROLE : PUBLISHABLE_KEY,
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(body?.message || body?.error_description || body?.error || `Supabase error ${response.status}`);
  return body;
}

async function requireAdmin(req) {
  const auth = req.headers.authorization || '';
  const accessToken = auth.replace(/^Bearer\s+/i, '');
  if (!accessToken) throw new Error('Sesión inválida.');

  const user = await supabase('/auth/v1/user', { method: 'GET' }, accessToken);
  const profiles = await supabase(`/rest/v1/profiles?id=eq.${user.id}&select=id,role,active,organization_id`, { method: 'GET' });
  const profile = profiles?.[0];
  if (!profile?.active || profile.role !== 'admin') throw new Error('Solo el administrador puede realizar esta acción.');
  return { user, profile };
}

async function listUsers(profile) {
  const usersResult = await supabase('/auth/v1/admin/users?per_page=1000', { method: 'GET' });
  const profiles = await supabase(`/rest/v1/profiles?organization_id=eq.${profile.organization_id}&select=id,full_name,role,active`, { method: 'GET' });
  const assignments = await supabase('/rest/v1/profile_clinics?select=profile_id,clinic_id,clinics(name)', { method: 'GET' });

  const authMap = new Map((usersResult.users || []).map(user => [user.id, user]));
  return profiles.map(item => {
    const userAssignments = assignments.filter(a => a.profile_id === item.id);

    return {
      ...item,
      email: authMap.get(item.id)?.email || '',
      clinic_ids: userAssignments
        .map(a => a.clinic_id)
        .filter(Boolean),
      clinic_names: userAssignments
        .map(a => a.clinics?.name)
        .filter(Boolean)
        .join(', ')
    };
  });
}

module exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  if (!SUPABASE_URL || !SERVICE_ROLE || !PUBLISHABLE_KEY) {
    return res.status(500).json({ error: 'Faltan variables seguras en Vercel.' });
  }

  try {
    const { profile } = await requireAdmin(req);
    const body = req.body || {};

    if (body.action === 'list') {
      return res.status(200).json({ users: await listUsers(profile) });
    }

    if (body.action === 'create') {
      const { fullName, email, role, password, clinicIds } = body;
      if (!fullName || !email || !password || !['staff','manager','admin'].includes(role)) {
        return res.status(400).json({ error: 'Datos de usuario incompletos.' });
      }
      if (password.length < 10) return res.status(400).json({ error: 'La contraseña debe tener al menos 10 caracteres.' });

      const created = await supabase('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName }
        })
      });

      try {
        await supabase('/rest/v1/profiles', {
          method: 'POST',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            id: created.id,
            organization_id: profile.organization_id,
            full_name: fullName,
            role,
            active: true
          })
        });

        await supabase('/rest/v1/profile_clinics', {
          method: 'POST',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify((clinicIds || []).map(clinicId => ({
            profile_id: created.id,
            clinic_id: clinicId
          })))
        });
      } catch (error) {
        await supabase(`/auth/v1/admin/users/${created.id}`, { method: 'DELETE' });
        throw error;
      }

      return res.status(200).json({ ok: true });
    }


    if (body.action === 'updateUser') {
      const { userId, fullName, role, clinicIds } = body;

      if (
        !userId ||
        !fullName ||
        !['staff', 'manager', 'admin'].includes(role) ||
        !Array.isArray(clinicIds) ||
        clinicIds.length === 0
      ) {
        return res.status(400).json({ error: 'Datos de edición incompletos.' });
      }

      const targetProfiles = await supabase(
        `/rest/v1/profiles?id=eq.${userId}&organization_id=eq.${profile.organization_id}&select=id,full_name,role,active`,
        { method: 'GET' }
      );
      const target = targetProfiles?.[0];

      if (!target) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      if (userId === profile.id && role !== 'admin') {
        return res.status(400).json({
          error: 'No puedes quitarte tu propio rol de administrador.'
        });
      }

      if (target.role === 'admin' && role !== 'admin' && target.active) {
        const activeAdmins = await supabase(
          `/rest/v1/profiles?organization_id=eq.${profile.organization_id}&role=eq.admin&active=eq.true&select=id`,
          { method: 'GET' }
        );

        if ((activeAdmins || []).length <= 1) {
          return res.status(400).json({
            error: 'No se puede cambiar el rol del último administrador activo.'
          });
        }
      }

      const validClinics = await supabase(
        `/rest/v1/clinics?organization_id=eq.${profile.organization_id}&active=eq.true&id=in.(${clinicIds.join(',')})&select=id`,
        { method: 'GET' }
      );

      if ((validClinics || []).length !== new Set(clinicIds).size) {
        return res.status(400).json({
          error: 'Una o más clínicas seleccionadas no son válidas.'
        });
      }

      const oldAssignments = await supabase(
        `/rest/v1/profile_clinics?profile_id=eq.${userId}&select=clinic_id`,
        { method: 'GET' }
      );

      try {
        await supabase(
          `/rest/v1/profiles?id=eq.${userId}&organization_id=eq.${profile.organization_id}`,
          {
            method: 'PATCH',
            headers: { 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              full_name: fullName.trim(),
              role
            })
          }
        );

        await supabase(
          `/auth/v1/admin/users/${userId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              user_metadata: { full_name: fullName.trim() }
            })
          }
        );

        await supabase(
          `/rest/v1/profile_clinics?profile_id=eq.${userId}`,
          {
            method: 'DELETE',
            headers: { 'Prefer': 'return=minimal' }
          }
        );

        await supabase('/rest/v1/profile_clinics', {
          method: 'POST',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify(
            [...new Set(clinicIds)].map(clinicId => ({
              profile_id: userId,
              clinic_id: clinicId
            }))
          )
        });
      } catch (error) {
        try {
          await supabase(
            `/rest/v1/profiles?id=eq.${userId}&organization_id=eq.${profile.organization_id}`,
            {
              method: 'PATCH',
              headers: { 'Prefer': 'return=minimal' },
              body: JSON.stringify({
                full_name: target.full_name,
                role: target.role
              })
            }
          );

          await supabase(
            `/rest/v1/profile_clinics?profile_id=eq.${userId}`,
            {
              method: 'DELETE',
              headers: { 'Prefer': 'return=minimal' }
            }
          );

          if ((oldAssignments || []).length) {
            await supabase('/rest/v1/profile_clinics', {
              method: 'POST',
              headers: { 'Prefer': 'return=minimal' },
              body: JSON.stringify(
                oldAssignments.map(item => ({
                  profile_id: userId,
                  clinic_id: item.clinic_id
                }))
              )
            });
          }
        } catch (rollbackError) {
          console.error('User update rollback failed:', rollbackError);
        }

        throw error;
      }

      return res.status(200).json({ ok: true });
    }

    if (body.action === 'setActive') {
      if (body.userId === profile.id) return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
      await supabase(`/rest/v1/profiles?id=eq.${body.userId}&organization_id=eq.${profile.organization_id}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ active: !!body.active })
      });
      if (!body.active) {
        await supabase(`/auth/v1/admin/users/${body.userId}`, {
          method: 'PUT',
          body: JSON.stringify({ ban_duration: '876000h' })
        });
      } else {
        await supabase(`/auth/v1/admin/users/${body.userId}`, {
          method: 'PUT',
          body: JSON.stringify({ ban_duration: 'none' })
        });
      }
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'resetPassword') {
      if (!body.password || body.password.length < 10) return res.status(400).json({ error: 'La contraseña debe tener al menos 10 caracteres.' });
      await supabase(`/auth/v1/admin/users/${body.userId}`, {
        method: 'PUT',
        body: JSON.stringify({ password: body.password })
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Acción inválida.' });
  } catch (error) {
    return res.status(403).json({ error: error.message || 'No autorizado.' });
  }
};
