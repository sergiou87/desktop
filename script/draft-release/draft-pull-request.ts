/// <reference path="../globals.d.ts" />

import appPackage from '../../app/package.json'
import * as HTTPS from 'https'

export function createPullRequest(
  title: string,
  body: string,
  branch: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const options: HTTPS.RequestOptions = {
      host: 'api.github.com',
      protocol: 'https:',
      path: '/repos/sergiou87/desktop/pulls',
      method: 'POST',
      headers: {
        Authorization: `bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
        'User-Agent': 'what-the-changelog',
      },
    }

    const request = HTTPS.request(options, response => {
      let received = ''
      response.on('data', chunk => {
        received += chunk
      })

      response.on('end', () => {
        try {
          resolve(received)
        } catch (e) {
          reject()
        }
      })
    })

    request.write(
      JSON.stringify({
        title,
        body,
        base: 'development',
        head: branch,
      })
    )

    request.end()
  })
}

const numberToOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function getPullRequestBody(fullVersion: string): string {
  const versionComponents = fullVersion.split('-')
  const version = versionComponents[0]

  let releaseDescription = `v${version} production release`
  if (versionComponents.length > 1) {
    const channelVersion = versionComponents[1]
    if (!channelVersion.startsWith('beta')) {
      throw new Error('We should not create release PRs for test builds')
    }

    const buildNumber = parseInt(channelVersion.substring('beta'.length))
    releaseDescription = `${numberToOrdinal(
      buildNumber
    )} beta of the v${version} series`
  }

  return `## Description
Looking for the PR for the upcoming ${releaseDescription}? Well, you've just found it, congratulations!

## Release checklist

- [ ] Check to see if there are any errors in Sentry that have only occurred since the last production release
- [ ] Verify that all feature flags are flipped appropriately
- [ ] If there are any new metrics, ensure that central and desktop.github.com have been updated
`
}

function getPullRequestTitle(fullVersion: string): string {
  return `Release ${fullVersion}`
}

process.on('unhandledRejection', error => {
  console.error(error.message)
})

async function run() {
  const title = getPullRequestTitle(appPackage.version)
  const body = getPullRequestBody(appPackage.version)
  const response = await createPullRequest(
    title,
    body,
    `releases/${appPackage.version}`
  )
  console.log(response)
}

run()
