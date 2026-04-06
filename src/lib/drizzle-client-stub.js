// Client-side stub for drizzle-orm.
// drizzle-orm's ESM star-exports have circular dependencies that cause
// "Cannot access 'eq' before initialization" TDZ errors when Webpack
// bundles them into client chunks (even through "use server" boundaries).
// This stub provides no-op exports so client bundles don't crash.
// All actual drizzle usage runs server-side only.

const noop = () => { throw new Error('drizzle-orm is server-only'); };
const noopOperator = () => ({ toSQL: noop });

module.exports = {
  eq: noopOperator,
  ne: noopOperator,
  gt: noopOperator,
  gte: noopOperator,
  lt: noopOperator,
  lte: noopOperator,
  and: noopOperator,
  or: noopOperator,
  not: noopOperator,
  desc: noopOperator,
  asc: noopOperator,
  inArray: noopOperator,
  isNull: noopOperator,
  isNotNull: noopOperator,
  sql: noopOperator,
};
