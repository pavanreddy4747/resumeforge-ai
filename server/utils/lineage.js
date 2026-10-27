// Version chains ("lineages"): v1 -> v2 -> v3. When a version is deleted the chain must be repaired,
// otherwise the next version points at something that no longer exists and its diff silently breaks.
// This is a pure function (plain objects in, list of updates out) so every case can be unit tested.

const same = (a, b) => String(a) === String(b);

// `all` = every analysis in the chain: [{ _id, lineageId, previousAnalysis, versionNumber }]
function planDelete(all, deletedId) {
  const doc = all.find((d) => same(d._id, deletedId));
  if (!doc) return { updates: [] };

  const updates = new Map();
  const set = (d, fields) => updates.set(String(d._id), { ...(updates.get(String(d._id)) || {}), ...fields });

  // 1. Anything that pointed at the deleted version now points at ITS parent.
  all.filter((d) => d.previousAnalysis && same(d.previousAnalysis, deletedId))
    .forEach((child) => set(child, { previousAnalysis: doc.previousAnalysis || null }));

  // 2. If the deleted version was the root of the chain, the oldest remaining version becomes the new root.
  if (!doc.lineageId) {
    const members = all
      .filter((d) => d.lineageId && same(d.lineageId, deletedId))
      .sort((a, b) => (a.versionNumber || 1) - (b.versionNumber || 1));
    if (members.length) {
      const newRoot = members[0];
      set(newRoot, { lineageId: null, previousAnalysis: null });
      members.slice(1).forEach((m) => set(m, { lineageId: newRoot._id }));
    }
  }
  return { updates: [...updates].map(([_id, fields]) => ({ _id, set: fields })) };
}

module.exports = { planDelete };
