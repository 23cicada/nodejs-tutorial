// https://www.typescriptlang.org/docs/handbook/modules/reference.html#export--and-import--require
import http = require("node:http")
import fs = require("node:fs/promises")
import path = require("node:path")
import formidable from 'formidable'
const { firstValues } = require("formidable/src/helpers/firstValues.js")

const routes: Record<string, http.RequestListener> = {
  'GET /hello-world': (request: http.IncomingMessage, response: http.ServerResponse) => {
    const { headers, method, url } = request
    const responseBody = { headers, method, url }

    response.writeHead(200, {
      "Content-Type": "text/html",
    })

    response.end(`
      <html lang>
        <body>
          <h1>Hello World</h1>
          <p>${JSON.stringify(responseBody)}</p>
        </body>
      </html>
    `)
  },
  'POST /echo': (request: http.IncomingMessage, response: http.ServerResponse) => {
    request.pipe(response)
  },
  'GET /read-file': async (request: http.IncomingMessage, response: http.ServerResponse) => {
    const content = await fs.readFile(path.resolve(__dirname, './test.json'))
    response.setHeader('Content-type', 'application/json')
    response.end(content)
  },
  'POST /write-file': async (request: http.IncomingMessage, response: http.ServerResponse) => {
    try {
      const pathname = path.resolve(__dirname, './test.json')
      const body = await getRequestBody(request)
      const existing = await fs.readFile(pathname, 'utf-8')
      const content = {
        ...JSON.parse(existing),
        ...JSON.parse(body.toString())
      }
      await fs.writeFile(pathname, JSON.stringify(content))
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ success: true }))
    } catch (err) {
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ success: false, err }))
    }
  },
  'GET /upload': async (request: http.IncomingMessage, response: http.ServerResponse) => {
    const pathname = path.resolve(__dirname, './upload.html')
    const data = await fs.readFile(pathname)
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(data)
  },
  'POST /upload': async (request, response: http.ServerResponse) => {
    const form = formidable({})
    try {
      const [fields, files] = await form.parse(request)
      const { avatar } = firstValues(form, files)
      const { fname, lname } = firstValues(form, fields)
      const oldPath = avatar.filepath
      const newPath = path.resolve(__dirname, 'images', `${fname}-${lname}-${avatar.originalFilename}`)
      await fs.rename(oldPath, newPath)
      response.end(JSON.stringify({ success: true }))
    } catch (err) {
      response.statusCode = 500
      response.end(JSON.stringify({ success: false, err }))
    }
  }
}

const getRequestBody: (request: http.IncomingMessage) => Promise<Buffer> = (request) => {
  return new Promise((resolve, reject) => {
    const body: any[] = []
    request.on('data', chunk => {
      body.push(chunk)
    }).on('end', () => {
      resolve(Buffer.concat(body))
    }).on('error', err => {
      reject(err)
    })
  })
}

http
  .createServer((request, response: http.ServerResponse) => {
    const { headers, method, url } = request
    const { pathname } = new URL(url!, `http://${headers.host}`)
    const routeKey = `${method} ${pathname}`
    const routeHandler = routes[routeKey]

    if (routeHandler) {
      routeHandler(request, response);
    } else {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('Not Found');
    }

    response.on("error", (err) => {
      console.error(err)
    })

    request.on("error", (err) => {
      console.error(err)
      response.statusCode = 400
      response.end()
    })
  })
  .listen(3000)
