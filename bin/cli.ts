import { CLI } from '@stacksjs/clapp'
import { version } from '../package.json'

const cli = new CLI('xml')

interface CliOption {
  verbose: boolean
}

cli
  .command('start', 'Start the Reverse Proxy Server')
  .option('--from <from>', 'The URL to proxy from')
  .option('--verbose', 'Enable verbose logging')
  .example('abc start --from localhost:5173 --to my-project.localhost')
  .action(async (options?: CliOption) => {
    console.log('Options:', options)
  })

cli.command('version', 'Show the version of the CLI').action(() => {
  console.log(version)
})

cli.version(version)
cli.help()
cli.parse()
