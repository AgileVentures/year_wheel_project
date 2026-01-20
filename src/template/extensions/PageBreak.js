import { Node, mergeAttributes } from '@tiptap/core';

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [
      {
        tag: 'div.page-break',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'page-break',
        style: 'page-break-after: always; break-after: page; height: 1px; border-top: 2px dashed #cbd5e1; margin: 1rem 0; position: relative;',
        'data-page-break': 'true',
      }),
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name });
        },
    };
  },
});
