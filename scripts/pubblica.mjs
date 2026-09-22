import { execSync } from 'child_process';

function run(cmd, desc, fatal = true) {
  console.log(`\n⏳ ${desc}...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ ${desc} completato.`);
    return true;
  } catch (error) {
    if (fatal) {
      console.error(`\n❌ Errore durante: ${desc}`);
      process.exit(1);
    } else {
      console.warn(`\n⚠️ Attenzione durante: ${desc}`);
      return false;
    }
  }
}

console.log('==================================================');
console.log('🚀 AVVIO PUBBLICAZIONE: IL COLLANTE');
console.log('==================================================');

// 1. Git add, commit e push (se ci sono modifiche)
try {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  if (status) {
    console.log('\n📝 Trovate nuove modifiche o articoli da salvare:');
    run('git add .', 'Aggiunta file modificati a Git');
    const timestamp = new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date());
    const customMsg = process.argv.slice(2).join(' ').trim();
    const commitMsg = customMsg || `Aggiornamento contenuti (${timestamp})`;
    run(`git commit -m "${commitMsg}"`, `Creazione commit: "${commitMsg}"`);
    run('git push origin main', 'Invio modifiche a GitHub');
  } else {
    console.log('\nℹ️ Nessun nuovo file da salvare in Git (già sincronizzato).');
  }
} catch (e) {
  console.warn('Avviso: sincronizzazione Git parziale, proseguo con la compilazione.');
}

// 2. Compilazione del sito Astro
run('npm run build', 'Compilazione del sito (Astro build)');

// 3. Deploy su Cloudflare con Wrangler
const deployed = run('npx wrangler deploy', 'Deploy su Cloudflare', false);

console.log('\n==================================================');
if (deployed) {
  console.log('🎉 SITO PUBBLICATO CON SUCCESSO!');
  console.log('👉 https://www.ilcollante.it');
  console.log('👉 https://il-collante.alessandro-caliciotti.workers.dev');
} else {
  console.log('✅ Aggiornamenti salvati e inviati a GitHub con successo!');
  console.log('👉 Se il sito è collegato tramite Cloudflare Pages, il deploy è partito automaticamente dal push.');
  console.log('👉 Per abilitare il deploy manuale via Wrangler da terminale: esegui `npx wrangler login` una sola volta.');
}
console.log('==================================================\n');
