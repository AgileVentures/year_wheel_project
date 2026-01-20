const times = (n, fn) =>
  Array.from({ length: n }, (_, i) => fn(i));

export const buildNode = ({ type, content }) =>
  content ? { type, content } : { type };

export const buildParagraph = ({ content }) =>
  buildNode({ type: 'paragraph', content });

export const buildColumn = ({ content }) =>
  buildNode({ type: 'column', content });

export const buildColumnBlock = ({ content }) =>
  buildNode({ type: 'columnBlock', content });

export const buildNColumns = (n) => {
  const content = [buildParagraph({})];
  const fn = () => buildColumn({ content });
  return times(n, fn);
};

export const findParentNodeClosestToPos = ($pos, predicate) => {
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i);
    const pos = i > 0 ? $pos.before(i) : 0;
    const start = $pos.start(i);
    if (predicate({ node, pos, start })) {
      return {
        start,
        depth: i,
        node,
        pos,
      };
    }
  }
  throw Error('no ancestor found');
};
