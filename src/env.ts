export let token: string;
export let fixerKey = '';

if (!process.env['TOKEN'] || typeof process.env['TOKEN'] !== 'string') {
  console.log('Missing token.');
  process.exit(1);
}
token = process.env['TOKEN'];

if (process.env['FIXER_API'] && typeof process.env['FIXER_API'] === 'string') {
  fixerKey = process.env['FIXER_API'];
}
