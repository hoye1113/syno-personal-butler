// Pure Idea drain loop: same-object work stays serialized by the caller's runner, other objects run in one batch.
export async function drainQueue({
  queued,
  run,
  consumeRequest = () => false,
  isStopping = () => false,
  onError = () => {},
}) {
  let progressed;
  let requested;
  do {
    requested = consumeRequest();
    if (isStopping()) break;
    const batch = queued();
    if (!batch.length) break;
    progressed = false;
    await Promise.all(batch.map(async (item) => {
      try {
        const result = await run(item);
        if (!result?.queued) progressed = true;
      } catch (error) {
        await onError(item, error);
      }
    }));
    // A finished item can free the next same-object event; keep draining until empty or no progress.
  } while (!isStopping() && (progressed || requested || consumeRequest()));
}
