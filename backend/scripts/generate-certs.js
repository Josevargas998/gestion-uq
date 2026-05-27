/**
 * generate-certs.js — Generador de certificados SSL autofirmados para desarrollo local
 *
 * Utiliza el paquete 'selfsigned' para generar key.pem y cert.pem.
 * Se guardan en la carpeta root de backend/ para habilitar HTTPS en la LAN.
 */
const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

async function generateCerts() {
  const keyPath = path.join(__dirname, '..', 'key.pem');
  const certPath = path.join(__dirname, '..', 'cert.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('[SSL] Certificados existentes encontrados. No es necesario regenerar.');
    return;
  }

  console.log('[SSL] Generando certificado SSL autofirmado para desarrollo...');

  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'CO' },
    { name: 'localityName', value: 'Armenia' },
    { name: 'ST', value: 'Quindio' },
    { name: 'organizationName', value: 'Universidad del Quindio' },
    { name: 'OU', value: 'Asuntos Profesorales' }
  ];

  try {
    // Genera un certificado autofirmado válido por 365 días
    const pems = await selfsigned.generate(attrs, {
      keySize: 2048,
      days: 365,
      algorithm: 'sha256',
      extensions: [
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            { type: 7, value: '127.0.0.1' }
          ]
        }
      ]
    });

    fs.writeFileSync(keyPath, pems.private, 'utf8');
    fs.writeFileSync(certPath, pems.cert, 'utf8');

    console.log(`[SSL] ✅ Certificados generados exitosamente:
    - Private Key: ${keyPath}
    - Certificate: ${certPath}`);
  } catch (err) {
    console.error('[SSL] Error al generar los certificados:', err.message);
    throw err;
  }
}

if (require.main === module) {
  generateCerts().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { generateCerts };
