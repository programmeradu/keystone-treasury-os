## 2024-04-10 - Fast regex matching in text scanning
**Learning:** `resolveChainFromText` runs `alias.replace(...)` and `new RegExp(...)` per alias dynamically within a loop for every lookup, creating an O(N log N) sorting + regex compilation overhead on hot paths parsing sentences.
**Action:** Precompute these sorted arrays and compile the `RegExp` objects upfront during module initialization to turn the process into an O(N) check with pre-cached patterns.
