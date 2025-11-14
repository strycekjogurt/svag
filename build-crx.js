import crx3Pkg from 'crx3';
const { ChromeExtension } = crx3Pkg;
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildCRX() {
  console.log('🎨 Building SVAG Chrome Extension CRX...\n');

  const extensionDir = __dirname;
  const outputPath = resolve(__dirname, 'svag-extension.crx');
  const pemPath = resolve(__dirname, 'svag-extension.pem');

  try {
    // Vytvořit CRX
    console.log('📦 Vytváření CRX balíčku...');
    
    const crx = new ChromeExtension({
      codebase: 'https://github.com/svag/extension',
      privateKey: existsSync(pemPath) ? readFileSync(pemPath) : undefined,
    });

    await crx.load(extensionDir);
    
    const crxBuffer = await crx.pack();
    
    // Uložit privátní klíč pro budoucí použití
    if (!existsSync(pemPath)) {
      console.log('🔑 Ukládám privátní klíč...');
      const privateKey = await crx.generatePrivateKey();
      writeFileSync(pemPath, privateKey);
    }

    // Uložit CRX soubor
    writeFileSync(outputPath, crxBuffer);
    
    const sizeKB = Math.round(crxBuffer.length / 1024);
    console.log(`\n✅ CRX balíček vytvořen: svag-extension.crx`);
    console.log(`📊 Velikost: ${sizeKB}KB\n`);
    
    console.log('✨ Hotovo!\n');
    console.log('📝 Jak nainstalovat:');
    console.log('  1. Otevři Chrome a jdi na: chrome://extensions/');
    console.log('  2. Zapni "Developer mode" (vpravo nahoře)');
    console.log('  3. Přetáhni soubor svag-extension.crx do okna Chrome');
    console.log('  4. Potvrď instalaci\n');
    
  } catch (error) {
    console.error('❌ Chyba při vytváření CRX:', error.message);
    process.exit(1);
  }
}

buildCRX();

