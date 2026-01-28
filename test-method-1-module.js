// Test 1: Try to import Claude Code as a module
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('=== Test 1: Module Import ===\n')

async function testModuleImport () {
  try {
    console.log('Attempting to resolve @anthropic-ai/claude-code...')
    const claudePath = require.resolve('@anthropic-ai/claude-code')
    console.log('✅ Found at:', claudePath)

    console.log('\nAttempting to import as ES module...')
    try {
      const claude = await import('@anthropic-ai/claude-code')
      console.log('✅ ES Module loaded')
      console.log('Exports:', Object.keys(claude))
      return {
        success: true,
        type: 'esm',
        path: claudePath,
        exports: Object.keys(claude)
      }
    } catch (esmErr) {
      console.log('❌ ES import failed:', esmErr.message)

      console.log('\nAttempting to require as CommonJS...')
      const claude = require('@anthropic-ai/claude-code')
      console.log('✅ CommonJS Module loaded')
      console.log('Exports:', Object.keys(claude))
      return {
        success: true,
        type: 'cjs',
        path: claudePath,
        exports: Object.keys(claude)
      }
    }
  } catch (err) {
    console.log('❌ Module import failed:', err.message)
    return { success: false, error: err.message }
  }
}

async function testRequireCache () {
  console.log('\n=== Checking require.cache for Claude modules ===\n')

  const claudeModules = Object.keys(require.cache).filter(
    key => key.includes('claude') || key.includes('anthropic')
  )

  if (claudeModules.length > 0) {
    console.log('Found Claude-related modules in cache:')
    claudeModules.slice(0, 10).forEach(mod => console.log(' -', mod))
    if (claudeModules.length > 10) {
      console.log(` ... and ${claudeModules.length - 10} more`)
    }
  } else {
    console.log('No Claude modules in cache yet')
  }
}

async function run () {
  const result = await testModuleImport()
  await testRequireCache()

  console.log('\n=== Result ===')
  console.log(JSON.stringify(result, null, 2))
}

run().catch(console.error)
