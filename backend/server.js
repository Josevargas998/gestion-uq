/**
 * server.js — Servidor Express completo para uso local en red LAN
 *
 * Características:
 * - Sirve el frontend compilado (dist/) como archivos estáticos
 * - API REST completa para solicitudes, docentes, auth y estadísticas
 * - Archivos PDF/DOC guardados localmente en backend/uploads/
 * - Escucha en 0.0.0.0 para acceso desde la red LAN
 * - Backups automáticos configurados por separado (scripts/backup.ps1)
 */
const express = require('express');
const cors    = require('cors');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { query } = require('./db');

let helmet, rateLimit;
try { helmet    = require('helmet');             } catch { helmet    = null; }
try { rateLimit = require('express-rate-limit'); } catch { rateLimit = null; }

const app    = express();
const PORT   = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ─────────────────────────────────────────────────────────────
// Directorios de archivos
// ─────────────────────────────────────────────────────────────
const uploadsDir  = path.join(__dirname, 'uploads');
const distDir     = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ─────────────────────────────────────────────────────────────
// Error operacional
// ─────────────────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode    = statusCode;
    this.isOperational = true;
  }
}

// ─────────────────────────────────────────────────────────────
// Middleware de seguridad
// ─────────────────────────────────────────────────────────────
if (helmet) {
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
}

// ─────────────────────────────────────────────────────────────
// Middleware de Autenticación JWT
// ─────────────────────────────────────────────────────────────
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Acceso denegado: Token requerido' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso denegado: Token inválido' });

  try {
    const payload = jwt.verify(token, process.env.API_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token expirado o inválido' });
  }
}

function requireAdminOrTecnico(req, res, next) {
  if (!req.user || (req.user.rol !== 'admin' && req.user.rol !== 'tecnico')) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }
  next();
}

// ── HELPER DE AUDITORÍA PERMANENTE ────────────────────────────
async function registrarAuditoria(req, accion, detalles) {
  try {
    const cedula = req.user?.cedula || 'sistema';
    const nombre = req.user?.nombre || 'Sistema / Público';
    await query(
      `INSERT INTO logs_auditoria (cedula_usuario, nombre_usuario, accion, detalles)
       VALUES ($1, $2, $3, $4)`,
      [cedula, nombre, accion, JSON.stringify(detalles || {})]
    );
  } catch (err) {
    console.error('[AUDITORÍA ERROR] Fallo al registrar log:', err.message);
  }
}

// CORS: permite todo en LAN (todos los orígenes locales)
app.use(cors({ origin: true, methods: ['GET','POST','PUT','DELETE','PATCH'], allowedHeaders: ['Content-Type','X-API-Key','Authorization'] }));

if (rateLimit) {
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true });
  app.use('/api/', limiter);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  req.requestId = crypto.randomUUID().slice(0, 8);
  if (!isProd) console.log(`[${req.requestId}] ${req.method} ${req.path}`);
  next();
});

// ─────────────────────────────────────────────────────────────
// Servir archivos subidos
// ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ─────────────────────────────────────────────────────────────
// MULTER — subida de archivos local
// ─────────────────────────────────────────────────────────────
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    // Prioriza el nombre enviado en el cuerpo, de lo contrario usa originalname
    const rawName = (req.body && req.body.name) ? req.body.name : file.originalname;
    const fileName = sanitizeFileName(rawName);
    cb(null, `${timestamp}_${fileName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite reducido a 10 MB para producción
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    ALLOWED_EXT.includes(ext) ? cb(null, true) : cb(new AppError(`Tipo no permitido: ${ext}`, 400));
  },
});

function sanitizeFileName(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 200);
}

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada', uptime: process.uptime(), timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'desconectada' });
  }
});

// ─────────────────────────────────────────────────────────────
// AUTH — Login por cédula
// ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { cedula, password } = req.body;
    if (!cedula) return res.status(400).json({ error: 'Cédula requerida' });

    // 1. Intentar login como DOCENTE (si no se envía password)
    if (!password) {
      const { rows: docentes } = await query(
        'SELECT cedula, nombre FROM docentes WHERE cedula = $1 LIMIT 1',
        [String(cedula).trim()]
      );
      if (docentes.length > 0) {
        const token = jwt.sign(
          { cedula: docentes[0].cedula, nombre: docentes[0].nombre, rol: 'docente' },
          process.env.API_SECRET,
          { expiresIn: '24h' }
        );
        return res.json({ cedula: docentes[0].cedula, nombre: docentes[0].nombre, rol: 'docente', token });
      }
      return res.status(401).json({ error: 'Cédula de docente no registrada o falta contraseña' });
    }

    // 2. Intentar login como USUARIO DE OFICINA (con password)
    const { rows: usuarios } = await query(
      'SELECT cedula, nombre, rol, password_hash FROM usuarios WHERE cedula = $1 AND activo = true LIMIT 1',
      [String(cedula).trim()]
    );
    if (usuarios.length > 0) {
      const valid = await bcrypt.compare(String(password), usuarios[0].password_hash);
      if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

      const token = jwt.sign(
        { cedula: usuarios[0].cedula, nombre: usuarios[0].nombre, rol: usuarios[0].rol },
        process.env.API_SECRET,
        { expiresIn: '12h' }
      );
      return res.json({ cedula: usuarios[0].cedula, nombre: usuarios[0].nombre, rol: usuarios[0].rol, token });
    }

    res.status(401).json({ error: 'Usuario no registrado' });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// SOLICITUDES — CRUD completo
// ─────────────────────────────────────────────────────────────

// GET solicitudes — con paginación opcional o filtrado por cédula
// Query params: page, limit, paginar, cedula
// Responde: { data: [...], total, page, totalPages }
app.get('/api/solicitudes', async (req, res, next) => {
  try {
    const paginar = req.query.paginar !== 'false' && req.query.limit !== 'all';
    const cedula  = req.query.cedula;

    let queryText = `
      SELECT s.*, 
             COALESCE(d.nombre, s.docente, 'Sin autor') AS docente,
             COALESCE(d.programa, s.programa, 'Sin programa') AS programa,
             COALESCE(d.facultad, s.facultad, 'Sin facultad') AS facultad,
             COALESCE(d.pts_acumulados, 0) AS docente_pts_acumulados,
             COALESCE(d.pts_titulos_exp, 0) AS docente_pts_titulos_exp,
             COALESCE(d.pts_total_salarial, 0) AS docente_pts_total_salarial,
             COALESCE(d.lugar_expedicion, '________') AS docente_lugar_expedicion,
             COALESCE(d.dedicacion, 'Tiempo Completo') AS dedicacion,
             COUNT(*) OVER() AS total_count
      FROM solicitudes s
      LEFT JOIN docentes d ON s.cedula = d.cedula
    `;
    const params = [];
    let paramIndex = 1;

    if (cedula) {
      queryText += ` WHERE s.cedula = $${paramIndex}`;
      params.push(String(cedula).trim());
      paramIndex++;
    }

    queryText += ` ORDER BY s.created_at DESC`;

    if (paginar) {
      const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
      const offset = (page - 1) * limit;

      queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const { rows } = await query(queryText, params);
      const total      = rows.length > 0 ? Number(rows[0].total_count) : 0;
      const totalPages = Math.ceil(total / limit) || 1;
      const data       = rows.map(({ total_count, ...rest }) => rest);

      res.json({ data, total, page, totalPages });
    } else {
      const { rows } = await query(queryText, params);
      const total    = rows.length;
      const data     = rows.map(({ total_count, ...rest }) => rest);

      res.json({ data, total, page: 1, totalPages: 1 });
    }
  } catch (err) { next(err); }
});

// GET búsqueda avanzada
app.get('/api/solicitudes/buscar', async (req, res, next) => {
  try {
    const { q, etapa, tipo, estado, facultad, desde, hasta } = req.query;
    const limit  = parseInt(req.query.limit  || '100', 10);
    const offset = parseInt(req.query.offset || '0',   10);

    const conditions = [];
    const params     = [];
    let   p          = 1;

    if (q) {
      conditions.push(`(d.nombre ILIKE $${p} OR s.titulo ILIKE $${p} OR s.cedula ILIKE $${p})`);
      params.push(`%${q}%`); p++;
    }
    if (etapa)    { conditions.push(`s.etapa    = $${p}`); params.push(etapa);    p++; }
    if (tipo)     { conditions.push(`s.tipo     = $${p}`); params.push(tipo);     p++; }
    if (estado)   { conditions.push(`s.estado   = $${p}`); params.push(estado);   p++; }
    if (facultad) { conditions.push(`d.facultad = $${p}`); params.push(facultad); p++; }
    if (desde)    { conditions.push(`s.fecha   >= $${p}`); params.push(desde);    p++; }
    if (hasta)    { conditions.push(`s.fecha   <= $${p}`); params.push(hasta);    p++; }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT s.*, 
              COALESCE(d.nombre, s.docente, 'Sin autor') AS docente,
              COALESCE(d.programa, s.programa, 'Sin programa') AS programa,
              COALESCE(d.facultad, s.facultad, 'Sin facultad') AS facultad,
              COALESCE(d.pts_acumulados, 0) AS docente_pts_acumulados,
              COALESCE(d.pts_titulos_exp, 0) AS docente_pts_titulos_exp,
              COALESCE(d.pts_total_salarial, 0) AS docente_pts_total_salarial,
              COALESCE(d.lugar_expedicion, '________') AS docente_lugar_expedicion,
              COALESCE(d.dedicacion, 'Tiempo Completo') AS dedicacion,
              COUNT(*) OVER() AS total_count 
       FROM solicitudes s
       LEFT JOIN docentes d ON s.cedula = d.cedula
       ${where}
       ORDER BY s.created_at DESC LIMIT $${p} OFFSET $${p+1}`,
      [...params, limit, offset]
    );
    const total = rows[0]?.total_count || 0;
    res.json({ rows: rows.map(r => { const { total_count, ...rest } = r; return rest; }), total: Number(total) });
  } catch (err) { next(err); }
});

// GET una solicitud
app.get('/api/solicitudes/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, 
              COALESCE(d.nombre, s.docente, 'Sin autor') AS docente,
              COALESCE(d.programa, s.programa, 'Sin programa') AS programa,
              COALESCE(d.facultad, s.facultad, 'Sin facultad') AS facultad,
              COALESCE(d.pts_acumulados, 0) AS docente_pts_acumulados,
              COALESCE(d.dedicacion, 'Tiempo Completo') AS dedicacion
       FROM solicitudes s
       LEFT JOIN docentes d ON s.cedula = d.cedula
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Helper para validar tope del docente
async function validarTopeDocente(cedula, currentSolicitudId, nuevosPuntos, nuevoEstado) {
  if (nuevoEstado !== 'aprobado') {
    return { valid: true };
  }

  // 1. Obtener tope y base acumulada del docente
  const { rows: docentes } = await query(
    'SELECT tope, pts_acumulados FROM docentes WHERE cedula = $1 LIMIT 1',
    [String(cedula || '').trim()]
  );
  if (docentes.length === 0) {
    return { valid: true }; // Docente no registrado, no validamos tope
  }

  const tope = Number(docentes[0].tope) || 0;
  if (tope <= 0) {
    return { valid: true }; // Sin tope o sin límite
  }

  const baseAcumulados = Number(docentes[0].pts_acumulados) || 0;

  // 2. Sumar puntos de otras solicitudes aprobadas (excluyendo la actual)
  let queryText = "SELECT COALESCE(SUM(pts_asig), 0) AS suma FROM solicitudes WHERE cedula = $1 AND estado = 'aprobado' AND id LIKE 'SOL-%'";
  const queryParams = [String(cedula || '').trim()];

  if (currentSolicitudId) {
    queryText += ' AND id <> $2';
    queryParams.push(currentSolicitudId);
  }

  const { rows: solicitudesSuma } = await query(queryText, queryParams);
  const otrosPuntosAprobados = Number(solicitudesSuma[0].suma) || 0;

  const totalProyectado = baseAcumulados + otrosPuntosAprobados + nuevosPuntos;

  if (totalProyectado > tope) {
    return {
      valid: false,
      error: `La asignación de ${nuevosPuntos} puntos superaría el tope del docente (Tope: ${tope} pts, Puntos acumulados base: ${baseAcumulados} pts, Otras solicitudes aprobadas: ${otrosPuntosAprobados} pts, Total proyectado: ${totalProyectado} pts)`
    };
  }

  return { valid: true };
}

// POST crear solicitud
app.post('/api/solicitudes', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const sol = req.body;

    // Validar tope del docente
    const ptsAsignados = sol.pts_asig !== undefined && sol.pts_asig !== null ? Number(sol.pts_asig) || 0 : 0;
    const validTope = await validarTopeDocente(sol.cedula, null, ptsAsignados, sol.estado);
    if (!validTope.valid) {
      return res.status(400).json({ error: validTope.error });
    }

    // Auto-resolver sesion_ciarp_id si no viene
    if (!sol.sesion_ciarp_id && sol.acta_ciarp) {
      const { rows: ciarpRows } = await query('SELECT id FROM sesiones_ciarp WHERE acta_label = $1 LIMIT 1', [sol.acta_ciarp]);
      if (ciarpRows.length > 0) sol.sesion_ciarp_id = ciarpRows[0].id;
    }

    const hex = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const tipo = sol.tipo || 'revista_a1';
    const idPrefix = tipo === 'ascenso' ? 'ASC' : 'PROD';
    const id  = `SOL-${new Date().getFullYear()}-${idPrefix}-${hex}`;
    const { rows } = await query(
      `INSERT INTO solicitudes
         (id, coautor, cedula, docente, tipo, titulo, revista,
          fecha, etapa, estado, pts_sug, pts_asig, correo, notas, acta_ciarp,
          pares_ext, pares_int, timeline, memo_envio_int, fecha_envio_int,
          memo_recibo_int, fecha_recibo_int, memo_envio_ext, datos_prod, sesion_ciarp_id, sesion_cei_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       RETURNING *`,
      [
        id, sol.coautor || null, sol.cedula || null,
        sol.docente || null,
        tipo, sol.titulo, sol.revista || null,
        sol.fecha || new Date().toISOString().split('T')[0],
        sol.etapa || 'recibida', sol.estado || 'en_proceso',
        sol.pts_sug || 0, sol.pts_asig !== undefined ? sol.pts_asig : null,
        sol.correo || null, sol.notas || null, sol.acta_ciarp || null,
        sol.pares_ext  ? JSON.stringify(sol.pares_ext)  : null,
        sol.pares_int  ? JSON.stringify(sol.pares_int)  : null,
        sol.timeline   ? JSON.stringify(sol.timeline)   : '[]',
        sol.memoEnvioInt  || null, sol.fechaEnvioInt  || null,
        sol.memoReciboInt || null, sol.fechaReciboInt || null,
        sol.memoEnvioExt  || null,
        sol.datos_prod ? JSON.stringify(sol.datos_prod) : '{}',
        sol.sesion_ciarp_id || null, sol.sesion_cei_id || null
      ]
    );

    const newSolicitud = rows[0];
    if (newSolicitud) {
      const { rows: docRows } = await query('SELECT nombre, programa, facultad FROM docentes WHERE cedula = $1', [newSolicitud.cedula]);
      if (docRows.length > 0) {
        newSolicitud.docente = docRows[0].nombre;
        newSolicitud.programa = docRows[0].programa;
        newSolicitud.facultad = docRows[0].facultad;
      } else {
        // Keep the docente name that was sent in the request body
        newSolicitud.docente = newSolicitud.docente || sol.docente || null;
        newSolicitud.programa = sol.programa || null;
        newSolicitud.facultad = sol.facultad || null;
      }
    }

    // Registrar acción en logs de auditoría
    if (newSolicitud) {
      await registrarAuditoria(req, 'CREAR_SOLICITUD', {
        id:      newSolicitud.id,
        docente: newSolicitud.docente,
        cedula:  newSolicitud.cedula,
        tipo:    newSolicitud.tipo,
        titulo:  newSolicitud.titulo,
        pts_sug: newSolicitud.pts_sug
      });
    }

    res.status(201).json(newSolicitud);
  } catch (err) { next(err); }
});

// PUT actualizar solicitud
app.put('/api/solicitudes/:id', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const sol = req.body;

    // Validar tope del docente
    const ptsAsignados = sol.pts_asig !== undefined && sol.pts_asig !== null ? Number(sol.pts_asig) || 0 : 0;
    const validTope = await validarTopeDocente(sol.cedula, req.params.id, ptsAsignados, sol.estado);
    if (!validTope.valid) {
      return res.status(400).json({ error: validTope.error });
    }

    // Auto-resolver sesion_ciarp_id si no viene
    if (!sol.sesion_ciarp_id && sol.acta_ciarp) {
      const { rows: ciarpRows } = await query('SELECT id FROM sesiones_ciarp WHERE acta_label = $1 LIMIT 1', [sol.acta_ciarp]);
      if (ciarpRows.length > 0) sol.sesion_ciarp_id = ciarpRows[0].id;
    }

    const { rows } = await query(
      `UPDATE solicitudes SET
         coautor=$2, cedula=$3, docente=$4, tipo=$5, titulo=$6, revista=$7, fecha=$8, 
         etapa=$9, estado=$10, pts_sug=$11, pts_asig=$12, correo=$13, notas=$14, 
         acta_ciarp=$15, pares_ext=$16, pares_int=$17, timeline=$18, 
         memo_envio_int=$19, fecha_envio_int=$20, memo_recibo_int=$21, 
         fecha_recibo_int=$22, memo_envio_ext=$23, datos_prod=$24, sesion_ciarp_id=$25, sesion_cei_id=$26
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, sol.coautor || null, sol.cedula || null,
        sol.docente || null,
        sol.tipo || 'revista_a1', sol.titulo, sol.revista || null,
        sol.fecha || new Date().toISOString().split('T')[0],
        sol.etapa || 'recibida', sol.estado || 'en_proceso',
        sol.pts_sug || 0, sol.pts_asig !== undefined ? sol.pts_asig : null,
        sol.correo || null, sol.notas || null, sol.acta_ciarp || null,
        sol.pares_ext  ? JSON.stringify(sol.pares_ext)  : null,
        sol.pares_int  ? JSON.stringify(sol.pares_int)  : null,
        sol.timeline   ? JSON.stringify(sol.timeline)   : '[]',
        sol.memoEnvioInt  || null, sol.fechaEnvioInt  || null,
        sol.memoReciboInt || null, sol.fechaReciboInt || null,
        sol.memoEnvioExt  || null,
        sol.datos_prod ? JSON.stringify(sol.datos_prod) : '{}',
        sol.sesion_ciarp_id || null, sol.sesion_cei_id || null
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const updatedSolicitud = rows[0];
    const { rows: docRows } = await query('SELECT nombre, programa, facultad FROM docentes WHERE cedula = $1', [updatedSolicitud.cedula]);
    if (docRows.length > 0) {
      updatedSolicitud.docente = docRows[0].nombre;
      updatedSolicitud.programa = docRows[0].programa;
      updatedSolicitud.facultad = docRows[0].facultad;
    } else {
      // Keep name from the request or from what was saved
      updatedSolicitud.docente = updatedSolicitud.docente || sol.docente || null;
      updatedSolicitud.programa = updatedSolicitud.programa || sol.programa || null;
      updatedSolicitud.facultad = updatedSolicitud.facultad || sol.facultad || null;
    }

    // Registrar acción en logs de auditoría (APROBADA o MODIFICADA)
    if (updatedSolicitud) {
      const accion = updatedSolicitud.estado === 'aprobado' ? 'APROBAR_SOLICITUD' : 'MODIFICAR_SOLICITUD';
      await registrarAuditoria(req, accion, {
        id:       updatedSolicitud.id,
        docente:  updatedSolicitud.docente,
        cedula:   updatedSolicitud.cedula,
        tipo:     updatedSolicitud.tipo,
        titulo:   updatedSolicitud.titulo,
        estado:   updatedSolicitud.estado,
        etapa:    updatedSolicitud.etapa,
        pts_asig: updatedSolicitud.pts_asig
      });
    }

    res.json(updatedSolicitud);
  } catch (err) { next(err); }
});

// DELETE eliminar solicitud
app.delete('/api/solicitudes/:id', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM solicitudes WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Solicitud no encontrada' });

    // Registrar eliminación en logs de auditoría
    await registrarAuditoria(req, 'ELIMINAR_SOLICITUD', {
      id: req.params.id
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// DOCENTES — CRUD
// ─────────────────────────────────────────────────────────────

app.get('/api/docentes', async (req, res, next) => {
  try {
    const campos = req.query.campos
      ? req.query.campos.split(',').map(c => c.trim()).filter(Boolean).join(', ')
      : '*';
    // Sanitizar nombres de columna para prevenir SQL injection
    const allowed = ['cedula','nombre','facultad','categoria','programa','dedicacion',
                     'fecha_ingreso','especializacion','maestria','doctorado','correo',
                     'pts_acumulados','tope','diferencia','historial','observacion',
                     'pts_titulos_exp','pts_total_salarial','pts_ciarp1_2026',
                     'pts_favor','tope_libros','tope_software','no','id','comision','escolaridad'];
    const safeSelect = campos === '*' ? '*' : campos.split(',').filter(c => allowed.includes(c.trim())).join(', ') || '*';
    const { rows } = await query(`SELECT ${safeSelect} FROM docentes ORDER BY nombre`);
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/api/docentes/:cedula', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM docentes WHERE cedula = $1 LIMIT 1', [req.params.cedula]);
    if (!rows.length) return res.status(404).json({ error: 'Docente no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

app.get('/api/docentes/:cedula/titulos', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, cedula, titulo_nacional, titulo_snies, fecha, puntos FROM docente_titulos WHERE cedula = $1 ORDER BY fecha DESC',
      [req.params.cedula]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/api/docentes/:cedula/experiencias', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, cedula, institucion, cargo, fecha_inicio, fecha_fin, puntos FROM docente_experiencias WHERE cedula = $1 ORDER BY fecha_inicio DESC',
      [req.params.cedula]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.put('/api/docentes/:cedula', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const campos  = req.body;
    const sets    = [];
    const valores = [];
    let   p       = 1;
    const editable = ['nombre','facultad','programa','categoria','escolaridad','especializacion',
                      'maestria','doctorado','dedicacion','fecha_ingreso','pts_acumulados','tope',
                      'pts_ciarp1_2026','pts_favor','tope_libros','tope_software','pts_titulos_exp',
                      'pts_total_salarial','historial','comision','observacion','correo'];
    for (const key of editable) {
      if (key in campos) {
        const val = (key === 'historial' && typeof campos[key] === 'object')
          ? JSON.stringify(campos[key]) : campos[key];
        sets.push(`${key} = $${p}`); valores.push(val); p++;
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
    valores.push(req.params.cedula);
    const { rows } = await query(
      `UPDATE docentes SET ${sets.join(', ')} WHERE cedula = $${p} RETURNING *`,
      valores
    );
    if (!rows.length) return res.status(404).json({ error: 'Docente no encontrado' });

    // Registrar modificación de docente en logs de auditoría
    await registrarAuditoria(req, 'MODIFICAR_DOCENTE', {
      cedula:         rows[0].cedula,
      nombre:         rows[0].nombre,
      pts_acumulados: rows[0].pts_acumulados,
      tope:           rows[0].tope,
      campos_modificados: Object.keys(campos)
    });

    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// ESTADÍSTICAS — Dashboard KPIs
// ─────────────────────────────────────────────────────────────
app.get('/api/estadisticas', async (_req, res, next) => {
  try {
    const { rows: [sol] } = await query(`
      SELECT
        COUNT(*)                                         AS total,
        COUNT(*) FILTER (WHERE estado = 'aprobado')     AS aprobadas,
        COUNT(*) FILTER (WHERE estado = 'en_proceso')   AS en_proceso,
        COUNT(*) FILTER (WHERE tipo   = 'ascenso')      AS ascensos,
        COALESCE(SUM(pts_asig) FILTER (WHERE estado = 'aprobado'), 0) AS pts_totales
      FROM solicitudes
    `);
    const { rows: [doc] } = await query('SELECT COUNT(*) AS total FROM docentes');
    res.json({
      total_solicitudes: Number(sol.total),
      aprobadas:         Number(sol.aprobadas),
      en_proceso:        Number(sol.en_proceso),
      ascensos:          Number(sol.ascensos),
      pts_totales:       Number(sol.pts_totales),
      total_docentes:    Number(doc.total),
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// UPLOAD PDF/DOC — guardado local (reemplaza Google Drive)
// ─────────────────────────────────────────────────────────────
app.post('/api/v1/upload-pdf', verifyToken, requireAdminOrTecnico, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió ningún archivo' });
    
    // Con diskStorage, el archivo ya ha sido escrito en el disco duro por Multer
    const safeName  = req.file.filename;
    const localUrl  = `/uploads/${safeName}`;
    
    // Leer el archivo desde el disco duro para calcular el hash SHA-256 de forma segura
    const fileBuffer = fs.readFileSync(req.file.path);
    const sha256     = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    res.json({
      success: true,
      fileId:         `local_${Date.now()}`,
      fileName:       safeName,
      webViewLink:    `${req.protocol}://${req.get('host')}${localUrl}`,
      webContentLink: `${req.protocol}://${req.get('host')}${localUrl}`,
      sha256,
      storage: 'local',
    });
  } catch (err) { next(err); }
});
// Alias legacy
app.post('/api/upload-pdf', verifyToken, requireAdminOrTecnico, upload.single('file'), (req, res, next) => {
  req.url = '/api/v1/upload-pdf';
  next('router');
});

// ─────────────────────────────────────────────────────────────
// PRODUCTIVIDAD HISTÓRICA — 1994-2025
// ─────────────────────────────────────────────────────────────
app.get('/api/productividad-historica', async (req, res, next) => {
  try {
    const campos = req.query.campos
      ? req.query.campos.split(',').map(c => c.trim()).join(', ')
      : '*';
    const allowed = ['cedula','docente','programa','categoria','titulo','revista',
                     'categoria_revista','puntos','anio','numero_resolucion',
                     'fecha_resolucion','id'];
    const safe = campos === '*' ? '*' : campos.split(',').filter(c => allowed.includes(c.trim())).join(', ') || '*';
    const { rows } = await query(`SELECT ${safe} FROM productividad_historica ORDER BY anio DESC, docente`);
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/api/productividad-historica/buscar', async (req, res, next) => {
  try {
    const { q, categoria, programa, desde, hasta } = req.query;
    const limit  = Math.min(parseInt(req.query.limit  || '25', 10), 1000);
    const offset = parseInt(req.query.offset || '0', 10);
    const conds = [], params = [];
    let p = 1;
    if (q) {
      if (/^\d+$/.test(q)) { conds.push(`cedula ILIKE $${p}`); params.push(`%${q}%`); p++; }
      else                  { conds.push(`docente ILIKE $${p}`); params.push(`%${q}%`); p++; }
    }
    if (categoria) { conds.push(`categoria = $${p}`); params.push(categoria); p++; }
    if (programa)  { conds.push(`programa ILIKE $${p}`); params.push(`%${programa}%`); p++; }
    if (desde)     { conds.push(`anio >= $${p}`); params.push(parseInt(desde)); p++; }
    if (hasta)     { conds.push(`anio <= $${p}`); params.push(parseInt(hasta)); p++; }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM productividad_historica ${where}
       ORDER BY anio DESC, docente
       LIMIT $${p} OFFSET $${p+1}`,
      [...params, limit, offset]
    );
    const total = rows[0]?.total_count || 0;
    res.json({ rows: rows.map(r => { const { total_count, ...rest } = r; return rest; }), total: Number(total) });
  } catch (err) { next(err); }
});

app.delete('/api/productividad-historica/:id', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM productividad_historica WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Registro no encontrado en el histórico' });

    // Registrar acción en logs de auditoría
    await registrarAuditoria(req, 'ELIMINAR_PRODUCTIVIDAD_HISTORICA', {
      id: req.params.id
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// SESIONES CIARP — CRUD y descarga de informe
// ─────────────────────────────────────────────────────────────

// GET /api/sesiones-ciarp — lista con totales
app.get('/api/sesiones-ciarp', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT sc.*,
             COUNT(s.id)                                              AS total_solicitudes,
             COUNT(s.id) FILTER (WHERE s.estado = 'aprobado')        AS aprobadas,
             COUNT(s.id) FILTER (WHERE s.estado = 'rechazado')       AS rechazadas,
             COALESCE(SUM(s.pts_asig) FILTER (WHERE s.estado = 'aprobado'), 0) AS pts_totales
      FROM sesiones_ciarp sc
      LEFT JOIN solicitudes s ON s.sesion_ciarp_id = sc.id
      GROUP BY sc.id
      ORDER BY sc.anio DESC, sc.numero DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/sesiones-ciarp/siguiente — número sugerido
app.get('/api/sesiones-ciarp/siguiente', async (req, res, next) => {
  try {
    const anio = parseInt(req.query.anio || String(new Date().getFullYear()), 10);
    const { rows } = await query(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM sesiones_ciarp WHERE anio = $1',
      [anio]
    );
    res.json({ anio, siguiente: rows[0].siguiente });
  } catch (err) { next(err); }
});

// GET /api/sesiones-ciarp/:id/informe — solicitudes de la sesión para exportar
app.get('/api/sesiones-ciarp/:id/informe', async (req, res, next) => {
  try {
    const { rows: sesRows } = await query('SELECT * FROM sesiones_ciarp WHERE id = $1', [req.params.id]);
    if (!sesRows.length) return res.status(404).json({ error: 'Sesión no encontrada' });
    const { rows } = await query(`
      SELECT s.*, COALESCE(d.nombre, s.docente) AS nombre_docente,
             d.programa, d.facultad
      FROM solicitudes s
      LEFT JOIN docentes d ON s.cedula = d.cedula
      WHERE s.sesion_ciarp_id = $1
      ORDER BY s.tipo, s.docente
    `, [req.params.id]);
    res.json({ sesion: sesRows[0], solicitudes: rows });
  } catch (err) { next(err); }
});

// POST /api/sesiones-ciarp — crea nueva sesión
app.post('/api/sesiones-ciarp', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const { fecha, notas } = req.body;
    const anio = fecha ? parseInt(String(fecha).substring(0, 4), 10) : new Date().getFullYear();
    const { rows: last } = await query(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM sesiones_ciarp WHERE anio = $1', [anio]
    );
    const numero = req.body.numero ? parseInt(req.body.numero, 10) : last[0].siguiente;
    const id = `CIARP-${anio}-${String(numero).padStart(2, '0')}`;
    let acta_label = `${numero}/${anio}`;
    if (fecha) {
      const d = new Date(fecha);
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      acta_label = `${numero}- ${dd}/${mm}/${d.getUTCFullYear()}`;
    }
    const { rows } = await query(
      `INSERT INTO sesiones_ciarp (id, numero, anio, fecha, acta_label, estado, notas)
       VALUES ($1,$2,$3,$4,$5,'abierta',$6) RETURNING *`,
      [id, numero, anio, fecha || null, acta_label, notas || null]
    );
    await registrarAuditoria(req, 'CREAR_SESION_CIARP', { id, acta_label });
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/sesiones-ciarp/:id — actualizar estado/notas
app.put('/api/sesiones-ciarp/:id', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const { estado, notas, fecha } = req.body;
    const sets = [], vals = []; let p = 1;
    if (estado !== undefined) { sets.push(`estado = $${p}`); vals.push(estado); p++; }
    if (notas  !== undefined) { sets.push(`notas  = $${p}`); vals.push(notas);  p++; }
    if (fecha  !== undefined) { sets.push(`fecha  = $${p}`); vals.push(fecha);  p++; }
    if (!sets.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
    vals.push(req.params.id);
    const { rows } = await query(
      `UPDATE sesiones_ciarp SET ${sets.join(', ')} WHERE id = $${p} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/sesiones-ciarp/:id/cerrar-y-abrir — Cierra la sesión actual y abre la siguiente automáticamente
app.post('/api/sesiones-ciarp/:id/cerrar-y-abrir', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 1. Cerrar la sesión actual
    const { rows: currRows } = await query(
      `UPDATE sesiones_ciarp SET estado = 'cerrada' WHERE id = $1 RETURNING *`, [id]
    );
    if (!currRows.length) return res.status(404).json({ error: 'Sesión no encontrada' });
    const curSes = currRows[0];
    
    // 2. Crear la siguiente sesión
    const anio = curSes.anio || new Date().getFullYear();
    const { rows: last } = await query(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM sesiones_ciarp WHERE anio = $1', [anio]
    );
    const num = last[0].siguiente;
    const newId = `CIARP-${anio}-${String(num).padStart(2, '0')}`;
    const acta_label = `${num}/${anio}`;
    
    const { rows: newRows } = await query(
      `INSERT INTO sesiones_ciarp (id, numero, anio, acta_label, estado) VALUES ($1,$2,$3,$4,'abierta') RETURNING *`,
      [newId, num, anio, acta_label]
    );
    
    await registrarAuditoria(req, 'CERRAR_Y_ABRIR_CIARP', { closed: id, opened: newId });
    res.json({ closed: curSes, opened: newRows[0] });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// SESIONES CEI — CRUD y descarga de informe
// ─────────────────────────────────────────────────────────────

// GET /api/sesiones-cei
app.get('/api/sesiones-cei', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT sc.*,
             COUNT(s.id)                                              AS total_solicitudes,
             COUNT(s.id) FILTER (WHERE s.estado = 'aprobado')        AS aprobadas,
             COALESCE(SUM(s.pts_asig) FILTER (WHERE s.estado = 'aprobado'), 0) AS pts_totales
      FROM sesiones_cei sc
      LEFT JOIN solicitudes s ON s.sesion_cei_id = sc.id
      GROUP BY sc.id
      ORDER BY sc.anio DESC, sc.numero DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/sesiones-cei/siguiente
app.get('/api/sesiones-cei/siguiente', async (req, res, next) => {
  try {
    const anio = parseInt(req.query.anio || String(new Date().getFullYear()), 10);
    const { rows } = await query(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM sesiones_cei WHERE anio = $1', [anio]
    );
    res.json({ anio, siguiente: rows[0].siguiente });
  } catch (err) { next(err); }
});

// GET /api/sesiones-cei/:id/informe
app.get('/api/sesiones-cei/:id/informe', async (req, res, next) => {
  try {
    const { rows: sesRows } = await query('SELECT * FROM sesiones_cei WHERE id = $1', [req.params.id]);
    if (!sesRows.length) return res.status(404).json({ error: 'Sesión CEI no encontrada' });
    const { rows } = await query(`
      SELECT s.*, COALESCE(d.nombre, s.docente) AS nombre_docente,
             d.programa, d.facultad, d.categoria
      FROM solicitudes s
      LEFT JOIN docentes d ON s.cedula = d.cedula
      WHERE s.sesion_cei_id = $1
      ORDER BY s.docente
    `, [req.params.id]);
    res.json({ sesion: sesRows[0], solicitudes: rows });
  } catch (err) { next(err); }
});

// POST /api/sesiones-cei
app.post('/api/sesiones-cei', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const { fecha, notas } = req.body;
    const anio = fecha ? parseInt(String(fecha).substring(0, 4), 10) : new Date().getFullYear();
    const { rows: last } = await query(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM sesiones_cei WHERE anio = $1', [anio]
    );
    const numero = req.body.numero ? parseInt(req.body.numero, 10) : last[0].siguiente;
    const id = `CEI-${anio}-${String(numero).padStart(2, '0')}`;
    let acta_label = `${numero}/${anio}`;
    if (fecha) {
      const d = new Date(fecha);
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      acta_label = `${numero}- ${dd}/${mm}/${d.getUTCFullYear()}`;
    }
    const { rows } = await query(
      `INSERT INTO sesiones_cei (id, numero, anio, fecha, acta_label, estado, notas)
       VALUES ($1,$2,$3,$4,$5,'abierta',$6) RETURNING *`,
      [id, numero, anio, fecha || null, acta_label, notas || null]
    );
    await registrarAuditoria(req, 'CREAR_SESION_CEI', { id, acta_label });
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/sesiones-cei/:id
app.put('/api/sesiones-cei/:id', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const { estado, notas, fecha } = req.body;
    const sets = [], vals = []; let p = 1;
    if (estado !== undefined) { sets.push(`estado = $${p}`); vals.push(estado); p++; }
    if (notas  !== undefined) { sets.push(`notas  = $${p}`); vals.push(notas);  p++; }
    if (fecha  !== undefined) { sets.push(`fecha  = $${p}`); vals.push(fecha);  p++; }
    if (!sets.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
    vals.push(req.params.id);
    const { rows } = await query(
      `UPDATE sesiones_cei SET ${sets.join(', ')} WHERE id = $${p} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/sesiones-cei/:id/cerrar-y-abrir — Cierra la sesión actual y abre la siguiente automáticamente
app.post('/api/sesiones-cei/:id/cerrar-y-abrir', verifyToken, requireAdminOrTecnico, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 1. Cerrar la sesión actual
    const { rows: currRows } = await query(
      `UPDATE sesiones_cei SET estado = 'cerrada' WHERE id = $1 RETURNING *`, [id]
    );
    if (!currRows.length) return res.status(404).json({ error: 'Sesión no encontrada' });
    const curSes = currRows[0];
    
    // 2. Crear la siguiente sesión
    const anio = curSes.anio || new Date().getFullYear();
    const { rows: last } = await query(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM sesiones_cei WHERE anio = $1', [anio]
    );
    const num = last[0].siguiente;
    const newId = `CEI-${anio}-${String(num).padStart(2, '0')}`;
    const acta_label = `${num}/${anio}`;
    
    const { rows: newRows } = await query(
      `INSERT INTO sesiones_cei (id, numero, anio, acta_label, estado) VALUES ($1,$2,$3,$4,'abierta') RETURNING *`,
      [newId, num, anio, acta_label]
    );
    
    await registrarAuditoria(req, 'CERRAR_Y_ABRIR_CEI', { closed: id, opened: newId });
    res.json({ closed: curSes, opened: newRows[0] });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// FRONTEND SPA — sirve dist/ con fallback a index.html
// ─────────────────────────────────────────────────────────────
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA fallback: todas las rutas no-API devuelven index.html
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send('<h2>Servidor activo. Ejecuta <code>npm run build</code> para servir la app.</h2>');
  });
}

// ─────────────────────────────────────────────────────────────
// 404 y Error handler global
// ─────────────────────────────────────────────────────────────
app.use((_req, _res, next) => next(new AppError('Ruta no encontrada', 404)));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const code    = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Error interno del servidor';
  if (!err.isOperational) console.error('[ERROR]', err.stack || err.message);
  res.status(code).json({ success: false, error: message });
});

// ─────────────────────────────────────────────────────────────
// INICIO — escucha en 0.0.0.0 para acceso desde la red LAN
// ─────────────────────────────────────────────────────────────
const useHttps = process.env.USE_HTTPS === 'true';
const { networkInterfaces } = require('os');

function getLanIp() {
  const nets = networkInterfaces();
  let lanIp = 'tu-ip-local';
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) { lanIp = net.address; break; }
    }
    if (lanIp !== 'tu-ip-local') break;
  }
  return lanIp;
}

const printStartMessage = (protocol) => {
  const lanIp = getLanIp();
  console.log(`\n🚀 Servidor gestion-uq iniciado (${protocol.toUpperCase()})`);
  console.log(`   Tu PC    → ${protocol}://localhost:${PORT}`);
  console.log(`   Red LAN  → ${protocol}://${lanIp}:${PORT}  ← comparte esta URL`);
  console.log(`   Estado   → ${protocol}://localhost:${PORT}/api/health\n`);
};

const startServer = async () => {
  if (useHttps) {
    const keyPath = path.join(__dirname, 'key.pem');
    const certPath = path.join(__dirname, 'cert.pem');
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.log('[SSL] Certificados no encontrados. Generando...');
      const { generateCerts } = require('./scripts/generate-certs');
      await generateCerts();
    }
    const https = require('https');
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
      printStartMessage('https');
    });
  } else {
    app.listen(PORT, '0.0.0.0', () => {
      printStartMessage('http');
    });
  }
};

if (require.main === module) {
  startServer().catch(err => {
    console.error('Error al iniciar el servidor:', err);
  });
}

module.exports = { app, startServer };
