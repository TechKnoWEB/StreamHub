import assert from "node:assert/strict"
import test from "node:test"
import { loadSource, emptyListingMessage } from "../src/lib/source-status.ts"

test("both failed sources are distinguished from empty listings", async () => {
  const results = await Promise.all([
    loadSource("StreamFree", async () => { throw new DOMException("expired", "TimeoutError") }),
    loadSource("ESportex", async () => { throw new TypeError("Failed to fetch") }),
  ])
  assert.equal(results[0].status.error, "Request timed out")
  assert.equal(results[1].status.error, "Could not connect to this source")
  assert.equal(emptyListingMessage(results.map((r) => r.status)), "Unable to load matches")
})

test("a timeout plus a healthy empty source reports partial availability", async () => {
  const failed = await loadSource("StreamFree", async () => { throw new DOMException("expired", "TimeoutError") })
  const empty = await loadSource("ESportex", async () => [])
  assert.equal(empty.status.error, null)
  assert.equal(empty.status.count, 0)
  assert.equal(emptyListingMessage([failed.status, empty.status]), "No listings from available sources")
})

test("available matches survive a failure of the other source", async () => {
  const failed = await loadSource("StreamFree", async () => { throw new Error("HTTP 503") })
  const available = await loadSource("ESportex", async () => [{ id: "match-1" }])
  assert.deepEqual(available.items, [{ id: "match-1" }])
  assert.equal(available.status.count, 1)
  assert.equal(failed.status.error, "HTTP 503")
})

test("two successful empty sources are not reported as failures", async () => {
  const results = await Promise.all([loadSource("A", async () => []), loadSource("B", async () => [])])
  assert.equal(emptyListingMessage(results.map((r) => r.status)), "No matches listed by the sources")
  assert.ok(results.every((r) => r.status.error === null))
})

test("a new attempt can recover after failure", async () => {
  let attempts = 0
  const load = async () => {
    if (++attempts === 1) throw new Error("HTTP 503")
    return [{ id: "recovered" }]
  }
  assert.equal((await loadSource("A", load)).status.error, "HTTP 503")
  const recovered = await loadSource("A", load)
  assert.equal(recovered.status.error, null)
  assert.equal(recovered.status.count, 1)
})
