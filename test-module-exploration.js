// Test script to explore Claude Code as a module
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, readdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('=== Exploring Claude Code Module ===\n')

// 1. Find where it's installed
const claudePath = join(
  __dirname,
  'node_modules',
  '@anthropic-ai',
  'claude-code'
)
console.log('Claude installed at:', claudePath)

// 2. Check package.json to see entry points
try {
  const pkgPath = join(claudePath, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  console.log('\nPackage info:')
  console.log('  Name:', pkg.name)
  console.log('  Version:', pkg.version)
  console.log('  Main:', pkg.main)
  console.log('  Bin:', JSON.stringify(pkg.bin, null, 2))
  console.log('  Exports:', JSON.stringify(pkg.exports, null, 2))
} catch (err) {
  console.error('Could not read package.json:', err.message)
}

// 3. List files in the module
console.log('\nTop-level files:')
try {
  const files = readdirSync(claudePath)
  files.forEach(f => console.log('  -', f))
} catch (err) {
  console.error('Could not list files:', err.message)
}

// 4. Try to import the module
console.log('\n=== Attempting to import module ===\n')
try {
  const claude = await import('@anthropic-ai/claude-code')
  console.log('✅ Successfully imported!')
  console.log('Exported keys:', Object.keys(claude))
  console.log('\nExports:')
  for (const [key, value] of Object.entries(claude)) {
    console.log(`  ${key}:`, typeof value)
  }
} catch (err) {
  console.log('❌ Cannot import as module:', err.message)
}

// 5. Check the CLI entry point
console.log('\n=== Checking CLI entry point ===\n')
try {
  const cliPath = join(claudePath, 'cli.js')
  const cliExists = readFileSync(cliPath, 'utf8').substring(0, 200)
  console.log('CLI file starts with:')
  console.log(cliExists + '...')
} catch (err) {
  console.log('No cli.js found, checking alternatives...')
  try {
    // Check for other common entry points
    const distPath = join(claudePath, 'dist')
    const distFiles = readdirSync(distPath)
    console.log('Files in dist/:', distFiles)
  } catch (err2) {
    console.log('Could not find entry point')
  }
}

// 6. Try require.resolve to find the exact path
console.log('\n=== Resolving paths ===\n')
try {
  const resolved = require.resolve('@anthropic-ai/claude-code')
  console.log('Resolved main:', resolved)
} catch (err) {
  console.log('Could not resolve:', err.message)
}
