export default ({ getChunk, getNextCallsArgs, reduce }) => {
  return collect;

  async function collect(...args) {
    const chunk = await getChunk(...args);
    const nextCallsArgs = getNextCallsArgs(args, chunk);
    if (nextCallsArgs.length === 0) return chunk;
    const nextChunks = await Promise.all(
      nextCallsArgs.map(callArgs => collect(...callArgs))
    );
    return reduce([chunk, ...nextChunks]);
  }
};
