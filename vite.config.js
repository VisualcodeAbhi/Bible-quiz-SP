import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function quizAdminApiPlugin() {
  return {
    name: 'quiz-admin-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/admin/get-quiz-data')) {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`)
            const bookFile = urlObj.searchParams.get('bookFile')
            const difficulty = (urlObj.searchParams.get('difficulty') || 'beginner').toLowerCase()

            let targetDir
            if (difficulty === 'intermediate') {
              targetDir = path.resolve(__dirname, 'src/assets/data/intermediate')
            } else if (difficulty === 'advanced') {
              targetDir = path.resolve(__dirname, 'src/assets/data/advanced')
            } else {
              targetDir = path.resolve(__dirname, 'src/assets/data')
            }

            const targetFilePath = path.join(targetDir, `${bookFile}.json`)
            if (fs.existsSync(targetFilePath)) {
              const content = fs.readFileSync(targetFilePath, 'utf8')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, exists: true, data: JSON.parse(content) }))
              return
            } else {
              // Base fallback check
              const baseFilePath = path.join(path.resolve(__dirname, 'src/assets/data'), `${bookFile}.json`)
              let baseTemplate = null
              if (fs.existsSync(baseFilePath)) {
                try {
                  const baseContent = JSON.parse(fs.readFileSync(baseFilePath, 'utf8'))
                  baseTemplate = {
                    bookName: baseContent.bookName,
                    chapters: baseContent.chapters,
                    difficulty: difficulty,
                    levels: {}
                  }
                } catch (e) {}
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, exists: false, baseTemplate }))
              return
            }
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }

        if (req.url === '/api/admin/save-quiz-data' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              const { bookFile, difficulty, data } = payload
              if (!bookFile || !data) {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: 'Missing bookFile or data' }))
                return
              }

              const normalizedDifficulty = (difficulty || 'beginner').toLowerCase()
              let targetDir
              if (normalizedDifficulty === 'intermediate') {
                targetDir = path.resolve(__dirname, 'src/assets/data/intermediate')
              } else if (normalizedDifficulty === 'advanced') {
                targetDir = path.resolve(__dirname, 'src/assets/data/advanced')
              } else {
                targetDir = path.resolve(__dirname, 'src/assets/data')
              }

              if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true })
              }

              const targetFilePath = path.join(targetDir, `${bookFile}.json`)
              fs.writeFileSync(targetFilePath, JSON.stringify(data, null, 2), 'utf8')

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ 
                success: true, 
                message: `Successfully saved to ${normalizedDifficulty === 'beginner' ? '' : normalizedDifficulty + '/'}${bookFile}.json`,
                filePath: targetFilePath
              }))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    quizAdminApiPlugin()
  ],
  server: {
    host: true
  }
})

