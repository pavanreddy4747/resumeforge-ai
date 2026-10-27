const test = require("node:test");
const assert = require("node:assert/strict");
const { planDelete } = require("../utils/lineage");

const chain = [
  { _id: "A", lineageId: null, previousAnalysis: null, versionNumber: 1 },
  { _id: "B", lineageId: "A", previousAnalysis: "A", versionNumber: 2 },
  { _id: "C", lineageId: "A", previousAnalysis: "B", versionNumber: 3 },
  { _id: "D", lineageId: "A", previousAnalysis: "C", versionNumber: 4 },
];
const byId = (updates) => Object.fromEntries(updates.map((u) => [u._id, u.set]));

test("deleting a middle version re-points the next one at its parent", () => {
  assert.deepEqual(byId(planDelete(chain, "C").updates), { D: { previousAnalysis: "B" } });
});
test("deleting the first version promotes the next one to be the new root", () => {
  const u = byId(planDelete(chain, "A").updates);
  assert.deepEqual(u.B, { previousAnalysis: null, lineageId: null });
  assert.equal(u.C.lineageId, "B");
  assert.equal(u.D.lineageId, "B");
});
test("deleting the last version needs no repair", () => {
  assert.deepEqual(planDelete(chain, "D").updates, []);
});
test("an unknown id changes nothing", () => {
  assert.deepEqual(planDelete(chain, "Z").updates, []);
});
test("a single standalone analysis can be deleted with no repair", () => {
  assert.deepEqual(planDelete([{ _id: "X", lineageId: null, previousAnalysis: null, versionNumber: 1 }], "X").updates, []);
});
