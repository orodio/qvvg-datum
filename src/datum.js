import genMailbox from "@qvvg/gen-mailbox"
import genColor from "@qvvg/gen-color"

const registry = {}
const via = {}

const register = (opts = {}) => {
  const { pid, ...mailbox } = genMailbox()
  registry[pid] = {
    pid,
    mailbox,
    name: opts.name,
    label: opts.label || "*",
    color: genColor(),
    debug: opts.debug || false,
  }
  if (opts.name != null) via[opts.name] = pid
  return pid
}

const whereIs = address => {
  var pid = null
  if (via[address] != null) address = via[address]
  if (registry[address] != null) pid = address
  return pid
}

const log = {
  pid(pid) {
    const { color, name, pid, label } = registry[pid]
    const value = `%c${name || pid}<${label}>`
    const styles = [`color:${color};font-family:monospace;`]
    return [value, styles]
  },
  log(pid, ...rest) {
    pid = whereIs(pid)
    if (pid == null || !register[pid].debug) return
    const [p, ps] = log.pid(pid)
    console.log([p].join(" "), ...ps, ...rest)
  },
}

const deliver = (address, msg) => {
  const pid = whereIs(address)
  if (pid == null) return false
  registry[pid].mailbox.send(msg)
  return true
}

const receive = address => {
  const pid = whereIs(address)
  if (pid == null) Promise.reject(`No mailbox found for: ${address}`)
  return registry[pid].mailbox.receive()
}

export const kill = address => {
  const pid = whereIs(address)
  if (address !== pid) delete via[address]
  delete registry[pid]
  return pid
}

function Message(opts = {}) {
  if (!(this instanceof Message)) return new Message(...arguments)
  this.to = opts.to
  this.from = opts.from
  this.meta = opts.meta || {}
  this.value = opts.value
}

export const send = (opts, value) =>
  new Promise(resolve => {
    setTimeout(() => {
      if (typeof opts === "number" || typeof opts === "string") opts = { to: opts }
      opts.value = opts.value || value
      const message = Message(opts)
      return resolve(deliver(message.to, message))
    }, 0)
  })

function Context(pid, extra = {}) {
  if (!(this instanceof Context)) return new Context(...arguments)
  this.self = () => registry[pid].name || pid
  this.label = () => registry[pid].label
  this.extra = extra
  this.receive = () => receive(pid)
}

const noop = _ => null

export const spawn = (callback = noop, initState = null, opts = {}) => {
  if (whereIs(opts.name)) return opts.name
  var pid = register(opts)

  setTimeout(async () => {
    const reason = await callback(Context(pid, opts.inject || {}), initState)
    kill(pid)
  }, 0)

  return opts.name || pid
}

export const exposeRegistry = () => registry
