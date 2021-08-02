export let token: string;
export let syreneToken: string | undefined;
export let fixerKey = '';
export let awsAccessKey = '';
export let awsSecretKey = '';

if (!process.env['TOKEN'] || typeof process.env['TOKEN'] !== 'string') {
  console.log('Missing token.');
  process.exit(1);
}
token = process.env['TOKEN'];

if (process.env['SYRENE_TOKEN'] && typeof process.env['SYRENE_TOKEN'] === 'string') {
  syreneToken = process.env['SYRENE_TOKEN'];
}

if (process.env['FIXER_API'] && typeof process.env['FIXER_API'] === 'string') {
  fixerKey = process.env['FIXER_API'];
}

if (process.env['AWS_ACCESS_KEY'] && typeof process.env['AWS_ACCESS_KEY'] === 'string') {
  awsAccessKey = process.env['AWS_ACCESS_KEY'];
}

if (process.env['AWS_SECRET_KEY'] && typeof process.env['AWS_SECRET_KEY'] === 'string') {
  awsSecretKey = process.env['AWS_SECRET_KEY'];
}