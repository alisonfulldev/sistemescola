#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carrega variáveis de ambiente
dotenv.config();

// Configurações
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_URL_BACKUP;
const BACKUP_DIR = path.join(__dirname, '../backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const filename = `backup-${timestamp}.sql`;
const filepath = path.join(BACKUP_DIR, filename);
const compressedPath = `${filepath}.gz`;

if (!DATABASE_URL) {
  console.error('❌ Erro: DATABASE_URL não configurada');
  console.error('Configure a variável de ambiente DATABASE_URL com a string de conexão do Supabase');
  process.exit(1);
}

// Cria diretório de backups se não existir
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`📁 Diretório criado: ${BACKUP_DIR}`);
}

try {
  console.log(`⏳ Iniciando backup em ${new Date().toLocaleString()}...`);
  console.log(`📦 Database: ${new URL(DATABASE_URL).hostname}`);

  // Executa pg_dump
  console.log(`💾 Executando pg_dump...`);
  execSync(`pg_dump "${DATABASE_URL}" > "${filepath}"`, {
    stdio: 'inherit',
    shell: true,
  });

  // Compacta o arquivo
  console.log(`📦 Compactando arquivo...`);
  execSync(`gzip -f "${filepath}"`, {
    shell: true,
  });

  // Obtém tamanho do arquivo
  const stats = fs.statSync(compressedPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`\n✅ Backup concluído com sucesso!`);
  console.log(`📄 Arquivo: ${compressedPath}`);
  console.log(`📊 Tamanho: ${sizeMB} MB`);
  console.log(`🕐 Data: ${new Date().toLocaleString()}`);

  // Lista últimos 5 backups
  console.log(`\n📋 Últimos backups:`);
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.gz'))
    .sort()
    .reverse()
    .slice(0, 5);

  files.forEach((f, i) => {
    const fpath = path.join(BACKUP_DIR, f);
    const fstats = fs.statSync(fpath);
    const fsize = (fstats.size / 1024 / 1024).toFixed(2);
    console.log(`  ${i + 1}. ${f} (${fsize} MB)`);
  });

  // Limpeza: mantém apenas os últimos 10 backups
  const allFiles = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.gz'))
    .sort()
    .reverse();

  if (allFiles.length > 10) {
    console.log(`\n🧹 Limpando backups antigos (mantendo 10 mais recentes)...`);
    allFiles.slice(10).forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`  Deletado: ${f}`);
    });
  }

} catch (error) {
  console.error(`\n❌ Erro ao fazer backup:`);
  console.error(error.message);
  process.exit(1);
}
