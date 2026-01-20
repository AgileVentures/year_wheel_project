import { Extension } from '@tiptap/core';
import { Column } from './Column';
import { ColumnBlock } from './ColumnBlock';

export const ColumnExtension = Extension.create({
  name: 'columnExtension',

  addExtensions() {
    const extensions = [];

    if (this.options.column !== false) {
      extensions.push(Column);
    }

    if (this.options.columnBlock !== false) {
      extensions.push(ColumnBlock);
    }

    return extensions;
  },
});

export { Column, ColumnBlock };
export default ColumnExtension;
