import ts from 'typescript'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL))
    const candidatePath = path.resolve(parentDir, specifier)

    for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
      if (fs.existsSync(candidatePath + ext)) {
        return {
          url: pathToFileURL(candidatePath + ext).href,
          shortCircuit: true,
        }
      }
      if (fs.existsSync(path.join(candidatePath, 'index' + ext))) {
        return {
          url: pathToFileURL(path.join(candidatePath, 'index' + ext)).href,
          shortCircuit: true,
        }
      }
    }
  }
  return nextResolve(specifier, context)
}

export function load(url, context, nextLoad) {
  if (url.endsWith('.tsx') || url.endsWith('.ts')) {
    const filePath = fileURLToPath(url)
    const source = fs.readFileSync(filePath, 'utf8')
    const transformed = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: filePath,
    })
    return {
      format: 'module',
      source: transformed.outputText,
      shortCircuit: true,
    }
  }
  return nextLoad(url, context)
}

