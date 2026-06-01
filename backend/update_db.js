const { Client } = require('pg');

const client = new Client({
  host: 'localhost', database: 'gestion_uq_db', user: 'gestion_uq', password: 'gestion_uq_2026'
});

async function run() {
  await client.connect();
  
  console.log('Aplicando migraciones a la tabla usuarios...');

  try {
    await client.query("ALTER TABLE usuarios ADD COLUMN correo text");
    console.log('✅ Columna correo agregada.');
  } catch (e) {
    if (e.code === '42701') console.log('⚠️ Columna correo ya existe.');
    else throw e;
  }

  try {
    await client.query("ALTER TABLE usuarios ADD COLUMN foto_url text");
    console.log('✅ Columna foto_url agregada.');
  } catch (e) {
    if (e.code === '42701') console.log('⚠️ Columna foto_url ya existe.');
    else throw e;
  }

  try {
    await client.query("ALTER TABLE usuarios ADD COLUMN privacidad jsonb DEFAULT '{\"mostrar_correo\": true}'::jsonb");
    console.log('✅ Columna privacidad agregada.');
  } catch (e) {
    if (e.code === '42701') console.log('⚠️ Columna privacidad ya existe.');
    else throw e;
  }

  console.log('Migración completada con éxito.');
  await client.end();
}

run().catch(console.error);
