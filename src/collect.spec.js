import createCollect from './collect';

describe('createCollect', function() {
  const getChunk = () => {};
  const getNextCallsArgs = () => [];
  const reduce = () => {};
  const collect = createCollect({ getChunk, getNextCallsArgs, reduce });

  describe('returned function', function() {
    it('should return a promise', function() {
      expect(typeof collect().then).toBe('function');
    });

    it('should pass its args to getChunk', async function() {
      const argsToPass = ['some arg', 2, true, { key: 'value' }];
      const getChunk = async (...receivedArgs) => receivedArgs;
      const collect = createCollect({ getChunk, getNextCallsArgs, reduce });
      const collected = await collect(...argsToPass);
      expect(collected).toEqual(argsToPass);
    });

    it(
      'should resolve to the same thing as getChunk if getNextCallsArgs returns []',
      function() {
        const runTest = async chunk => {
          const getChunk = async () => chunk;
          const collect = createCollect({ getChunk, getNextCallsArgs, reduce });
          const collected = await collect();
          expect(collected).toBe(chunk);
        };
        return Promise.all([
          runTest('test data'),
          runTest(['data item 1', 'data item 2', 'data item 3'])
        ]);
      });

    it(
      'should pass its args and the resolved value of getChunk to getNextCallsArgs',
      async function() {
        const args = ['a', 'b', 'c'];
        const getChunk = async (...args) => args.map(arg => arg.toUpperCase());
        const getNextCallsArgs = jest.fn().mockReturnValueOnce([]);
        const collect = createCollect({ getChunk, getNextCallsArgs, reduce });
        await collect(...args);
        expect(getNextCallsArgs).toHaveBeenCalledTimes(1);
        expect(getNextCallsArgs).toHaveBeenCalledWith(args, ['A', 'B', 'C']);
      });

    describe('if getNextCallsArgs returns a non-empty array', function() {
      it(
        'should get another chunk for every item in that array and return ' +
        'combined chunks using reduce',
        function() {
          const runTest = async chunks => {
            const getChunk = jest.fn();
            chunks.forEach(chunk => getChunk.mockResolvedValueOnce(chunk));
            const getNextCallsArgs = jest
              .fn()
              .mockReturnValue([])
              .mockReturnValueOnce(Array(chunks.length - 1).fill([]));
            const reduce = items => items;
            const collect = createCollect({
              getChunk,
              getNextCallsArgs,
              reduce
            });
            const collected = await collect();
            expect(collected).toEqual(chunks);
          };
          return Promise.all([
            runTest(['first', 'second', 'third']),
            runTest([1, 2, 3, 4])
          ]);
        }
      );

      it(
        'should pass each of the items returned by getNextCallsArgs to each of ' +
        'the calls to getChunk (except the first) as spread arguments',
        async function() {
          const getChunk = async (lower, upper) => lower + upper;
          const getNextCallsArgs = jest
            .fn()
            .mockReturnValue([])
            .mockReturnValueOnce([['b', 'B'], ['c', 'C']]);
          const reduce = items => items;
          const collect = createCollect({ getChunk, getNextCallsArgs, reduce });
          const collected = await collect('a', 'A');
          expect(collected).toEqual(['aA', 'bB', 'cC']);
        }
      );

      it(
        'should recurse: always call getNextCallsArgs after getting a chunk ' +
        'and keep getting chunks as long as getNextCallsArgs returns a ' +
        'non-empty array',
        async function() {
          const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
          const maxChunkSize = 3;
          const getChunk = async ({ start, end }) => {
            const requestedChunkSize = end - start + 1;
            const acceptedChunkSize = Math.min(
              maxChunkSize,
              requestedChunkSize
            );
            return data.slice(start, start + acceptedChunkSize);
          };
          const getNextCallsArgs = ([prevArg], lastChunk) => {
            const lastItem = lastChunk[lastChunk.length - 1];
            if (lastItem < prevArg.end) {
              return [[{ ...prevArg, start: lastItem + 1 }]];
            } else {
              return [];
            }
          };
          const reduce = items => [].concat(...items);
          const collect = createCollect({ getChunk, getNextCallsArgs, reduce });
          const collected = await collect({ start: 3, end: 11 });
          expect(collected).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11]);
        }
      );
    });
  });
});
