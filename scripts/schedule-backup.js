#!/usr/bin/env node

/**
 * Script para agendar backups periódicos
 * Execute com: npm run backup:schedule
 *
 * Faz backup diariamente às 2:00 AM
 * Para cancelar, pressione Ctrl+C
 */

const cron = require('node-cron');
const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Agendador de backups iniciado');
console.log('⏰ Backup programado para: 2:00 AM diariamente');
console.log('📝 Para interromper, pressione Ctrl+C\n');

// Agenda para rodar diariamente às 2:00 AM
// Formato: minuto hora dia-do-mês mês dia-da-semana
cron.schedule('0 2 * * *', () => {
  const time = new Date().toLocaleString('pt-BR');
  console.log(`\n⏳ [${time}] Iniciando backup automático...`);

  try {
    const backupScript = path.join(__dirname, 'backup-db.js');
    execSync(`node "${backupScript}"`, { stdio: 'inherit' });
    console.log(`✅ [${new Date().toLocaleString('pt-BR')}] Backup automático concluído\n`);
  } catch (error) {
    console.error(`❌ [${new Date().toLocaleString('pt-BR')}] Erro no backup automático:`);
    console.error(error.message);
  }
});

// Mantém o processo rodando
process.on('SIGINT', () => {
  console.log('\n\n🛑 Agendador parado');
  process.exit(0);
});
