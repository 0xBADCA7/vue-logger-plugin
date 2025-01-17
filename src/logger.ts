import { App, inject } from 'vue'
import { LoggerOptions, LoggerHook, LogEvent } from './types'

const LoggerSymbol = Symbol('vue-logger-plugin')

const levels: string[] = ['debug', 'info', 'warn', 'error', 'log']

const defaultOptions: LoggerOptions = {
  enabled: true,
  level: 'debug'
}

export class VueLogger {

  private _options: LoggerOptions
  private _consoleFunctions: string[]

  constructor (options: LoggerOptions) {
    this.apply(options)
    this._consoleFunctions = levels.filter(lvl => typeof console[lvl] === 'function')
  }

  apply (options: LoggerOptions) {
    const fallback = this._options || defaultOptions
    this._options = { ...fallback, ...options }
    this.installHooks(this._options.beforeHooks)
    this.installHooks(this._options.afterHooks)
  }

  debug (...args: any): void {
    this._invoke('debug', ...args)
  }

  info (...args: any): void {
    this._invoke('info', ...args)
  }

  warn (...args: any): void {
    this._invoke('warn', ...args)
  }

  error (...args: any): void {
    this._invoke('error', ...args)
  }

  log (...args: any): void {
    this._invoke('log', ...args)
  }

  private _invoke (level: string, ...args: any) {
    if (this._options.enabled && levels.indexOf(level) >= levels.indexOf(this._options.level)) {
      this.invokeHooks(this._options.beforeHooks, level, args)
      const msgPrefix = `${level} | `
      if (this._consoleFunctions.includes(level)) {
        console[level](msgPrefix, ...args)
      } else {
        console.log(msgPrefix, ...args)
      }
      this.invokeHooks(this._options.afterHooks, level, args)
    }
  }

  private installHooks (hooks: LoggerHook[]) {
    if (hooks && hooks.length > 0) {
      hooks.forEach(hook => {
        if (hook.install) {
          try {
            hook.install(this._options)
          } catch (err) {
            console.warn('LoggerHook install failure', err)
          }
        }
      })
    }
  }

  private invokeHooks (hooks: LoggerHook[], level: string, argumentArray: any) {
    if (hooks && hooks.length > 0) {
      const event: LogEvent = { level, argumentArray }
      hooks.forEach(hook => {
        try {
          hook.run(event)
        } catch (err) {
          console.warn('LoggerHook run failure', err)
        }
      })
    }
  }

  get enabled () {
    return this._options.enabled
  }

  get level () {
    return this._options.level
  }

  install (app: App) {
    app.provide(LoggerSymbol, this)
    app.config.globalProperties.$log = this
    app.config.globalProperties.$logger = this
  }

}

export function createLogger (options: LoggerOptions = {}) {
  return new VueLogger(options)
}

export function useLogger () {
  const logger = inject(LoggerSymbol)
  if (!logger) {
    console.warn('vue-logger-plugin :: useLogger missing inject')
  }
  return logger
}