import * as HTTPS from 'https'

export interface IAPIPR {
  readonly title: string
  readonly body: string
  readonly headRefName: string
  readonly permalink: string
}

type GraphQLResponse = {
  readonly data: {
    readonly repository: {
      readonly pullRequest: IAPIPR
    }
  }
}

function gitHubRequest(
  options: HTTPS.RequestOptions,
  body: Record<string, any>
): Promise<Record<string, any> | null> {
  return new Promise((resolve, reject) => {
    const request = HTTPS.request(options, response => {
      let received = ''
      response.on('data', chunk => {
        received += chunk
      })

      response.on('end', () => {
        try {
          resolve(JSON.parse(received))
        } catch (e) {
          resolve(null)
        }
      })
    })

    request.write(JSON.stringify(body))

    request.end()
  })
}

export async function fetchPR(id: number): Promise<IAPIPR | null> {
  const options: HTTPS.RequestOptions = {
    host: 'api.github.com',
    protocol: 'https:',
    path: '/graphql',
    method: 'POST',
    headers: {
      Authorization: `bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
      'User-Agent': 'what-the-changelog',
    },
  }

  const graphql = `
    {
      repository(owner: "desktop", name: "desktop") {
        pullRequest(number: ${id}) {
          title
          body
          headRefName
          permalink
        }
      }
    }
    `
  const body = { query: graphql }

  const response = await gitHubRequest(options, body)
  if (response === null) {
    return null
  }

  try {
    const json: GraphQLResponse = response as GraphQLResponse
    return json.data.repository.pullRequest
  } catch (e) {
    return null
  }
}

export async function createPR(
  title: string,
  body: string,
  branch: string
): Promise<IAPIPR | null> {
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

  const response = await gitHubRequest(options, {
    title,
    body,
    base: 'development',
    head: branch,
  })

  if (response === null) {
    return null
  }

  try {
    return {
      title: response.title,
      body: response.body,
      headRefName: response.head.ref,
      permalink: response.html_url,
    }
  } catch (e) {
    return null
  }
}
